<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\MassPrunable;

class BizimHesapSyncJob extends Model
{
    use HasFactory, MassPrunable;

    /**
     * Get the prunable model query (30 günden eski kayıtları sil)
     */
    public function prunable()
    {
        return static::where('created_at', '<=', now()->subDays(30));
    }
    protected $table = 'bizimhesap_sync_jobs';

    protected $fillable = [
        'type',
        'status',
        'total_items',
        'processed_items',
        'success_count',
        'error_count',
        'errors',
        'started_at',
        'completed_at',
    ];

    protected $casts = [
        'errors' => 'array',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    /**
     * Start job
     */
    public function start(int $totalItems = 0): void
    {
        $this->update([
            'status' => 'processing',
            'total_items' => $totalItems,
            'started_at' => now(),
        ]);
    }

    /**
     * Update progress
     */
    public function progress(int $processed, int $success, int $errors): void
    {
        $this->update([
            'processed_items' => $processed,
            'success_count' => $success,
            'error_count' => $errors,
        ]);
    }

    /**
     * Complete job
     */
    public function complete(): void
    {
        $this->update([
            'status' => 'completed',
            'completed_at' => now(),
        ]);
    }

    /**
     * Fail job
     */
    public function fail(string $error): void
    {
        $errors = $this->errors ?? [];
        $errors[] = $error;

        $this->update([
            'status' => 'failed',
            'errors' => $errors,
            'completed_at' => now(),
        ]);
    }

    /**
     * Add error
     */
    public function addError(string $error): void
    {
        $errors = $this->errors ?? [];
        $errors[] = $error;

        $this->update([
            'errors' => $errors,
            'error_count' => count($errors),
        ]);
    }

    /**
     * Get progress percentage
     */
    public function getProgressAttribute(): int
    {
        if ($this->total_items === 0) {
            return 0;
        }

        return (int) round(($this->processed_items / $this->total_items) * 100);
    }
}
