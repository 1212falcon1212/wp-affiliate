<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Order extends Model
{
    protected $fillable = [
        'wc_id',
        'order_number',
        'status',
        'currency',
        'total',
        'subtotal',
        'total_tax',
        'shipping_total',
        'discount_total',
        'customer_id',
        'customer_email',
        'customer_name',
        'customer_phone',
        'billing_address',
        'shipping_address',
        'payment_method',
        'payment_method_title',
        'transaction_id',
        'date_created',
        'date_paid',
        'date_completed',
        'invoice_id',
        'invoice_url',
        'invoice_number',
        'invoice_date',
        'coupon_code',
        'affiliate_id',
        'meta_data',
        'customer_note',
        'raw_data',
    ];

    protected $casts = [
        'billing_address' => 'array',
        'shipping_address' => 'array',
        'meta_data' => 'array',
        'raw_data' => 'array',
        'date_created' => 'datetime',
        'date_paid' => 'datetime',
        'date_completed' => 'datetime',
        'invoice_date' => 'datetime',
        'total' => 'decimal:2',
        'subtotal' => 'decimal:2',
        'total_tax' => 'decimal:2',
        'shipping_total' => 'decimal:2',
        'discount_total' => 'decimal:2',
    ];

    /**
     * Order items
     */
    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    /**
     * Affiliate relationship
     */
    public function affiliate(): BelongsTo
    {
        return $this->belongsTo(Affiliate::class);
    }

    /**
     * Get status label (Turkish)
     */
    public function getStatusLabelAttribute(): string
    {
        return match ($this->status) {
            'pending' => 'Beklemede',
            'processing' => 'İşleniyor',
            'on-hold' => 'Bekletiliyor',
            'completed' => 'Tamamlandı',
            'cancelled' => 'İptal Edildi',
            'refunded' => 'İade Edildi',
            'failed' => 'Başarısız',
            default => $this->status,
        };
    }

    /**
     * Get status color for UI
     */
    public function getStatusColorAttribute(): string
    {
        return match ($this->status) {
            'pending' => 'yellow',
            'processing' => 'blue',
            'on-hold' => 'orange',
            'completed' => 'green',
            'cancelled' => 'red',
            'refunded' => 'purple',
            'failed' => 'red',
            default => 'gray',
        };
    }

    /**
     * Check if order has invoice
     */
    public function hasInvoice(): bool
    {
        return !empty($this->invoice_id);
    }

    /**
     * Get items count
     */
    public function getItemsCountAttribute(): int
    {
        return $this->items->sum('quantity');
    }
}
