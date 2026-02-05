<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AffiliateReferral extends Model
{
    use HasFactory;

    protected $fillable = [
        'affiliate_id',
        'order_id',
        'coupon_code',
        'coupon_id',
        'order_total',
        'commission_rate',
        'commission_amount',
        'currency',
        'status',
        'paid_at',
        'notes',
    ];

    protected $casts = [
        'order_total' => 'decimal:2',
        'commission_rate' => 'decimal:2',
        'commission_amount' => 'decimal:2',
        'paid_at' => 'datetime',
    ];

    /**
     * Affiliate relationship
     */
    public function affiliate(): BelongsTo
    {
        return $this->belongsTo(Affiliate::class);
    }

    /**
     * Coupon relationship
     */
    public function coupon(): BelongsTo
    {
        return $this->belongsTo(AffiliateCoupon::class, 'coupon_id');
    }

    /**
     * Order relationship
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class, 'order_id', 'wc_id');
    }

    /**
     * Mark as confirmed
     */
    public function confirm(): void
    {
        $this->update(['status' => 'confirmed']);
        $this->affiliate->updateStats();
    }

    /**
     * Mark as paid
     */
    public function markAsPaid(): void
    {
        $this->update([
            'status' => 'paid',
            'paid_at' => now(),
        ]);
        $this->affiliate->updateStats();
    }

    /**
     * Mark as cancelled
     */
    public function cancel(): void
    {
        $this->update(['status' => 'cancelled']);
        $this->affiliate->updateStats();
    }

    /**
     * Get status label
     */
    public function getStatusLabelAttribute(): string
    {
        return match ($this->status) {
            'pending' => 'Beklemede',
            'confirmed' => 'Onaylandı',
            'paid' => 'Ödendi',
            'cancelled' => 'İptal',
            default => $this->status,
        };
    }

    /**
     * Get status color
     */
    public function getStatusColorAttribute(): string
    {
        return match ($this->status) {
            'pending' => 'yellow',
            'confirmed' => 'blue',
            'paid' => 'green',
            'cancelled' => 'red',
            default => 'gray',
        };
    }
}
