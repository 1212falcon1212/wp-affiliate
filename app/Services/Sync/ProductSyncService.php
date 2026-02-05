<?php

namespace App\Services\Sync;

use App\Contracts\CommerceInterface;
use App\Contracts\ERPInterface;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\ProductVariation;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ProductSyncService
{
    public function __construct(
        protected ERPInterface $erp,
        protected CommerceInterface $commerce
    ) {
    }

    public function syncAll(): void
    {
        // 1. PRIMARY: Fetch from WooCommerce and populate normalized tables
        try {
            Log::info("Starting WooCommerce product fetch...");

            /** @var \App\Services\WooCommerce\WooCommerceService $wcService */
            $wcService = $this->commerce;
            $rawProducts = method_exists($wcService, 'getProductsRaw')
                ? $wcService->getProductsRaw(1, 100)
                : [];

            Log::info("Fetched " . count($rawProducts) . " products from WooCommerce.");

            foreach ($rawProducts as $wc) {
                $sku = $wc['sku'] ?? null;
                if (empty($sku)) {
                    continue;
                }

                // Create/Update Product
                $product = Product::updateOrCreate(
                    ['sku' => $sku],
                    [
                        'commerce_id' => $wc['id'] ?? null,
                        'name' => $wc['name'] ?? '',
                        'slug' => $wc['slug'] ?? null,
                        'permalink' => $wc['permalink'] ?? null,
                        'type' => $wc['type'] ?? 'simple',
                        'status' => $wc['status'] ?? 'publish',
                        'featured' => $wc['featured'] ?? false,
                        'catalog_visibility' => $wc['catalog_visibility'] ?? 'visible',
                        'description' => $wc['description'] ?? null,
                        'short_description' => $wc['short_description'] ?? null,
                        'price' => (float) ($wc['price'] ?? 0),
                        'regular_price' => (float) ($wc['regular_price'] ?? 0),
                        'sale_price' => !empty($wc['sale_price']) ? (float) $wc['sale_price'] : null,
                        'on_sale' => $wc['on_sale'] ?? false,
                        'date_on_sale_from' => $wc['date_on_sale_from'] ?? null,
                        'date_on_sale_to' => $wc['date_on_sale_to'] ?? null,
                        'total_sales' => $wc['total_sales'] ?? 0,
                        'manage_stock' => $wc['manage_stock'] ?? false,
                        'stock' => $wc['stock_quantity'] ?? 0,
                        'stock_status' => $wc['stock_status'] ?? 'instock',
                        'backorders' => $wc['backorders'] ?? 'no',
                        'weight' => $wc['weight'] ?? null,
                        'dimensions' => $wc['dimensions'] ?? null,
                        'shipping_class' => $wc['shipping_class'] ?? null,
                        'reviews_allowed' => $wc['reviews_allowed'] ?? true,
                        'average_rating' => (float) ($wc['average_rating'] ?? 0),
                        'rating_count' => (int) ($wc['rating_count'] ?? 0),
                        'attributes' => $wc['attributes'] ?? [],
                        'meta_data' => $wc['meta_data'] ?? [],
                        'sync_status' => 'synced',
                        'updated_at' => now(),
                    ]
                );

                // Sync Categories
                $this->syncCategories($product, $wc['categories'] ?? []);

                // Sync Brands
                $this->syncBrands($product, $wc['brands'] ?? []);

                // Sync Images
                $this->syncImages($product, $wc['images'] ?? []);

                // Sync Variations (for variable products)
                if (($wc['type'] ?? 'simple') === 'variable') {
                    $this->syncVariations($product, $wc['id']);
                }

                $this->log($sku, 'imported_wc', 'Synced product with relations');
            }

        } catch (\Exception $e) {
            Log::error("WooCommerce Fetch Failed: " . $e->getMessage());
        }

        // 2. SECONDARY: ERP Sync (price/stock updates to WC)
        $this->syncFromERP();
    }

    /**
     * Sync categories for a product
     */
    protected function syncCategories(Product $product, array $wcCategories): void
    {
        $categoryIds = [];

        foreach ($wcCategories as $cat) {
            $category = Category::updateOrCreate(
                ['wc_id' => $cat['id']],
                [
                    'name' => $cat['name'] ?? '',
                    'slug' => $cat['slug'] ?? '',
                ]
            );
            $categoryIds[] = $category->id;
        }

        $product->categories()->sync($categoryIds);
    }

    /**
     * Sync brands for a product
     */
    protected function syncBrands(Product $product, array $wcBrands): void
    {
        $brandIds = [];

        foreach ($wcBrands as $br) {
            $brand = Brand::updateOrCreate(
                ['wc_id' => $br['id'] ?? null],
                [
                    'name' => $br['name'] ?? 'Unknown',
                    'slug' => $br['slug'] ?? null,
                ]
            );
            $brandIds[] = $brand->id;
        }

        $product->brands()->sync($brandIds);
    }

    /**
     * Sync images for a product
     */
    protected function syncImages(Product $product, array $wcImages): void
    {
        // Clear existing images
        $product->images()->delete();

        foreach ($wcImages as $index => $img) {
            ProductImage::create([
                'product_id' => $product->id,
                'wc_id' => $img['id'] ?? null,
                'src' => $img['src'] ?? '',
                'name' => $img['name'] ?? null,
                'alt' => $img['alt'] ?? null,
                'position' => $index,
                'is_featured' => $index === 0,
                'thumbnail' => $img['thumbnail'] ?? null,
            ]);
        }
    }

    /**
     * Sync variations for a variable product
     */
    protected function syncVariations(Product $product, int $wcProductId): void
    {
        try {
            /** @var \App\Services\WooCommerce\WooCommerceService $wcService */
            $wcService = $this->commerce;

            // Fetch variations from WooCommerce
            if (!method_exists($wcService, 'getVariations')) {
                return;
            }

            $variations = $wcService->getVariations($wcProductId);

            // Clear existing variations
            $product->variations()->delete();

            foreach ($variations as $var) {
                ProductVariation::create([
                    'product_id' => $product->id,
                    'wc_id' => $var['id'],
                    'sku' => $var['sku'] ?? null,
                    'price' => (float) ($var['price'] ?? 0),
                    'regular_price' => (float) ($var['regular_price'] ?? 0),
                    'sale_price' => !empty($var['sale_price']) ? (float) $var['sale_price'] : null,
                    'on_sale' => $var['on_sale'] ?? false,
                    'stock_quantity' => $var['stock_quantity'] ?? null,
                    'stock_status' => $var['stock_status'] ?? 'instock',
                    'manage_stock' => $var['manage_stock'] ?? false,
                    'weight' => $var['weight'] ?? null,
                    'dimensions' => $var['dimensions'] ?? null,
                    'attributes' => $var['attributes'] ?? [],
                    'image' => $var['image']['src'] ?? null,
                    'status' => $var['status'] ?? 'publish',
                ]);
            }

            Log::info("Synced " . count($variations) . " variations for product {$product->sku}");

        } catch (\Exception $e) {
            Log::warning("Failed to sync variations for product {$product->sku}: " . $e->getMessage());
        }
    }

    /**
     * Secondary: Sync from ERP to WooCommerce (price/stock updates)
     */
    protected function syncFromERP(): void
    {
        if (!method_exists($this->erp, 'fetchFromERP')) {
            return;
        }

        $erpProducts = $this->erp->fetchFromERP(1, 100);

        if (empty($erpProducts)) {
            return;
        }

        $batchUpdateData = [];

        foreach ($erpProducts as $erpProduct) {
            $lock = Cache::lock("sync_product_{$erpProduct->sku}", 10);

            if ($lock->get()) {
                try {
                    $localProduct = Product::where('sku', $erpProduct->sku)->first();
                    $commerceId = $localProduct?->commerce_id;

                    if (!$commerceId) {
                        continue;
                    }

                    $batchUpdateData[] = [
                        'id' => $commerceId,
                        'regular_price' => (string) $erpProduct->price,
                        'manage_stock' => true,
                        'stock_quantity' => $erpProduct->stockQuantity,
                    ];

                } finally {
                    $lock->release();
                }
            }
        }

        if (!empty($batchUpdateData)) {
            $chunks = array_chunk($batchUpdateData, 50);
            foreach ($chunks as $chunk) {
                $this->commerce->updateProductsBatch($chunk);
                Log::info("Updated batch of " . count($chunk) . " products in WooCommerce from ERP.");
            }
        }
    }

    protected function log($sku, $status, $message): void
    {
        DB::table('sync_logs')->insert([
            'sku' => $sku,
            'status' => $status,
            'message' => $message,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
