<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Affiliate;
use App\Models\AffiliateInvoice;
use App\Models\AffiliateReferral;
use App\Services\ERP\BizimHesapService;
use App\DataTransferObjects\OrderDTO;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AffiliateInvoiceController extends Controller
{
    public function __construct(
        protected BizimHesapService $bizimHesap
    ) {}

    /**
     * List all invoices
     */
    public function index(Request $request): JsonResponse
    {
        $query = AffiliateInvoice::with('affiliate');

        if ($status = $request->get('status')) {
            $query->where('status', $status);
        }

        if ($affiliateId = $request->get('affiliate_id')) {
            $query->where('affiliate_id', $affiliateId);
        }

        $invoices = $query->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 20));

        return response()->json([
            'data' => $invoices->items(),
            'meta' => [
                'current_page' => $invoices->currentPage(),
                'last_page' => $invoices->lastPage(),
                'per_page' => $invoices->perPage(),
                'total' => $invoices->total(),
            ],
        ]);
    }

    /**
     * Get invoice stats
     */
    public function stats(): JsonResponse
    {
        // Kesilmesi gereken fatura toplamı (onaylanmış ama faturası kesilmemiş referraller)
        $pendingInvoiceAmount = AffiliateReferral::where('status', 'confirmed')
            ->whereNull('invoice_id')
            ->sum('commission_amount');

        // Affiliate bazında kesilmesi gereken faturalar
        $pendingByAffiliate = AffiliateReferral::where('status', 'confirmed')
            ->whereNull('invoice_id')
            ->selectRaw('affiliate_id, COUNT(*) as referral_count, SUM(commission_amount) as total_amount')
            ->groupBy('affiliate_id')
            ->with('affiliate:id,name,email')
            ->get();

        return response()->json([
            'data' => [
                'pending_invoice_amount' => (float) $pendingInvoiceAmount,
                'pending_invoice_count' => AffiliateReferral::where('status', 'confirmed')
                    ->whereNull('invoice_id')
                    ->count(),
                'total_invoices' => AffiliateInvoice::count(),
                'draft_invoices' => AffiliateInvoice::where('status', 'draft')->count(),
                'sent_invoices' => AffiliateInvoice::where('status', 'sent')->count(),
                'paid_invoices' => AffiliateInvoice::where('status', 'paid')->count(),
                'total_invoiced_amount' => (float) AffiliateInvoice::whereIn('status', ['sent', 'paid'])
                    ->sum('total_amount'),
                'pending_by_affiliate' => $pendingByAffiliate,
            ],
        ]);
    }

    /**
     * Show invoice details
     */
    public function show(int $id): JsonResponse
    {
        $invoice = AffiliateInvoice::with(['affiliate', 'payment'])->findOrFail($id);

        // Get referrals
        $referrals = $invoice->getReferrals();

        return response()->json([
            'data' => array_merge($invoice->toArray(), [
                'referrals' => $referrals,
            ]),
        ]);
    }

    /**
     * Create invoice for affiliate
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'affiliate_id' => 'required|exists:affiliates,id',
            'referral_ids' => 'required|array|min:1',
            'referral_ids.*' => 'exists:affiliate_referrals,id',
            'notes' => 'nullable|string',
        ]);

        $affiliate = Affiliate::findOrFail($validated['affiliate_id']);

        // Verify referrals belong to this affiliate and are confirmed
        $referrals = AffiliateReferral::whereIn('id', $validated['referral_ids'])
            ->where('affiliate_id', $affiliate->id)
            ->where('status', 'confirmed')
            ->get();

        if ($referrals->count() !== count($validated['referral_ids'])) {
            return response()->json([
                'message' => 'Bazı referrallar bulunamadı veya onaylanmamış',
            ], 422);
        }

        $amount = $referrals->sum('commission_amount');
        $taxRate = config('services.bizimhesap.tax_rate', 20);
        $taxAmount = $amount * ($taxRate / 100);
        $totalAmount = $amount + $taxAmount;

        $invoice = DB::transaction(function () use ($affiliate, $referrals, $amount, $taxAmount, $totalAmount, $validated) {
            $invoice = AffiliateInvoice::create([
                'affiliate_id' => $affiliate->id,
                'invoice_number' => AffiliateInvoice::generateInvoiceNumber(),
                'amount' => $amount,
                'tax_amount' => $taxAmount,
                'total_amount' => $totalAmount,
                'currency' => 'TRY',
                'period_start' => $referrals->min('created_at')->toDateString(),
                'period_end' => $referrals->max('created_at')->toDateString(),
                'referral_ids' => $referrals->pluck('id')->toArray(),
                'status' => 'draft',
                'notes' => $validated['notes'] ?? null,
            ]);

            return $invoice;
        });

        return response()->json([
            'message' => 'Fatura taslağı oluşturuldu',
            'data' => $invoice->load('affiliate'),
        ], 201);
    }

    /**
     * Send invoice to BizimHesap
     */
    public function sendToBizimHesap(int $id): JsonResponse
    {
        $invoice = AffiliateInvoice::with('affiliate')->findOrFail($id);

        if ($invoice->isSentToBizimHesap()) {
            return response()->json([
                'message' => 'Fatura zaten BizimHesap\'a gönderilmiş',
            ], 422);
        }

        try {
            // Build invoice data for BizimHesap
            $orderDTO = $this->buildInvoiceDTO($invoice);
            $bizimHesapId = $this->bizimHesap->createInvoice($orderDTO);

            if ($bizimHesapId) {
                $invoice->update([
                    'bizimhesap_id' => $bizimHesapId,
                    'bizimhesap_url' => "https://bizimhesap.com/web/ngn/doc/ngnorder?rc=1&id={$bizimHesapId}",
                    'bizimhesap_status' => 'sent',
                    'status' => 'sent',
                    'sent_at' => now(),
                ]);

                Log::info("Affiliate invoice sent to BizimHesap", [
                    'invoice_id' => $invoice->id,
                    'bizimhesap_id' => $bizimHesapId,
                ]);

                return response()->json([
                    'message' => 'Fatura BizimHesap\'a gönderildi',
                    'data' => $invoice->fresh(),
                ]);
            }

            return response()->json([
                'message' => 'BizimHesap fatura oluşturulamadı',
            ], 500);
        } catch (\Exception $e) {
            Log::error("BizimHesap invoice error", [
                'invoice_id' => $invoice->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Fatura gönderilirken hata: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Check invoice status from BizimHesap
     */
    public function checkStatus(int $id): JsonResponse
    {
        $invoice = AffiliateInvoice::findOrFail($id);

        if (!$invoice->bizimhesap_id) {
            return response()->json([
                'message' => 'Bu fatura henüz BizimHesap\'a gönderilmemiş',
            ], 422);
        }

        // BizimHesap API'de fatura durum sorgulama endpoint'i varsa burada kullanılacak
        // Şimdilik manuel güncelleme yapılıyor

        return response()->json([
            'data' => [
                'invoice_id' => $invoice->id,
                'bizimhesap_id' => $invoice->bizimhesap_id,
                'bizimhesap_status' => $invoice->bizimhesap_status,
                'bizimhesap_url' => $invoice->bizimhesap_url,
            ],
        ]);
    }

    /**
     * Mark invoice as paid
     */
    public function markAsPaid(int $id): JsonResponse
    {
        $invoice = AffiliateInvoice::findOrFail($id);

        $invoice->update([
            'status' => 'paid',
            'paid_at' => now(),
        ]);

        return response()->json([
            'message' => 'Fatura ödendi olarak işaretlendi',
            'data' => $invoice,
        ]);
    }

    /**
     * Cancel invoice
     */
    public function cancel(int $id): JsonResponse
    {
        $invoice = AffiliateInvoice::findOrFail($id);

        if ($invoice->status === 'paid') {
            return response()->json([
                'message' => 'Ödenmiş fatura iptal edilemez',
            ], 422);
        }

        $invoice->update(['status' => 'cancelled']);

        return response()->json([
            'message' => 'Fatura iptal edildi',
        ]);
    }

    /**
     * Build OrderDTO for BizimHesap invoice
     */
    protected function buildInvoiceDTO(AffiliateInvoice $invoice): OrderDTO
    {
        $affiliate = $invoice->affiliate;

        return new OrderDTO(
            id: $invoice->invoice_number,
            orderNumber: $invoice->invoice_number,
            currency: $invoice->currency,
            total: (float) $invoice->total_amount,
            status: 'completed',
            items: [[
                'name' => "Affiliate Komisyon - {$invoice->period_start->format('d.m.Y')} - {$invoice->period_end->format('d.m.Y')}",
                'sku' => 'AFF-COMMISSION',
                'quantity' => 1,
                'price' => (float) $invoice->amount,
                'total' => (float) $invoice->amount,
            ]],
            customer: [
                'name' => $affiliate->name,
                'email' => $affiliate->email,
                'phone' => $affiliate->phone ?? '',
                'address_1' => '',
                'address_2' => '',
                'city' => '',
                'state' => '',
                'postcode' => '',
                'country' => 'TR',
            ],
            platform: 'affiliate',
            paymentMethod: 'Affiliate Komisyon',
            transactionId: $invoice->invoice_number
        );
    }
}
