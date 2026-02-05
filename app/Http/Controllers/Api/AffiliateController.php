<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Affiliate;
use App\Models\AffiliateCoupon;
use App\Models\AffiliateReferral;
use App\Services\Affiliate\AffiliateService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AffiliateController extends Controller
{
    public function __construct(
        protected AffiliateService $affiliateService
    ) {}

    /**
     * List affiliates
     */
    public function index(Request $request): JsonResponse
    {
        $query = Affiliate::with(['coupons', 'referrals']);

        // Search
        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('referral_code', 'like', "%{$search}%");
            });
        }

        // Status filter
        if ($status = $request->get('status')) {
            $query->where('status', $status);
        }

        // Sort
        $sortBy = $request->get('sort_by', 'created_at');
        $sortDir = $request->get('sort_dir', 'desc');
        $query->orderBy($sortBy, $sortDir);

        $affiliates = $query->paginate($request->get('per_page', 20));

        return response()->json([
            'data' => $affiliates->items(),
            'meta' => [
                'current_page' => $affiliates->currentPage(),
                'last_page' => $affiliates->lastPage(),
                'per_page' => $affiliates->perPage(),
                'total' => $affiliates->total(),
            ],
        ]);
    }

    /**
     * Get affiliate stats
     */
    public function stats(): JsonResponse
    {
        return response()->json([
            'data' => $this->affiliateService->getStats(),
        ]);
    }

    /**
     * Store new affiliate
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:affiliates,email',
            'phone' => 'nullable|string|max:20',
            'company' => 'nullable|string|max:255',
            'commission_rate' => 'required|numeric|min:0|max:100',
            'commission_type' => 'required|in:percentage,fixed',
            'payment_method' => 'required|in:bank_transfer,paypal,other',
            'payment_details' => 'nullable|array',
            'notes' => 'nullable|string',
        ]);

        $affiliate = $this->affiliateService->createAffiliate($validated);

        return response()->json([
            'message' => 'Affiliate oluşturuldu',
            'data' => $affiliate,
        ], 201);
    }

    /**
     * Show affiliate details
     */
    public function show(int $id): JsonResponse
    {
        $affiliate = Affiliate::with(['coupons', 'referrals.order'])->findOrFail($id);

        return response()->json([
            'data' => $affiliate,
        ]);
    }

    /**
     * Update affiliate
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $affiliate = Affiliate::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => ['sometimes', 'email', Rule::unique('affiliates')->ignore($affiliate->id)],
            'phone' => 'nullable|string|max:20',
            'company' => 'nullable|string|max:255',
            'commission_rate' => 'sometimes|numeric|min:0|max:100',
            'commission_type' => 'sometimes|in:percentage,fixed',
            'payment_method' => 'sometimes|in:bank_transfer,paypal,other',
            'payment_details' => 'nullable|array',
            'status' => 'sometimes|in:active,inactive,suspended',
            'notes' => 'nullable|string',
        ]);

        $affiliate = $this->affiliateService->updateAffiliate($affiliate, $validated);

        return response()->json([
            'message' => 'Affiliate güncellendi',
            'data' => $affiliate,
        ]);
    }

    /**
     * Delete affiliate
     */
    public function destroy(int $id): JsonResponse
    {
        $affiliate = Affiliate::findOrFail($id);
        $affiliate->delete();

        return response()->json([
            'message' => 'Affiliate silindi',
        ]);
    }

    /**
     * Get affiliate's coupons
     */
    public function coupons(int $id): JsonResponse
    {
        $affiliate = Affiliate::findOrFail($id);
        $coupons = $affiliate->coupons()->orderBy('created_at', 'desc')->get();

        return response()->json([
            'data' => $coupons,
        ]);
    }

    /**
     * Create coupon for affiliate
     */
    public function storeCoupon(Request $request, int $id): JsonResponse
    {
        $affiliate = Affiliate::findOrFail($id);

        $validated = $request->validate([
            'code' => 'required|string|max:50|unique:affiliate_coupons,code',
            'discount_type' => 'required|in:percent,fixed_cart,fixed_product',
            'amount' => 'required|numeric|min:0',
            'minimum_amount' => 'nullable|numeric|min:0',
            'maximum_amount' => 'nullable|numeric|min:0',
            'usage_limit' => 'nullable|integer|min:1',
            'usage_limit_per_user' => 'nullable|integer|min:1',
            'individual_use' => 'boolean',
            'exclude_sale_items' => 'boolean',
            'date_expires' => 'nullable|date',
        ]);

        $coupon = $this->affiliateService->createCoupon($affiliate, $validated);

        return response()->json([
            'message' => 'Kupon oluşturuldu',
            'data' => $coupon,
        ], 201);
    }

    /**
     * Update coupon
     */
    public function updateCoupon(Request $request, int $id, int $couponId): JsonResponse
    {
        $coupon = AffiliateCoupon::where('affiliate_id', $id)
            ->where('id', $couponId)
            ->firstOrFail();

        $validated = $request->validate([
            'discount_type' => 'sometimes|in:percent,fixed_cart,fixed_product',
            'amount' => 'sometimes|numeric|min:0',
            'minimum_amount' => 'nullable|numeric|min:0',
            'maximum_amount' => 'nullable|numeric|min:0',
            'usage_limit' => 'nullable|integer|min:1',
            'usage_limit_per_user' => 'nullable|integer|min:1',
            'individual_use' => 'boolean',
            'exclude_sale_items' => 'boolean',
            'date_expires' => 'nullable|date',
            'status' => 'sometimes|in:active,inactive',
        ]);

        $coupon = $this->affiliateService->updateCoupon($coupon, $validated);

        return response()->json([
            'message' => 'Kupon güncellendi',
            'data' => $coupon,
        ]);
    }

    /**
     * Delete coupon
     */
    public function destroyCoupon(int $id, int $couponId): JsonResponse
    {
        $coupon = AffiliateCoupon::where('affiliate_id', $id)
            ->where('id', $couponId)
            ->firstOrFail();

        $this->affiliateService->deleteCoupon($coupon);

        return response()->json([
            'message' => 'Kupon silindi',
        ]);
    }

    /**
     * Get affiliate's referrals
     */
    public function referrals(Request $request, int $id): JsonResponse
    {
        $affiliate = Affiliate::findOrFail($id);

        $query = $affiliate->referrals()->with('order');

        // Status filter
        if ($status = $request->get('status')) {
            $query->where('status', $status);
        }

        $referrals = $query->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 20));

        return response()->json([
            'data' => $referrals->items(),
            'meta' => [
                'current_page' => $referrals->currentPage(),
                'last_page' => $referrals->lastPage(),
                'per_page' => $referrals->perPage(),
                'total' => $referrals->total(),
            ],
        ]);
    }

    /**
     * Confirm referral
     */
    public function confirmReferral(int $id, int $referralId): JsonResponse
    {
        $referral = AffiliateReferral::where('affiliate_id', $id)
            ->where('id', $referralId)
            ->where('status', 'pending')
            ->firstOrFail();

        $this->affiliateService->confirmReferral($referral);

        return response()->json([
            'message' => 'Referral onaylandı',
            'data' => $referral->fresh(),
        ]);
    }

    /**
     * Mark referrals as paid
     */
    public function markAsPaid(Request $request, int $id): JsonResponse
    {
        $affiliate = Affiliate::findOrFail($id);

        $validated = $request->validate([
            'referral_ids' => 'required|array',
            'referral_ids.*' => 'integer|exists:affiliate_referrals,id',
        ]);

        $count = $this->affiliateService->markReferralsAsPaid($affiliate, $validated['referral_ids']);

        return response()->json([
            'message' => "{$count} referral ödendi olarak işaretlendi",
        ]);
    }

    /**
     * Get affiliate earnings summary
     */
    public function earnings(int $id): JsonResponse
    {
        $affiliate = Affiliate::findOrFail($id);

        $earnings = [
            'total_earnings' => $affiliate->total_earnings,
            'pending_balance' => $affiliate->pending_balance,
            'paid_balance' => $affiliate->paid_balance,
            'total_orders' => $affiliate->total_orders,
            'commission_rate' => $affiliate->commission_rate,
            'commission_type' => $affiliate->commission_type,
            'recent_referrals' => $affiliate->referrals()
                ->with('order')
                ->orderBy('created_at', 'desc')
                ->limit(10)
                ->get(),
        ];

        return response()->json([
            'data' => $earnings,
        ]);
    }
}
