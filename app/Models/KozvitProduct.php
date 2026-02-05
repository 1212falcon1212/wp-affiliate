<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class KozvitProduct extends Model
{
    protected $fillable = [
        'barcode',
        'kozvit_sku',
        'name',
        'brand',
        'price',
        'currency',
        'main_category',
        'sub_category',
        'description',
        'image_url',
        'source_url',
        'rating',
        'review_count',
        'raw_data',
        'wc_product_id',
        'sync_status',
        'sync_error',
        'synced_at',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'rating' => 'decimal:2',
            'review_count' => 'integer',
            'raw_data' => 'array',
            'synced_at' => 'datetime',
        ];
    }

    // Sync status constants
    public const STATUS_PENDING = 'pending';

    public const STATUS_SYNCED = 'synced';

    public const STATUS_FAILED = 'failed';

    // Scopes
    public function scopePending($query)
    {
        return $query->where('sync_status', self::STATUS_PENDING);
    }

    public function scopeSynced($query)
    {
        return $query->where('sync_status', self::STATUS_SYNCED);
    }

    public function scopeFailed($query)
    {
        return $query->where('sync_status', self::STATUS_FAILED);
    }

    public function scopeNotSynced($query)
    {
        return $query->whereIn('sync_status', [self::STATUS_PENDING, self::STATUS_FAILED]);
    }

    // Helpers
    public function markAsSynced(int $wcProductId): void
    {
        $this->update([
            'wc_product_id' => $wcProductId,
            'sync_status' => self::STATUS_SYNCED,
            'sync_error' => null,
            'synced_at' => now(),
        ]);
    }

    public function markAsFailed(string $error): void
    {
        $this->update([
            'sync_status' => self::STATUS_FAILED,
            'sync_error' => $error,
        ]);
    }

    public function resetSyncStatus(): void
    {
        $this->update([
            'sync_status' => self::STATUS_PENDING,
            'sync_error' => null,
        ]);
    }

    public function isSynced(): bool
    {
        return $this->sync_status === self::STATUS_SYNCED && $this->wc_product_id !== null;
    }
}
