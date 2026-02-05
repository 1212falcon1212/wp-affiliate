<?php

namespace App\Services\Import;

use App\Models\KozvitProduct;
use App\Services\WooCommerce\WooCommerceService;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class KozvitImportService
{
    protected array $categoryMapping = [];

    protected ?int $brandAttributeId = null;

    protected array $brandTermsMapping = [];

    public function __construct(
        protected WooCommerceService $wooCommerce
    ) {}

    /**
     * Import categories from JSON file to WooCommerce
     */
    public function importCategories(string $filePath, bool $dryRun = false, ?int $limit = null): array
    {
        $json = file_get_contents($filePath);
        $categories = json_decode($json, true);

        if (! $categories) {
            throw new \Exception('Kategori dosyası okunamadı veya geçersiz JSON');
        }

        $results = [
            'total_main' => 0,
            'total_sub' => 0,
            'created_main' => 0,
            'created_sub' => 0,
            'skipped' => 0,
            'errors' => [],
            'mapping' => [],
        ];

        // Get existing categories for deduplication
        $existingCategories = $this->getExistingCategoriesMap();

        $count = 0;
        foreach ($categories as $mainCategoryName => $subCategories) {
            if ($limit && $count >= $limit) {
                break;
            }

            $results['total_main']++;

            // Create or find main category
            $mainCatResult = $this->createOrFindCategory($mainCategoryName, 0, $existingCategories, $dryRun);

            if ($mainCatResult['created']) {
                $results['created_main']++;
            }

            if (isset($mainCatResult['error'])) {
                $results['errors'][] = $mainCatResult['error'];

                continue;
            }

            $mainCatId = $mainCatResult['id'];
            $results['mapping'][$mainCategoryName] = $mainCatId;

            // Create subcategories
            foreach ($subCategories as $subCat) {
                $results['total_sub']++;

                $subCatResult = $this->createOrFindCategory(
                    $subCat['name'],
                    $mainCatId,
                    $existingCategories,
                    $dryRun
                );

                if ($subCatResult['created']) {
                    $results['created_sub']++;
                }

                if (isset($subCatResult['error'])) {
                    $results['errors'][] = $subCatResult['error'];

                    continue;
                }

                $results['mapping'][$mainCategoryName.' > '.$subCat['name']] = $subCatResult['id'];
            }

            $count++;
        }

        return $results;
    }

    /**
     * Import products from JSON file to LOCAL DATABASE
     */
    public function importProducts(
        string $filePath,
        bool $dryRun = false,
        int $offset = 0,
        int $limit = 10,
        ?callable $progressCallback = null
    ): array {
        $json = file_get_contents($filePath);
        $data = json_decode($json, true);

        if (! $data || ! isset($data['products'])) {
            throw new \Exception('Ürün dosyası okunamadı veya geçersiz JSON');
        }

        $products = array_slice($data['products'], $offset, $limit);

        $results = [
            'total' => count($products),
            'created' => 0,
            'updated' => 0,
            'skipped' => 0,
            'errors' => [],
            'products' => [],
        ];

        foreach ($products as $index => $product) {
            try {
                $result = $this->importSingleProductToDb($product, $dryRun);
                $results['products'][] = $result;

                if ($result['status'] === 'created') {
                    $results['created']++;
                } elseif ($result['status'] === 'updated') {
                    $results['updated']++;
                } elseif ($result['status'] === 'skipped') {
                    $results['skipped']++;
                }

                if ($progressCallback) {
                    $progressCallback($index + 1, count($products), $result);
                }
            } catch (\Throwable $e) {
                $results['errors'][] = [
                    'barcode' => $product['barcode'] ?? 'unknown',
                    'name' => $product['name'] ?? 'unknown',
                    'error' => $e->getMessage(),
                ];

                Log::error('Kozvit product import error', [
                    'barcode' => $product['barcode'] ?? null,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return $results;
    }

    /**
     * Import a single product to local database
     */
    protected function importSingleProductToDb(array $product, bool $dryRun = false): array
    {
        $barcode = $product['barcode'] ?? null;
        $name = $product['name'] ?? null;

        if (! $barcode || ! $name) {
            return [
                'status' => 'skipped',
                'reason' => 'Missing barcode or name',
                'barcode' => $barcode,
            ];
        }

        // Build product data for DB
        $productData = [
            'barcode' => $barcode,
            'kozvit_sku' => $product['sku'] ?? null,
            'name' => $name,
            'brand' => $product['brand'] ?? null,
            'price' => (float) ($product['price'] ?? 0),
            'currency' => $product['currency'] ?? 'TRY',
            'main_category' => $product['main_category'] ?? null,
            'sub_category' => $product['sub_category'] ?? null,
            'description' => $product['description'] ?? null,
            'image_url' => $product['image_url'] ?? null,
            'source_url' => $product['url'] ?? null,
            'rating' => (float) ($product['rating'] ?? 0),
            'review_count' => (int) ($product['review_count'] ?? 0),
            'raw_data' => $product,
        ];

        if ($dryRun) {
            return [
                'status' => 'dry_run',
                'barcode' => $barcode,
                'name' => $name,
                'data' => $productData,
            ];
        }

        // Check if product already exists
        $existing = KozvitProduct::where('barcode', $barcode)->first();

        if ($existing) {
            // Update existing product (but don't touch sync status if already synced)
            $updateData = $productData;
            unset($updateData['barcode']); // Don't update barcode

            // If already synced, don't reset sync status
            if ($existing->sync_status !== KozvitProduct::STATUS_SYNCED) {
                $updateData['sync_status'] = KozvitProduct::STATUS_PENDING;
            }

            $existing->update($updateData);

            return [
                'status' => 'updated',
                'barcode' => $barcode,
                'name' => $name,
                'id' => $existing->id,
            ];
        }

        // Create new product
        $kozvitProduct = KozvitProduct::create($productData);

        return [
            'status' => 'created',
            'barcode' => $barcode,
            'name' => $name,
            'id' => $kozvitProduct->id,
        ];
    }

    /**
     * Push a single Kozvit product to WooCommerce
     */
    public function pushToWooCommerce(KozvitProduct $product): array
    {
        // Build WooCommerce product data
        $wcData = [
            'name' => $product->name,
            'type' => 'simple',
            'status' => 'publish',
            'sku' => $product->barcode,
            'regular_price' => (string) $product->price,
            'description' => $product->description ?? '',
            'short_description' => $this->generateShortDescription([
                'brand' => $product->brand,
                'main_category' => $product->main_category,
            ]),
        ];

        // Categories
        $categoryIds = $this->resolveCategoryIds($product->main_category, $product->sub_category);
        if (! empty($categoryIds)) {
            $wcData['categories'] = array_map(fn ($id) => ['id' => $id], $categoryIds);
        }

        // Images
        if ($product->image_url) {
            $wcData['images'] = [['src' => $product->image_url]];
        }

        // Brand - using global attribute
        if ($product->brand) {
            // Build brand mapping if not done
            if (empty($this->brandTermsMapping)) {
                $this->buildBrandMapping();
            }

            // 1. As meta data (for themes/plugins that use meta)
            $wcData['meta_data'] = [
                ['key' => '_brand', 'value' => $product->brand],
                ['key' => 'brand', 'value' => $product->brand],
            ];

            // 2. As global product attribute (pa_marka)
            if ($this->brandAttributeId) {
                $brandSlug = Str::slug($product->brand);

                $wcData['attributes'] = [
                    [
                        'id' => $this->brandAttributeId,
                        'position' => 0,
                        'visible' => true,
                        'variation' => false,
                        'options' => [$product->brand],
                    ],
                ];
            } else {
                // Fallback: local attribute if no global attribute found
                $wcData['attributes'] = [
                    [
                        'name' => 'Marka',
                        'position' => 0,
                        'visible' => true,
                        'variation' => false,
                        'options' => [$product->brand],
                    ],
                ];
            }
        }

        Log::info('Pushing Kozvit product to WooCommerce', [
            'kozvit_id' => $product->id,
            'barcode' => $product->barcode,
            'payload' => $wcData,
        ]);

        try {
            // Check if SKU already exists in WooCommerce
            $existingWc = $this->wooCommerce->getProductBySku($product->barcode);

            if ($existingWc) {
                // Update existing WooCommerce product
                $wcProduct = $this->wooCommerce->updateProduct($existingWc['id'], $wcData);
                $product->markAsSynced($existingWc['id']);

                return [
                    'success' => true,
                    'action' => 'updated',
                    'wc_id' => $existingWc['id'],
                ];
            }

            // Create new WooCommerce product
            $wcProduct = $this->wooCommerce->createProduct($wcData);

            if (! $wcProduct || ! isset($wcProduct['id'])) {
                throw new \Exception('WooCommerce ürün oluşturulamadı');
            }

            $product->markAsSynced($wcProduct['id']);

            return [
                'success' => true,
                'action' => 'created',
                'wc_id' => $wcProduct['id'],
            ];
        } catch (\Throwable $e) {
            $product->markAsFailed($e->getMessage());

            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Push multiple products to WooCommerce
     */
    public function pushBatchToWooCommerce(array $productIds): array
    {
        $results = [
            'total' => count($productIds),
            'success' => 0,
            'failed' => 0,
            'details' => [],
        ];

        // Build category mapping first
        if (empty($this->categoryMapping)) {
            $this->buildCategoryMapping();
        }

        foreach ($productIds as $productId) {
            $product = KozvitProduct::find($productId);

            if (! $product) {
                $results['failed']++;
                $results['details'][] = [
                    'id' => $productId,
                    'success' => false,
                    'error' => 'Ürün bulunamadı',
                ];

                continue;
            }

            $result = $this->pushToWooCommerce($product);
            $results['details'][] = array_merge(['id' => $productId], $result);

            if ($result['success']) {
                $results['success']++;
            } else {
                $results['failed']++;
            }
        }

        return $results;
    }

    /**
     * Create or find a category in WooCommerce
     */
    protected function createOrFindCategory(
        string $name,
        int $parentId,
        array &$existingCategories,
        bool $dryRun
    ): array {
        $slug = Str::slug($name);
        $key = $parentId.':'.$slug;

        // Check if already exists
        if (isset($existingCategories[$key])) {
            return [
                'id' => $existingCategories[$key],
                'created' => false,
            ];
        }

        // Also check by name for parent categories
        if ($parentId === 0) {
            foreach ($existingCategories as $existingKey => $existingId) {
                if (str_starts_with($existingKey, '0:') && stripos($existingKey, $slug) !== false) {
                    return [
                        'id' => $existingId,
                        'created' => false,
                    ];
                }
            }
        }

        if ($dryRun) {
            // Generate fake ID for dry run
            $fakeId = crc32($key);
            $existingCategories[$key] = $fakeId;

            return [
                'id' => $fakeId,
                'created' => true,
                'dry_run' => true,
            ];
        }

        // Create new category
        try {
            $categoryData = [
                'name' => $name,
                'slug' => $slug,
            ];

            if ($parentId > 0) {
                $categoryData['parent'] = $parentId;
            }

            $created = $this->wooCommerce->createCategory($categoryData);

            if ($created && isset($created['id'])) {
                $existingCategories[$key] = $created['id'];

                Log::info('Created WooCommerce category', [
                    'name' => $name,
                    'id' => $created['id'],
                    'parent' => $parentId,
                ]);

                return [
                    'id' => $created['id'],
                    'created' => true,
                ];
            }

            return [
                'id' => 0,
                'created' => false,
                'error' => "Failed to create category: {$name}",
            ];
        } catch (\Throwable $e) {
            return [
                'id' => 0,
                'created' => false,
                'error' => "Error creating category {$name}: ".$e->getMessage(),
            ];
        }
    }

    /**
     * Get existing categories as a map
     */
    protected function getExistingCategoriesMap(): array
    {
        $map = [];
        $page = 1;

        do {
            $categories = $this->wooCommerce->getCategories($page, 100);

            foreach ($categories as $cat) {
                $key = ($cat['parent'] ?? 0).':'.($cat['slug'] ?? '');
                $map[$key] = $cat['id'];

                // Also store by name for easier lookup
                $nameKey = ($cat['parent'] ?? 0).':'.Str::slug($cat['name'] ?? '');
                $map[$nameKey] = $cat['id'];
            }

            $page++;
        } while (count($categories) === 100);

        return $map;
    }

    /**
     * Build category mapping from WooCommerce
     */
    public function buildCategoryMapping(): void
    {
        $this->categoryMapping = [];
        $page = 1;

        do {
            $categories = $this->wooCommerce->getCategories($page, 100);

            foreach ($categories as $cat) {
                $name = strtolower($cat['name'] ?? '');
                $slug = $cat['slug'] ?? '';
                $this->categoryMapping[$name] = $cat['id'];
                $this->categoryMapping[$slug] = $cat['id'];
            }

            $page++;
        } while (count($categories) === 100);

        Log::info('Built category mapping', ['count' => count($this->categoryMapping)]);
    }

    /**
     * Build brand attribute and terms mapping from WooCommerce
     */
    public function buildBrandMapping(): void
    {
        $this->brandAttributeId = null;
        $this->brandTermsMapping = [];

        // Find "Marka" or "Brand" attribute
        $attributes = $this->wooCommerce->getAttributes();

        foreach ($attributes as $attr) {
            $name = strtolower($attr['name'] ?? '');
            $slug = $attr['slug'] ?? '';

            if (in_array($name, ['marka', 'brand']) || in_array($slug, ['pa_marka', 'pa_brand', 'marka', 'brand'])) {
                $this->brandAttributeId = $attr['id'];
                Log::info('Found brand attribute', ['id' => $attr['id'], 'name' => $attr['name']]);
                break;
            }
        }

        if (! $this->brandAttributeId) {
            Log::warning('Brand attribute not found in WooCommerce. Run: php artisan kozvit:sync-brands');

            return;
        }

        // Get all terms for this attribute
        $terms = $this->wooCommerce->getAttributeTerms($this->brandAttributeId);

        foreach ($terms as $term) {
            $slug = $term['slug'] ?? Str::slug($term['name'] ?? '');
            $name = strtolower($term['name'] ?? '');
            $this->brandTermsMapping[$slug] = $term['id'];
            $this->brandTermsMapping[$name] = $term['id'];
        }

        Log::info('Built brand mapping', [
            'attribute_id' => $this->brandAttributeId,
            'terms_count' => count($this->brandTermsMapping),
        ]);
    }

    /**
     * Resolve category IDs from names
     */
    public function resolveCategoryIds(?string $mainCategory, ?string $subCategory): array
    {
        // Build mapping if not done yet
        if (empty($this->categoryMapping)) {
            $this->buildCategoryMapping();
        }

        $ids = [];

        if ($mainCategory) {
            $mainKey = strtolower($mainCategory);
            if (isset($this->categoryMapping[$mainKey])) {
                $ids[] = $this->categoryMapping[$mainKey];
            }
        }

        if ($subCategory) {
            $subKey = strtolower($subCategory);
            if (isset($this->categoryMapping[$subKey])) {
                $ids[] = $this->categoryMapping[$subKey];
            } else {
                // Try with slug
                $subSlug = Str::slug($subCategory);
                if (isset($this->categoryMapping[$subSlug])) {
                    $ids[] = $this->categoryMapping[$subSlug];
                }
            }
        }

        return array_unique($ids);
    }

    /**
     * Generate short description from product data
     */
    protected function generateShortDescription(array $product): string
    {
        $parts = [];

        if (! empty($product['brand'])) {
            $parts[] = $product['brand'];
        }

        if (! empty($product['main_category'])) {
            $parts[] = $product['main_category'];
        }

        return implode(' - ', $parts);
    }

    /**
     * Get total product count from JSON
     */
    public function getProductCount(string $filePath): int
    {
        $json = file_get_contents($filePath);
        $data = json_decode($json, true);

        return $data['count'] ?? count($data['products'] ?? []);
    }

    /**
     * Get category count from JSON
     */
    public function getCategoryStats(string $filePath): array
    {
        $json = file_get_contents($filePath);
        $categories = json_decode($json, true);

        $mainCount = count($categories);
        $subCount = 0;

        foreach ($categories as $subs) {
            $subCount += count($subs);
        }

        return [
            'main_categories' => $mainCount,
            'sub_categories' => $subCount,
            'total' => $mainCount + $subCount,
        ];
    }
}
