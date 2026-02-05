<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BizimHesapProduct extends Model
{
    use HasFactory;

    protected $table = 'bizimhesap_products';

    protected $fillable = [
        'bh_id',
        'is_active',
        'code',
        'name',
        'sku',
        'barcode',
        'price',
        'buying_price',
        'variant_price',
        'currency',
        'tax',
        'cost_price',
        'stock',
        'unit',
        'category',
        'brand',
        'description',
        'photo',
        'ecommerce_description',
        'note',
        'variant_name',
        'variant',
        'is_ecommerce',
        'raw_data',
        'wc_product_id',
        'sync_status',
        'sync_error',
        'synced_at',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'buying_price' => 'decimal:2',
        'variant_price' => 'decimal:2',
        'cost_price' => 'decimal:2',
        'tax' => 'decimal:2',
        'is_active' => 'boolean',
        'is_ecommerce' => 'boolean',
        'raw_data' => 'array',
        'synced_at' => 'datetime',
    ];

    /**
     * Get WooCommerce product if synced
     */
    public function wcProduct()
    {
        return $this->belongsTo(Product::class, 'wc_product_id', 'commerce_id');
    }

    /**
     * Scope for pending sync
     */
    public function scopePending($query)
    {
        return $query->where('sync_status', 'pending');
    }

    /**
     * Scope for synced
     */
    public function scopeSynced($query)
    {
        return $query->where('sync_status', 'synced');
    }

    /**
     * Scope for failed
     */
    public function scopeFailed($query)
    {
        return $query->where('sync_status', 'failed');
    }

    /**
     * Mark as synced
     */
    public function markAsSynced(int $wcProductId): void
    {
        $this->update([
            'wc_product_id' => $wcProductId,
            'sync_status' => 'synced',
            'sync_error' => null,
            'synced_at' => now(),
        ]);
    }

    /**
     * Mark as failed
     */
    public function markAsFailed(string $error): void
    {
        $this->update([
            'sync_status' => 'failed',
            'sync_error' => $error,
        ]);
    }

    /**
     * Get status label
     */
    public function getStatusLabelAttribute(): string
    {
        return match ($this->sync_status) {
            'pending' => 'Bekliyor',
            'synced' => 'Senkronize',
            'failed' => 'Hata',
            'skipped' => 'Atlandi',
            default => $this->sync_status,
        };
    }
}
