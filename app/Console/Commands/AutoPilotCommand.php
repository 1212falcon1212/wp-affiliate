<?php

namespace App\Console\Commands;

use App\Jobs\FetchBizimHesapProductsJob;
use App\Jobs\SyncProductsJob;
use App\Models\BizimHesapProduct;
use App\Models\BizimHesapSyncJob;
use App\Services\Order\OrderService;
use App\Services\Sync\ProductSyncService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class AutoPilotCommand extends Command
{
    protected $signature = 'autopilot:run
                            {--sync-type=all : Sync type: all, products, orders, bizimhesap}
                            {--force : Force sync even if recently synced}';

    protected $description = 'Run auto-pilot synchronization for products and orders';

    public function handle(ProductSyncService $productSync, OrderService $orderService): int
    {
        $syncType = $this->option('sync-type');
        $force = $this->option('force');

        $this->info("🚀 Auto-pilot başlatılıyor... [Type: {$syncType}]");
        Log::info("AutoPilot started", ['type' => $syncType, 'force' => $force]);

        $results = [
            'bizimhesap' => null,
            'woocommerce_push' => null,
            'orders' => null,
            'products' => null,
        ];

        try {
            // 1. BizimHesap'tan ürün çek
            if (in_array($syncType, ['all', 'bizimhesap'])) {
                $results['bizimhesap'] = $this->syncBizimHesap($force);
            }

            // 2. BizimHesap ürünlerini WooCommerce'e gönder
            if (in_array($syncType, ['all', 'bizimhesap'])) {
                $results['woocommerce_push'] = $this->pushToWooCommerce();
            }

            // 3. WooCommerce siparişlerini çek
            if (in_array($syncType, ['all', 'orders'])) {
                $results['orders'] = $this->syncOrders($orderService);
            }

            // 4. WooCommerce ürünlerini senkronize et
            if (in_array($syncType, ['all', 'products'])) {
                $results['products'] = $this->syncProducts($productSync);
            }

            $this->displayResults($results);

            Log::info("AutoPilot completed", $results);
            $this->info("✅ Auto-pilot tamamlandı!");

            return self::SUCCESS;
        } catch (\Throwable $e) {
            Log::error("AutoPilot failed", ['error' => $e->getMessage()]);
            $this->error("❌ Auto-pilot hatası: " . $e->getMessage());

            return self::FAILURE;
        }
    }

    protected function syncBizimHesap(bool $force): array
    {
        $this->info("📦 BizimHesap'tan ürünler çekiliyor...");

        // Check last sync
        if (!$force) {
            $lastSync = BizimHesapSyncJob::where('type', 'fetch')
                ->where('status', 'completed')
                ->where('completed_at', '>', now()->subHours(6))
                ->first();

            if ($lastSync) {
                $this->warn("   Son 6 saat içinde sync yapılmış, atlanıyor. (--force ile zorla)");
                return ['skipped' => true, 'reason' => 'Recently synced'];
            }
        }

        // Create sync job
        $syncJob = BizimHesapSyncJob::create([
            'type' => 'fetch',
            'status' => 'pending',
            'started_at' => now(),
        ]);

        try {
            FetchBizimHesapProductsJob::dispatchSync($syncJob->id);
            $syncJob->refresh();

            $this->info("   ✓ {$syncJob->success_count} ürün çekildi");

            return [
                'success' => true,
                'fetched' => $syncJob->success_count,
                'errors' => $syncJob->error_count,
            ];
        } catch (\Exception $e) {
            $this->error("   ✗ Hata: " . $e->getMessage());
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    protected function pushToWooCommerce(): array
    {
        $this->info("🛒 WooCommerce'e ürünler gönderiliyor...");

        $pendingProducts = BizimHesapProduct::where('sync_status', 'pending')
            ->orWhere('sync_status', 'failed')
            ->get();

        if ($pendingProducts->isEmpty()) {
            $this->info("   Gönderilecek ürün yok");
            return ['pushed' => 0];
        }

        $syncJob = BizimHesapSyncJob::create([
            'type' => 'push',
            'status' => 'processing',
            'total_items' => $pendingProducts->count(),
            'processed_items' => 0,
            'started_at' => now(),
        ]);

        $successCount = 0;
        $errorCount = 0;

        foreach ($pendingProducts as $product) {
            try {
                \App\Jobs\PushProductToWooCommerceJob::dispatchSync($product->id, $syncJob->id);
                $successCount++;
            } catch (\Exception $e) {
                $errorCount++;
                Log::error("Push failed for product {$product->id}: " . $e->getMessage());
            }
        }

        $syncJob->update([
            'status' => 'completed',
            'processed_items' => $pendingProducts->count(),
            'success_count' => $successCount,
            'error_count' => $errorCount,
            'completed_at' => now(),
        ]);

        $this->info("   ✓ {$successCount} ürün gönderildi, {$errorCount} hata");

        return [
            'pushed' => $successCount,
            'errors' => $errorCount,
        ];
    }

    protected function syncOrders(OrderService $orderService): array
    {
        $this->info("📋 Siparişler senkronize ediliyor...");

        try {
            $result = $orderService->fetchFromWooCommerce(1, 50);

            $this->info("   ✓ {$result['synced']} sipariş senkronize edildi");

            return [
                'synced' => $result['synced'],
                'total' => $result['total'],
            ];
        } catch (\Exception $e) {
            $this->error("   ✗ Hata: " . $e->getMessage());
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    protected function syncProducts(ProductSyncService $productSync): array
    {
        $this->info("🔄 WooCommerce ürünleri senkronize ediliyor...");

        try {
            $productSync->syncAll();
            $this->info("   ✓ Ürünler senkronize edildi");

            return ['success' => true];
        } catch (\Exception $e) {
            $this->error("   ✗ Hata: " . $e->getMessage());
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    protected function displayResults(array $results): void
    {
        $this->newLine();
        $this->info("═══════════════════════════════════════");
        $this->info("           AUTO-PILOT SONUÇLARI        ");
        $this->info("═══════════════════════════════════════");

        foreach ($results as $key => $result) {
            if ($result === null) {
                continue;
            }

            $status = ($result['success'] ?? true) && !isset($result['skipped'])
                ? '✅'
                : (isset($result['skipped']) ? '⏭️' : '❌');

            $this->line("  {$status} " . strtoupper(str_replace('_', ' ', $key)));
        }

        $this->info("═══════════════════════════════════════");
    }
}
