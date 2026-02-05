<?php

namespace App\Services\Affiliate;

use App\Models\Affiliate;
use App\Models\AffiliateCoupon;
use App\Models\AffiliateReferral;
use App\Models\Order;
use App\Services\WooCommerce\WooCommerceService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AffiliateService
{
    public function __construct(
        protected WooCommerceService $wooCommerce
    ) {
    }

    /**
     * Create a new affiliate
     */
    public function createAffiliate(array $data): Affiliate
    {
        return DB::transaction(function () use ($data) {
            $affiliate = Affiliate::create($data);

            Log::info("Affiliate created", ['id' => $affiliate->id, 'email' => $affiliate->email]);

            return $affiliate;
        });
    }

    /**
     * Update affiliate
     */
    public function updateAffiliate(Affiliate $affiliate, array $data): Affiliate
    {
        $affiliate->update($data);

        Log::info("Affiliate updated", ['id' => $affiliate->id]);

        return $affiliate->fresh();
    }

    /**
     * Create coupon for affiliate
     */
    public function createCoupon(Affiliate $affiliate, array $data): AffiliateCoupon
    {
        return DB::transaction(function () use ($affiliate, $data) {
            // Create in WooCommerce first
            $wcCouponData = $this->buildWcCouponData($data);

            try {
                $wcCoupon = $this->wooCommerce->createCoupon($wcCouponData);
                $data['wc_coupon_id'] = $wcCoupon['id'] ?? null;
            } catch (\Exception $e) {
                Log::error("WooCommerce coupon creation failed", [
                    'error' => $e->getMessage(),
                    'data' => $wcCouponData
                ]);
                // Continue without WC coupon ID if it fails
            }

            $data['affiliate_id'] = $affiliate->id;
            $coupon = AffiliateCoupon::create($data);

            Log::info("Affiliate coupon created", [
                'affiliate_id' => $affiliate->id,
                'coupon_id' => $coupon->id,
                'code' => $coupon->code
            ]);

            return $coupon;
        });
    }

    /**
     * Update coupon
     */
    public function updateCoupon(AffiliateCoupon $coupon, array $data): AffiliateCoupon
    {
        return DB::transaction(function () use ($coupon, $data) {
            // Update in WooCommerce if we have the ID
            if ($coupon->wc_coupon_id) {
                try {
                    $wcCouponData = $this->buildWcCouponData($data);
                    $this->wooCommerce->updateCoupon($coupon->wc_coupon_id, $wcCouponData);
                } catch (\Exception $e) {
                    Log::error("WooCommerce coupon update failed", [
                        'wc_coupon_id' => $coupon->wc_coupon_id,
                        'error' => $e->getMessage()
                    ]);
                }
            }

            $coupon->update($data);

            return $coupon->fresh();
        });
    }

    /**
     * Delete coupon
     */
    public function deleteCoupon(AffiliateCoupon $coupon): bool
    {
        return DB::transaction(function () use ($coupon) {
            // Delete from WooCommerce if we have the ID
            if ($coupon->wc_coupon_id) {
                try {
                    $this->wooCommerce->deleteCoupon($coupon->wc_coupon_id);
                } catch (\Exception $e) {
                    Log::error("WooCommerce coupon deletion failed", [
                        'wc_coupon_id' => $coupon->wc_coupon_id,
                        'error' => $e->getMessage()
                    ]);
                }
            }

            $coupon->delete();

            return true;
        });
    }

    /**
     * Build WooCommerce coupon data
     */
    protected function buildWcCouponData(array $data): array
    {
        return [
            'code' => $data['code'],
            'discount_type' => $data['discount_type'] ?? 'percent',
            'amount' => (string) ($data['amount'] ?? 0),
            'individual_use' => $data['individual_use'] ?? false,
            'exclude_sale_items' => $data['exclude_sale_items'] ?? false,
            'minimum_amount' => isset($data['minimum_amount']) ? (string) $data['minimum_amount'] : '',
            'maximum_amount' => isset($data['maximum_amount']) ? (string) $data['maximum_amount'] : '',
            'usage_limit' => $data['usage_limit'] ?? null,
            'usage_limit_per_user' => $data['usage_limit_per_user'] ?? null,
            'date_expires' => $data['date_expires'] ?? null,
        ];
    }

    /**
     * Process order for affiliate commission
     */
    public function processOrderForCommission(Order $order): ?AffiliateReferral
    {
        $affiliate = null;
        $couponId = null;
        $triggerCode = '';
        $coupon = null;

        // 1. Check Coupon Code
        if (!empty($order->coupon_code)) {
            $coupon = AffiliateCoupon::where('code', $order->coupon_code)
                ->where('status', 'active')
                ->first();

            if ($coupon) {
                $affiliate = $coupon->affiliate;
                $couponId = $coupon->id;
                $triggerCode = $order->coupon_code;
            }
        }

        // 2. Check Referral Code in Meta Data (if no coupon match)
        if (!$affiliate && !empty($order->meta_data)) {
            $metaData = $order->meta_data;
            // Iterate meta to find ref keys
            foreach ($metaData as $meta) {
                $key = $meta['key'] ?? '';
                $value = $meta['value'] ?? '';

                if (in_array($key, ['ref', 'referral_code', 'affiliate_code', '_affiliate_code'])) {
                    $affiliate = $this->findByReferralCode($value);
                    if ($affiliate) {
                        $triggerCode = $value;
                        break;
                    }
                }
            }
        }

        if (!$affiliate || !$affiliate->isActive()) {
            return null;
        }

        // Check if referral already exists
        $existingReferral = AffiliateReferral::where('order_id', $order->wc_id)->first();
        if ($existingReferral) {
            return $existingReferral;
        }

        // Calculate commission
        $commissionAmount = $affiliate->calculateCommission((float) $order->total);

        // Create referral
        $referral = AffiliateReferral::create([
            'affiliate_id' => $affiliate->id,
            'order_id' => (string) $order->wc_id,
            'coupon_code' => $triggerCode,
            'coupon_id' => $couponId,
            'order_total' => $order->total,
            'commission_rate' => $affiliate->commission_rate,
            'commission_amount' => $commissionAmount,
            'currency' => $order->currency,
            'status' => 'pending',
        ]);

        // Increment coupon usage
        if ($coupon) {
            $coupon->incrementUsage();
        }

        // Update affiliate stats
        $affiliate->updateStats();
        $affiliate->update(['last_activity_at' => now()]);

        Log::info("Affiliate referral created", [
            'affiliate_id' => $affiliate->id,
            'order_id' => $order->wc_id,
            'commission' => $commissionAmount
        ]);

        return $referral;
    }

    /**
     * Confirm referrals for completed orders
     */
    public function confirmReferral(AffiliateReferral $referral): void
    {
        if ($referral->status !== 'pending') {
            return;
        }

        $referral->confirm();

        Log::info("Affiliate referral confirmed", [
            'referral_id' => $referral->id,
            'affiliate_id' => $referral->affiliate_id
        ]);
    }

    /**
     * Mark referrals as paid
     */
    public function markReferralsAsPaid(Affiliate $affiliate, array $referralIds): int
    {
        $count = 0;

        foreach ($referralIds as $referralId) {
            $referral = AffiliateReferral::where('id', $referralId)
                ->where('affiliate_id', $affiliate->id)
                ->where('status', 'confirmed')
                ->first();

            if ($referral) {
                $referral->markAsPaid();
                $count++;
            }
        }

        Log::info("Affiliate referrals marked as paid", [
            'affiliate_id' => $affiliate->id,
            'count' => $count
        ]);

        return $count;
    }

    /**
     * Get affiliate statistics
     */
    public function getStats(): array
    {
        return [
            'total_affiliates' => Affiliate::count(),
            'active_affiliates' => Affiliate::where('status', 'active')->count(),
            'total_coupons' => AffiliateCoupon::count(),
            'active_coupons' => AffiliateCoupon::where('status', 'active')->count(),
            'total_referrals' => AffiliateReferral::count(),
            'pending_referrals' => AffiliateReferral::where('status', 'pending')->count(),
            'total_commissions' => AffiliateReferral::whereIn('status', ['confirmed', 'paid'])->sum('commission_amount'),
            'pending_commissions' => AffiliateReferral::where('status', 'pending')->sum('commission_amount'),
            'paid_commissions' => AffiliateReferral::where('status', 'paid')->sum('commission_amount'),
        ];
    }

    /**
     * Find affiliate by referral code
     */
    public function findByReferralCode(string $code): ?Affiliate
    {
        return Affiliate::where('referral_code', $code)
            ->where('status', 'active')
            ->first();
    }

    /**
     * Find affiliate by coupon code
     */
    public function findByCouponCode(string $code): ?Affiliate
    {
        $coupon = AffiliateCoupon::where('code', $code)->first();
        return $coupon?->affiliate;
    }
}
