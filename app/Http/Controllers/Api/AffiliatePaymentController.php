<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Affiliate;
use App\Models\AffiliateInvoice;
use App\Models\AffiliatePayment;
use App\Models\AffiliateReferral;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AffiliatePaymentController extends Controller
{
    /**
     * List all payments
     */
    public function index(Request $request): JsonResponse
    {
        $query = AffiliatePayment::with(['affiliate', 'invoice']);

        if ($status = $request->get('status')) {
            $query->where('status', $status);
        }

        if ($affiliateId = $request->get('affiliate_id')) {
            $query->where('affiliate_id', $affiliateId);
        }

        if ($method = $request->get('payment_method')) {
            $query->where('payment_method', $method);
        }

        $payments = $query->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 20));

        return response()->json([
            'data' => $payments->items(),
            'meta' => [
                'current_page' => $payments->currentPage(),
                'last_page' => $payments->lastPage(),
                'per_page' => $payments->perPage(),
                'total' => $payments->total(),
            ],
        ]);
    }

    /**
     * Get payment stats
     */
    public function stats(): JsonResponse
    {
        // Ödenmesi gereken toplam (onaylanmış referrallar)
        $pendingPaymentAmount = AffiliateReferral::where('status', 'confirmed')
            ->sum('commission_amount');

        // Affiliate bazında ödenmesi gerekenler
        $pendingByAffiliate = Affiliate::whereHas('referrals', function ($q) {
            $q->where('status', 'confirmed');
        })
            ->withSum(['referrals as pending_amount' => function ($q) {
                $q->where('status', 'confirmed');
            }], 'commission_amount')
            ->withCount(['referrals as pending_count' => function ($q) {
                $q->where('status', 'confirmed');
            }])
            ->get(['id', 'name', 'email', 'payment_method', 'payment_details']);

        return response()->json([
            'data' => [
                'pending_payment_amount' => (float) $pendingPaymentAmount,
                'pending_payment_count' => AffiliateReferral::where('status', 'confirmed')->count(),
                'total_payments' => AffiliatePayment::count(),
                'pending_payments' => AffiliatePayment::where('status', 'pending')->count(),
                'processing_payments' => AffiliatePayment::where('status', 'processing')->count(),
                'completed_payments' => AffiliatePayment::where('status', 'completed')->count(),
                'total_paid_amount' => (float) AffiliatePayment::where('status', 'completed')
                    ->sum('amount'),
                'this_month_paid' => (float) AffiliatePayment::where('status', 'completed')
                    ->whereMonth('completed_at', now()->month)
                    ->whereYear('completed_at', now()->year)
                    ->sum('amount'),
                'pending_by_affiliate' => $pendingByAffiliate,
            ],
        ]);
    }

    /**
     * Show payment details
     */
    public function show(int $id): JsonResponse
    {
        $payment = AffiliatePayment::with(['affiliate', 'invoice'])->findOrFail($id);

        // Get referrals
        $referrals = $payment->getReferrals();

        return response()->json([
            'data' => array_merge($payment->toArray(), [
                'referrals' => $referrals,
            ]),
        ]);
    }

    /**
     * Create payment for affiliate
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'affiliate_id' => 'required|exists:affiliates,id',
            'invoice_id' => 'nullable|exists:affiliate_invoices,id',
            'referral_ids' => 'required|array|min:1',
            'referral_ids.*' => 'exists:affiliate_referrals,id',
            'payment_method' => 'required|in:bank_transfer,paytr,paypal,manual',
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

        $payment = DB::transaction(function () use ($affiliate, $referrals, $amount, $validated) {
            $payment = AffiliatePayment::create([
                'affiliate_id' => $affiliate->id,
                'invoice_id' => $validated['invoice_id'] ?? null,
                'payment_number' => AffiliatePayment::generatePaymentNumber(),
                'amount' => $amount,
                'currency' => 'TRY',
                'payment_method' => $validated['payment_method'],
                'payment_details' => $affiliate->payment_details,
                'referral_ids' => $referrals->pluck('id')->toArray(),
                'status' => 'pending',
                'notes' => $validated['notes'] ?? null,
            ]);

            return $payment;
        });

        Log::info("Affiliate payment created", [
            'payment_id' => $payment->id,
            'affiliate_id' => $affiliate->id,
            'amount' => $amount,
        ]);

        return response()->json([
            'message' => 'Ödeme kaydı oluşturuldu',
            'data' => $payment->load('affiliate'),
        ], 201);
    }

    /**
     * Process payment (mark as processing)
     */
    public function process(int $id): JsonResponse
    {
        $payment = AffiliatePayment::findOrFail($id);

        if ($payment->status !== 'pending') {
            return response()->json([
                'message' => 'Sadece bekleyen ödemeler işleme alınabilir',
            ], 422);
        }

        $payment->update([
            'status' => 'processing',
            'processed_at' => now(),
        ]);

        return response()->json([
            'message' => 'Ödeme işleme alındı',
            'data' => $payment,
        ]);
    }

    /**
     * Complete payment
     */
    public function complete(Request $request, int $id): JsonResponse
    {
        $payment = AffiliatePayment::findOrFail($id);

        if (!in_array($payment->status, ['pending', 'processing'])) {
            return response()->json([
                'message' => 'Bu ödeme tamamlanamaz',
            ], 422);
        }

        $validated = $request->validate([
            'provider_transaction_id' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        DB::transaction(function () use ($payment, $validated) {
            // Update payment
            $payment->update([
                'status' => 'completed',
                'provider_transaction_id' => $validated['provider_transaction_id'] ?? null,
                'completed_at' => now(),
                'notes' => $validated['notes'] ?? $payment->notes,
            ]);

            // Mark referrals as paid
            if (!empty($payment->referral_ids)) {
                AffiliateReferral::whereIn('id', $payment->referral_ids)
                    ->update([
                        'status' => 'paid',
                        'paid_at' => now(),
                    ]);
            }

            // Update affiliate stats
            $payment->affiliate->updateStats();

            // Update invoice if linked
            if ($payment->invoice_id) {
                AffiliateInvoice::where('id', $payment->invoice_id)
                    ->update([
                        'status' => 'paid',
                        'paid_at' => now(),
                    ]);
            }
        });

        Log::info("Affiliate payment completed", [
            'payment_id' => $payment->id,
            'affiliate_id' => $payment->affiliate_id,
            'amount' => $payment->amount,
        ]);

        return response()->json([
            'message' => 'Ödeme tamamlandı',
            'data' => $payment->fresh()->load('affiliate'),
        ]);
    }

    /**
     * Cancel payment
     */
    public function cancel(int $id): JsonResponse
    {
        $payment = AffiliatePayment::findOrFail($id);

        if ($payment->status === 'completed') {
            return response()->json([
                'message' => 'Tamamlanmış ödeme iptal edilemez',
            ], 422);
        }

        $payment->update(['status' => 'cancelled']);

        return response()->json([
            'message' => 'Ödeme iptal edildi',
        ]);
    }

    /**
     * Get affiliate's payment info for quick pay
     */
    public function affiliatePaymentInfo(int $affiliateId): JsonResponse
    {
        $affiliate = Affiliate::findOrFail($affiliateId);

        $confirmedReferrals = $affiliate->referrals()
            ->where('status', 'confirmed')
            ->get();

        return response()->json([
            'data' => [
                'affiliate' => [
                    'id' => $affiliate->id,
                    'name' => $affiliate->name,
                    'email' => $affiliate->email,
                    'payment_method' => $affiliate->payment_method,
                    'payment_details' => $affiliate->payment_details,
                ],
                'pending_amount' => $confirmedReferrals->sum('commission_amount'),
                'pending_count' => $confirmedReferrals->count(),
                'referrals' => $confirmedReferrals,
            ],
        ]);
    }
}
