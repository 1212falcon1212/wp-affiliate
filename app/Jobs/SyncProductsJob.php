<?php

namespace App\Jobs;

use App\Jobs\Concerns\WithSyncLock;
use App\Services\Sync\ProductSyncService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SyncProductsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels, WithSyncLock;

    public int $timeout = 600;
    protected ?string $lockOwner = null;

    protected function getLockKey(): string
    {
        return 'sync:woocommerce:products';
    }

    public function handle(ProductSyncService $syncService): void
    {
        $this->withLock(function () use ($syncService) {
            Log::info("Starting scheduled product sync...");
            try {
                $syncService->syncAll();
                Log::info("Scheduled product sync completed.");
            } catch (\Throwable $e) {
                Log::error("Scheduled product sync failed: " . $e->getMessage());
                throw $e;
            }
        });
    }
}
