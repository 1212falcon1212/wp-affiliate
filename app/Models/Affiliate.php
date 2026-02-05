<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Affiliate extends Model
{
    protected $fillable = [
        'user_id',
        'name',
        'email',
        'phone',
        'company',
        'commission_rate',
        'commission_type',
        'payment_method',
        'payment_details',
        'total_earnings',
        'pending_balance',
        'paid_balance',
        'total_orders',
        'total_clicks',
        'status',
        'notes',
        'referral_code',
        'last_activity_at',
    ];

    protected $casts = [
        'payment_details' => 'array',
        'commission_rate' => 'decimal:2',
        'total_earnings' => 'decimal:2',
        'pending_balance' => 'decimal:2',
        'paid_balance' => 'decimal:2',
        'last_activity_at' => 'datetime',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($affiliate) {
            if (empty($affiliate->referral_code)) {
                $affiliate->referral_code = self::generateReferralCode();
            }
        });
    }

    /**
     * Generate unique referral code
     */
    public static function generateReferralCode(): string
    {
        do {
            $code = strtoupper(Str::random(8));
        } while (self::where('referral_code', $code)->exists());

        return $code;
    }

    /**
     * User relationship
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Coupons relationship
     */
    public function coupons(): HasMany
    {
        return $this->hasMany(AffiliateCoupon::class);
    }

    /**
     * Referrals relationship
     */
    public function referrals(): HasMany
    {
        return $this->hasMany(AffiliateReferral::class);
    }

    /**
     * Active coupons
     */
    public function activeCoupons(): HasMany
    {
        return $this->coupons()->where('status', 'active');
    }

    /**
     * Pending referrals
     */
    public function pendingReferrals(): HasMany
    {
        return $this->referrals()->where('status', 'pending');
    }

    /**
     * Confirmed referrals
     */
    public function confirmedReferrals(): HasMany
    {
        return $this->referrals()->where('status', 'confirmed');
    }

    /**
     * Calculate commission for an order
     */
    public function calculateCommission(float $orderTotal): float
    {
        if ($this->commission_type === 'fixed') {
            return $this->commission_rate;
        }

        return $orderTotal * ($this->commission_rate / 100);
    }

    /**
     * Update stats from referrals
     */
    public function updateStats(): void
    {
        $this->total_orders = $this->referrals()->count();
        $this->total_earnings = $this->referrals()
            ->whereIn('status', ['confirmed', 'paid'])
            ->sum('commission_amount');
        $this->pending_balance = $this->referrals()
            ->where('status', 'pending')
            ->sum('commission_amount');
        $this->paid_balance = $this->referrals()
            ->where('status', 'paid')
            ->sum('commission_amount');
        $this->save();
    }

    /**
     * Check if affiliate is active
     */
    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    /**
     * Get status label
     */
    public function getStatusLabelAttribute(): string
    {
        return match ($this->status) {
            'active' => 'Aktif',
            'inactive' => 'Pasif',
            'suspended' => 'Askıya Alındı',
            default => $this->status,
        };
    }

    /**
     * Get commission type label
     */
    public function getCommissionTypeLabelAttribute(): string
    {
        return match ($this->commission_type) {
            'percentage' => 'Yüzde',
            'fixed' => 'Sabit Tutar',
            default => $this->commission_type,
        };
    }

    /**
     * Get payment method label
     */
    public function getPaymentMethodLabelAttribute(): string
    {
        return match ($this->payment_method) {
            'bank_transfer' => 'Banka Transferi',
            'paypal' => 'PayPal',
            'other' => 'Diğer',
            default => $this->payment_method,
        };
    }
}
