<?php

namespace App\Jobs;

use App\Jobs\Concerns\WithSyncLock;
use App\Models\BizimHesapProduct;
use App\Models\BizimHesapSyncJob;
use App\Services\ERP\BizimHesapService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class FetchBizimHesapProductsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels, WithSyncLock;

    public int $timeout = 600; // 10 minutes
    public int $tries = 3;

    protected int $syncJobId;
    protected ?string $lockOwner = null;

    public function __construct(int $syncJobId)
    {
        $this->syncJobId = $syncJobId;
    }

    protected function getLockKey(): string
    {
        return 'sync:bizimhesap:fetch';
    }

    public function handle(BizimHesapService $bizimHesap): void
    {
        // Acquire lock to prevent concurrent runs
        $this->withLock(function () use ($bizimHesap) {
            $this->processSync($bizimHesap);
        });
    }

    protected function processSync(BizimHesapService $bizimHesap): void
    {
        $syncJob = BizimHesapSyncJob::find($this->syncJobId);

        if (!$syncJob) {
            Log::error("BizimHesap sync job not found: {$this->syncJobId}");
            return;
        }

        try {
            $syncJob->start();

            // Fetch all raw products from BizimHesap
            $rawProducts = $bizimHesap->fetchProductsRaw();

            if (empty($rawProducts)) {
                $syncJob->complete();
                Log::info("BizimHesap returned no products");
                return;
            }

            $totalFetched = 0;
            $successCount = 0;
            $errorCount = 0;

            foreach ($rawProducts as $item) {
                try {
                    // Generate SKU from code, barcode, or id
                    $sku = $item['code'] ?? $item['sku'] ?? $item['barcode'] ?? null;
                    if (empty($sku)) {
                        $sku = 'BH-' . ($item['id'] ?? uniqid());
                    }

                    BizimHesapProduct::updateOrCreate(
                        ['bh_id' => $item['id']],
                        [
                            // Basic info
                            'is_active' => (bool) ($item['isActive'] ?? true),
                            'code' => $item['code'] ?? null,
                            'name' => $item['title'] ?? $item['name'] ?? 'Unnamed',
                            'sku' => (string) $sku,
                            'barcode' => $item['barcode'] ?? null,

                            // Pricing
                            'price' => (float) ($item['price'] ?? 0),
                            'buying_price' => (float) ($item['buyingPrice'] ?? 0),
                            'variant_price' => (float) ($item['variantPrice'] ?? 0),
                            'currency' => $item['currency'] ?? 'TL',
                            'tax' => (float) ($item['tax'] ?? 20),

                            // Stock & Unit
                            'stock' => (int) ($item['quantity'] ?? 0),
                            'unit' => $item['unit'] ?? null,

                            // Category & Brand
                            'category' => $item['category'] ?? null,
                            'brand' => $item['brand'] ?? null,

                            // Descriptions
                            'description' => $item['description'] ?? null,
                            'ecommerce_description' => $item['ecommerceDescription'] ?? null,
                            'note' => $item['note'] ?? null,

                            // Variant info
                            'variant_name' => $item['variantName'] ?? null,
                            'variant' => $item['variant'] ?? null,

                            // Flags
                            'is_ecommerce' => (bool) ($item['isEcommerce'] ?? true),

                            // Photo
                            'photo' => $item['photo'] ?? null,

                            // Store complete raw data
                            'raw_data' => $item,
                        ]
                    );

                    $successCount++;
                } catch (\Exception $e) {
                    Log::error("Error saving BizimHesap product: " . $e->getMessage(), [
                        'item_id' => $item['id'] ?? 'unknown',
                    ]);
                    $errorCount++;
                    $syncJob->addError("Ürün " . ($item['code'] ?? $item['id'] ?? 'unknown') . ": " . $e->getMessage());
                }

                $totalFetched++;
                $syncJob->progress($totalFetched, $successCount, $errorCount);
            }

            $syncJob->update(['total_items' => $totalFetched]);
            $syncJob->complete();

            Log::info("BizimHesap fetch completed", [
                'total' => $totalFetched,
                'success' => $successCount,
                'errors' => $errorCount,
            ]);

        } catch (\Exception $e) {
            Log::error("BizimHesap fetch job failed: " . $e->getMessage());
            $syncJob->fail($e->getMessage());
            throw $e;
        }
    }
}

