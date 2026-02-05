<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AffiliateCoupon extends Model
{
    use HasFactory;

    protected $fillable = [
        'affiliate_id',
        'wc_coupon_id',
        'code',
        'discount_type',
        'amount',
        'minimum_amount',
        'maximum_amount',
        'usage_limit',
        'usage_limit_per_user',
        'usage_count',
        'individual_use',
        'exclude_sale_items',
        'product_ids',
        'excluded_product_ids',
        'category_ids',
        'date_expires',
        'status',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'minimum_amount' => 'decimal:2',
        'maximum_amount' => 'decimal:2',
        'individual_use' => 'boolean',
        'exclude_sale_items' => 'boolean',
        'product_ids' => 'array',
        'excluded_product_ids' => 'array',
        'category_ids' => 'array',
        'date_expires' => 'datetime',
    ];

    /**
     * Affiliate relationship
     */
    public function affiliate(): BelongsTo
    {
        return $this->belongsTo(Affiliate::class);
    }

    /**
     * Referrals using this coupon
     */
    public function referrals(): HasMany
    {
        return $this->hasMany(AffiliateReferral::class, 'coupon_id');
    }

    /**
     * Check if coupon is active
     */
    public function isActive(): bool
    {
        if ($this->status !== 'active') {
            return false;
        }

        if ($this->date_expires && $this->date_expires->isPast()) {
            return false;
        }

        if ($this->usage_limit && $this->usage_count >= $this->usage_limit) {
            return false;
        }

        return true;
    }

    /**
     * Check if coupon is expired
     */
    public function isExpired(): bool
    {
        return $this->date_expires && $this->date_expires->isPast();
    }

    /**
     * Increment usage count
     */
    public function incrementUsage(): void
    {
        $this->increment('usage_count');
    }

    /**
     * Get discount type label
     */
    public function getDiscountTypeLabelAttribute(): string
    {
        return match ($this->discount_type) {
            'percent' => 'Yüzde',
            'fixed_cart' => 'Sabit (Sepet)',
            'fixed_product' => 'Sabit (Ürün)',
            default => $this->discount_type,
        };
    }

    /**
     * Get status label
     */
    public function getStatusLabelAttribute(): string
    {
        if ($this->isExpired()) {
            return 'Süresi Doldu';
        }

        return match ($this->status) {
            'active' => 'Aktif',
            'inactive' => 'Pasif',
            'expired' => 'Süresi Doldu',
            default => $this->status,
        };
    }

    /**
     * Get formatted discount
     */
    public function getFormattedDiscountAttribute(): string
    {
        if ($this->discount_type === 'percent') {
            return '%' . number_format($this->amount, 0);
        }

        return number_format($this->amount, 2) . ' TL';
    }

    /**
     * Build WooCommerce coupon data
     */
    public function toWooCommerceData(): array
    {
        return [
            'code' => $this->code,
            'discount_type' => $this->discount_type,
            'amount' => (string) $this->amount,
            'individual_use' => $this->individual_use,
            'exclude_sale_items' => $this->exclude_sale_items,
            'minimum_amount' => $this->minimum_amount ? (string) $this->minimum_amount : '',
            'maximum_amount' => $this->maximum_amount ? (string) $this->maximum_amount : '',
            'usage_limit' => $this->usage_limit,
            'usage_limit_per_user' => $this->usage_limit_per_user,
            'date_expires' => $this->date_expires?->toIso8601String(),
            'product_ids' => $this->product_ids ?? [],
            'excluded_product_ids' => $this->excluded_product_ids ?? [],
            'product_categories' => $this->category_ids ?? [],
        ];
    }
}
