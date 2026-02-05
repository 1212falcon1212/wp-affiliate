<?php

namespace App\Jobs;

use App\Models\BizimHesapProduct;
use App\Models\BizimHesapSyncJob;
use App\Services\WooCommerce\WooCommerceService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class PushProductToWooCommerceJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 120;
    public int $tries = 3;
    public int $backoff = 10; // 10 seconds between retries

    protected int $productId;
    protected ?int $syncJobId;

    public function __construct(int $productId, ?int $syncJobId = null)
    {
        $this->productId = $productId;
        $this->syncJobId = $syncJobId;
    }

    public function handle(WooCommerceService $wooCommerce): void
    {
        $product = BizimHesapProduct::find($this->productId);

        if (!$product) {
            Log::error("BizimHesap product not found: {$this->productId}");
            return;
        }

        $syncJob = $this->syncJobId ? BizimHesapSyncJob::find($this->syncJobId) : null;

        try {
            // Prepare WooCommerce product data with all available fields
            $wcData = [
                'name' => $product->name,
                'type' => 'simple',
                'regular_price' => (string) $product->price,
                'sku' => $product->sku,
                'manage_stock' => true,
                'stock_quantity' => max(0, $product->stock), // WC doesn't accept negative stock
                'status' => $product->is_active && $product->is_ecommerce ? 'publish' : 'draft',
            ];

            // Description - prefer ecommerce_description, fallback to description
            $description = $product->ecommerce_description ?: $product->description;
            if ($description) {
                $wcData['description'] = $description;
            }

            // Short description from note
            if ($product->note) {
                $wcData['short_description'] = $product->note;
            }

            // Tax class based on tax rate
            if ($product->tax) {
                // WooCommerce uses tax class names, map common Turkish rates
                $wcData['tax_class'] = match ((int) $product->tax) {
                    0 => 'zero-rate',
                    1 => 'reduced-rate',
                    8 => 'reduced-rate',
                    10 => 'reduced-rate',
                    18 => 'standard',
                    20 => 'standard',
                    default => '',
                };
            }

            // Meta data with all BizimHesap fields
            $metaData = [
                ['key' => '_bizimhesap_id', 'value' => $product->bh_id],
                ['key' => '_bizimhesap_code', 'value' => $product->code],
                ['key' => '_buying_price', 'value' => (string) $product->buying_price],
                ['key' => '_currency', 'value' => $product->currency],
                ['key' => '_tax_rate', 'value' => (string) $product->tax],
                ['key' => '_unit', 'value' => $product->unit],
            ];

            if ($product->barcode) {
                $metaData[] = ['key' => '_barcode', 'value' => $product->barcode];
            }

            if ($product->variant_name) {
                $metaData[] = ['key' => '_variant_name', 'value' => $product->variant_name];
            }

            if ($product->variant) {
                $metaData[] = ['key' => '_variant', 'value' => $product->variant];
            }

            $wcData['meta_data'] = $metaData;

            // Images - if photo URL exists
            if ($product->photo) {
                $wcData['images'] = [
                    ['src' => $product->photo],
                ];
            }

            // LOG THE PAYLOAD FOR DEBUGGING
            Log::info("WooCommerce push payload", [
                'product_id' => $this->productId,
                'bh_id' => $product->bh_id,
                'sku' => $product->sku,
                'payload' => $wcData,
            ]);

            // Check if product already exists by SKU
            $existingProduct = null;
            if ($product->sku) {
                $existingProduct = $wooCommerce->getProductBySku($product->sku);
            }

            if ($existingProduct) {
                // Update existing product
                $result = $wooCommerce->updateProduct($existingProduct['id'], $wcData);
                $wcProductId = $existingProduct['id'];
                Log::info("Updated WooCommerce product", ['wc_id' => $wcProductId, 'sku' => $product->sku]);
            } else {
                // Create new product
                $result = $wooCommerce->createProduct($wcData);
                $wcProductId = $result['id'] ?? null;
                Log::info("Created WooCommerce product", ['wc_id' => $wcProductId, 'sku' => $product->sku]);
            }

            if ($wcProductId) {
                $product->markAsSynced($wcProductId);

                if ($syncJob) {
                    $syncJob->increment('success_count');
                    $syncJob->increment('processed_items');
                    $this->checkAndCompleteSyncJob($syncJob);
                }
            } else {
                throw new \Exception('WooCommerce product ID not returned');
            }

        } catch (\Exception $e) {
            Log::error("Failed to push product to WooCommerce", [
                'product_id' => $this->productId,
                'sku' => $product->sku,
                'error' => $e->getMessage(),
            ]);

            $product->markAsFailed($e->getMessage());

            if ($syncJob) {
                $syncJob->increment('error_count');
                $syncJob->increment('processed_items');
                $syncJob->addError("SKU {$product->sku}: " . $e->getMessage());
                $this->checkAndCompleteSyncJob($syncJob);
            }

            // Don't rethrow - we don't want to retry failed products automatically
        }
    }

    /**
     * Check if all items are processed and complete the sync job
     */
    protected function checkAndCompleteSyncJob(BizimHesapSyncJob $syncJob): void
    {
        $syncJob->refresh();

        if ($syncJob->processed_items >= $syncJob->total_items) {
            $syncJob->complete();
            Log::info("Sync job completed", [
                'job_id' => $syncJob->id,
                'success' => $syncJob->success_count,
                'errors' => $syncJob->error_count,
            ]);
        }
    }
}
