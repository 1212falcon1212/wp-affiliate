<?php

namespace App\Services\WooCommerce;

use Illuminate\Support\Facades\Log;

class ProductCreationService
{
    public function __construct(
        protected WooCommerceService $wooCommerce
    ) {}

    /**
     * Create a simple product
     */
    public function createSimpleProduct(array $data): array
    {
        $productData = $this->buildBaseProductData($data);
        $productData['type'] = 'simple';

        // Price for simple product
        if (isset($data['regular_price'])) {
            $productData['regular_price'] = (string) $data['regular_price'];
        }
        if (! empty($data['sale_price'])) {
            $productData['sale_price'] = (string) $data['sale_price'];
        }

        // Stock for simple product
        if (isset($data['stock_quantity'])) {
            $productData['manage_stock'] = true;
            $productData['stock_quantity'] = (int) $data['stock_quantity'];
        }

        Log::info('Creating simple product in WooCommerce', [
            'sku' => $data['sku'] ?? null,
            'payload' => $productData,
        ]);

        $result = $this->wooCommerce->createProduct($productData);

        if (! $result) {
            throw new \Exception('WooCommerce ürün oluşturulamadı');
        }

        return $result;
    }

    /**
     * Create a variable product with variations
     */
    public function createVariableProduct(array $data): array
    {
        // Step 1: Build base product data
        $productData = $this->buildBaseProductData($data);
        $productData['type'] = 'variable';

        // Step 2: Build attributes from variations
        $attributes = $this->buildAttributesFromVariations($data['variations'] ?? [], $data['attributes'] ?? []);
        $productData['attributes'] = $attributes;

        Log::info('Creating variable product in WooCommerce', [
            'sku' => $data['sku'] ?? null,
            'attributes' => $attributes,
        ]);

        // Step 3: Create the parent product
        $parentProduct = $this->wooCommerce->createProduct($productData);

        if (! $parentProduct || ! isset($parentProduct['id'])) {
            throw new \Exception('WooCommerce ana ürün oluşturulamadı');
        }

        $parentId = $parentProduct['id'];

        Log::info('Variable parent product created', ['wc_id' => $parentId]);

        // Step 4: Create variations
        $variations = $data['variations'] ?? [];
        $createdVariations = [];

        foreach ($variations as $index => $variation) {
            try {
                $variationData = $this->buildVariationData($variation, $attributes);
                $createdVariation = $this->wooCommerce->createVariation($parentId, $variationData);

                if ($createdVariation) {
                    $createdVariations[] = $createdVariation;
                    Log::info('Variation created', [
                        'parent_id' => $parentId,
                        'variation_id' => $createdVariation['id'],
                        'attributes' => $variationData['attributes'] ?? [],
                    ]);
                }
            } catch (\Throwable $e) {
                Log::error('Failed to create variation', [
                    'parent_id' => $parentId,
                    'index' => $index,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        $parentProduct['variations'] = $createdVariations;

        return $parentProduct;
    }

    /**
     * Update a simple product
     */
    public function updateSimpleProduct(int $wcId, array $data): ?array
    {
        $productData = $this->buildBaseProductData($data, true);

        if (isset($data['regular_price'])) {
            $productData['regular_price'] = (string) $data['regular_price'];
        }
        if (array_key_exists('sale_price', $data)) {
            $productData['sale_price'] = $data['sale_price'] ? (string) $data['sale_price'] : '';
        }
        if (isset($data['stock_quantity'])) {
            $productData['manage_stock'] = true;
            $productData['stock_quantity'] = (int) $data['stock_quantity'];
        }

        Log::info('Updating simple product in WooCommerce', [
            'wc_id' => $wcId,
            'payload' => $productData,
        ]);

        return $this->wooCommerce->updateProduct($wcId, $productData);
    }

    /**
     * Update a variable product and its variations
     */
    public function updateVariableProduct(int $wcId, array $data): ?array
    {
        $productData = $this->buildBaseProductData($data, true);

        // Update attributes if provided
        if (! empty($data['attributes']) || ! empty($data['variations'])) {
            $attributes = $this->buildAttributesFromVariations($data['variations'] ?? [], $data['attributes'] ?? []);
            $productData['attributes'] = $attributes;
        }

        Log::info('Updating variable product in WooCommerce', [
            'wc_id' => $wcId,
            'payload' => $productData,
        ]);

        $updatedProduct = $this->wooCommerce->updateProduct($wcId, $productData);

        // Handle variations if provided
        if (! empty($data['variations'])) {
            $this->syncVariations($wcId, $data['variations'], $productData['attributes'] ?? []);
        }

        return $updatedProduct;
    }

    /**
     * Add a single variation to an existing variable product
     */
    public function addVariation(int $parentId, array $variationData): ?array
    {
        // Get parent product to get attributes
        $parentProduct = $this->wooCommerce->getProductRaw($parentId);

        if (! $parentProduct) {
            throw new \Exception('Ana ürün bulunamadı');
        }

        $attributes = $parentProduct['attributes'] ?? [];
        $variation = $this->buildVariationData($variationData, $attributes);

        Log::info('Adding variation to product', [
            'parent_id' => $parentId,
            'variation_data' => $variation,
        ]);

        return $this->wooCommerce->createVariation($parentId, $variation);
    }

    /**
     * Update a single variation
     */
    public function updateVariation(int $parentId, int $variationId, array $variationData): ?array
    {
        $data = [];

        if (isset($variationData['sku'])) {
            $data['sku'] = $variationData['sku'];
        }
        if (isset($variationData['regular_price'])) {
            $data['regular_price'] = (string) $variationData['regular_price'];
        }
        if (array_key_exists('sale_price', $variationData)) {
            $data['sale_price'] = $variationData['sale_price'] ? (string) $variationData['sale_price'] : '';
        }
        if (isset($variationData['stock_quantity'])) {
            $data['manage_stock'] = true;
            $data['stock_quantity'] = (int) $variationData['stock_quantity'];
        }
        if (isset($variationData['status'])) {
            $data['status'] = $variationData['status'];
        }
        if (isset($variationData['weight'])) {
            $data['weight'] = (string) $variationData['weight'];
        }
        if (! empty($variationData['image'])) {
            $data['image'] = ['src' => $variationData['image']];
        }

        Log::info('Updating variation', [
            'parent_id' => $parentId,
            'variation_id' => $variationId,
            'data' => $data,
        ]);

        return $this->wooCommerce->updateVariation($parentId, $variationId, $data);
    }

    /**
     * Build base product data from input
     */
    protected function buildBaseProductData(array $data, bool $isUpdate = false): array
    {
        $productData = [];

        // Required fields for create
        if (! $isUpdate) {
            $productData['name'] = $data['name'];
            $productData['status'] = $data['status'] ?? 'draft';
        }

        // Optional fields
        if (isset($data['name'])) {
            $productData['name'] = $data['name'];
        }
        if (isset($data['sku'])) {
            $productData['sku'] = $data['sku'];
        }
        if (isset($data['description'])) {
            $productData['description'] = $data['description'];
        }
        if (isset($data['short_description'])) {
            $productData['short_description'] = $data['short_description'];
        }
        if (isset($data['status'])) {
            $productData['status'] = $data['status'];
        }
        if (isset($data['featured'])) {
            $productData['featured'] = (bool) $data['featured'];
        }
        if (isset($data['catalog_visibility'])) {
            $productData['catalog_visibility'] = $data['catalog_visibility'];
        }
        if (isset($data['tax_status'])) {
            $productData['tax_status'] = $data['tax_status'];
        }
        if (isset($data['tax_class'])) {
            $productData['tax_class'] = $data['tax_class'];
        }
        if (isset($data['weight'])) {
            $productData['weight'] = (string) $data['weight'];
        }
        if (isset($data['dimensions'])) {
            $productData['dimensions'] = $data['dimensions'];
        }

        // Categories
        if (! empty($data['categories'])) {
            $productData['categories'] = array_map(function ($cat) {
                return is_array($cat) ? $cat : ['id' => (int) $cat];
            }, $data['categories']);
        }

        // Tags
        if (! empty($data['tags'])) {
            $productData['tags'] = array_map(function ($tag) {
                return is_array($tag) ? $tag : ['id' => (int) $tag];
            }, $data['tags']);
        }

        // Images
        if (! empty($data['images'])) {
            $productData['images'] = array_map(function ($image) {
                if (is_string($image)) {
                    return ['src' => $image];
                }

                return $image;
            }, $data['images']);
        }

        // Meta data
        $metaData = $data['meta_data'] ?? [];

        // Brand - store as meta data
        if (! empty($data['brand'])) {
            $metaData[] = [
                'key' => '_brand',
                'value' => $data['brand'],
            ];
            // Also add as a visible attribute if there's a brand taxonomy
            $metaData[] = [
                'key' => 'brand',
                'value' => $data['brand'],
            ];
        }

        if (! empty($metaData)) {
            $productData['meta_data'] = $metaData;
        }

        return $productData;
    }

    /**
     * Build attributes array from variations data
     */
    protected function buildAttributesFromVariations(array $variations, array $existingAttributes = []): array
    {
        $attributeValues = [];

        // Collect all attribute values from variations
        foreach ($variations as $variation) {
            $attrs = $variation['attributes'] ?? [];
            foreach ($attrs as $attrName => $attrValue) {
                $normalizedName = $this->normalizeAttributeName($attrName);
                if (! isset($attributeValues[$normalizedName])) {
                    $attributeValues[$normalizedName] = [];
                }
                if (! in_array($attrValue, $attributeValues[$normalizedName])) {
                    $attributeValues[$normalizedName][] = $attrValue;
                }
            }
        }

        // Add any existing attributes that aren't in variations
        foreach ($existingAttributes as $attr) {
            $normalizedName = $this->normalizeAttributeName($attr['name'] ?? '');
            if (! isset($attributeValues[$normalizedName]) && ! empty($attr['options'])) {
                $attributeValues[$normalizedName] = $attr['options'];
            }
        }

        // Build WooCommerce attributes array
        $attributes = [];
        $position = 0;

        foreach ($attributeValues as $name => $values) {
            $attributes[] = [
                'name' => ucfirst($name),
                'visible' => true,
                'variation' => true,
                'options' => array_values(array_unique($values)),
                'position' => $position++,
            ];
        }

        return $attributes;
    }

    /**
     * Build variation data for WooCommerce
     */
    protected function buildVariationData(array $variation, array $parentAttributes): array
    {
        $data = [
            'status' => $variation['status'] ?? 'publish',
        ];

        // SKU
        if (! empty($variation['sku'])) {
            $data['sku'] = $variation['sku'];
        }

        // Price
        if (isset($variation['regular_price'])) {
            $data['regular_price'] = (string) $variation['regular_price'];
        }
        if (! empty($variation['sale_price'])) {
            $data['sale_price'] = (string) $variation['sale_price'];
        }

        // Stock
        if (isset($variation['stock_quantity'])) {
            $data['manage_stock'] = true;
            $data['stock_quantity'] = (int) $variation['stock_quantity'];
        }

        // Weight
        if (! empty($variation['weight'])) {
            $data['weight'] = (string) $variation['weight'];
        }

        // Dimensions
        if (! empty($variation['dimensions'])) {
            $data['dimensions'] = $variation['dimensions'];
        }

        // Image
        if (! empty($variation['image'])) {
            $data['image'] = ['src' => $variation['image']];
        }

        // Build attributes for this variation
        $variationAttributes = [];
        $attrs = $variation['attributes'] ?? [];

        foreach ($attrs as $attrName => $attrValue) {
            $normalizedName = $this->normalizeAttributeName($attrName);

            // Find matching parent attribute
            foreach ($parentAttributes as $parentAttr) {
                $parentNormalizedName = $this->normalizeAttributeName($parentAttr['name'] ?? '');
                if ($parentNormalizedName === $normalizedName) {
                    $variationAttributes[] = [
                        'name' => $parentAttr['name'],
                        'option' => $attrValue,
                    ];
                    break;
                }
            }

            // If no parent match found, use the name directly
            if (empty($variationAttributes) || end($variationAttributes)['name'] !== ucfirst($normalizedName)) {
                $variationAttributes[] = [
                    'name' => ucfirst($normalizedName),
                    'option' => $attrValue,
                ];
            }
        }

        $data['attributes'] = $variationAttributes;

        return $data;
    }

    /**
     * Sync variations for an existing variable product
     */
    protected function syncVariations(int $parentId, array $variations, array $attributes): void
    {
        // Get existing variations
        $existingVariations = $this->wooCommerce->getVariations($parentId);
        $existingByAttributes = [];

        foreach ($existingVariations as $existing) {
            $key = $this->getVariationKey($existing['attributes'] ?? []);
            $existingByAttributes[$key] = $existing;
        }

        foreach ($variations as $variation) {
            $variationData = $this->buildVariationData($variation, $attributes);
            $key = $this->getVariationKey($variationData['attributes'] ?? []);

            if (isset($existingByAttributes[$key])) {
                // Update existing variation
                $existingId = $existingByAttributes[$key]['id'];
                $this->wooCommerce->updateVariation($parentId, $existingId, $variationData);
                Log::info('Updated variation', ['parent_id' => $parentId, 'variation_id' => $existingId]);
            } else {
                // Create new variation
                $newVariation = $this->wooCommerce->createVariation($parentId, $variationData);
                if ($newVariation) {
                    Log::info('Created variation', ['parent_id' => $parentId, 'variation_id' => $newVariation['id']]);
                }
            }
        }
    }

    /**
     * Get a unique key for a variation based on its attributes
     */
    protected function getVariationKey(array $attributes): string
    {
        $parts = [];
        foreach ($attributes as $attr) {
            $name = strtolower($attr['name'] ?? $attr['slug'] ?? '');
            $value = strtolower($attr['option'] ?? '');
            $parts[] = "{$name}:{$value}";
        }
        sort($parts);

        return implode('|', $parts);
    }

    /**
     * Normalize attribute name for comparison
     */
    protected function normalizeAttributeName(string $name): string
    {
        return strtolower(trim(str_replace(['pa_', '_', '-'], ['', ' ', ' '], $name)));
    }

    /**
     * Get available product attributes from WooCommerce
     */
    public function getAvailableAttributes(): array
    {
        return $this->wooCommerce->getAttributes();
    }

    /**
     * Get attribute terms
     */
    public function getAttributeTerms(int $attributeId): array
    {
        return $this->wooCommerce->getAttributeTerms($attributeId);
    }

    /**
     * Create or get attribute
     */
    public function ensureAttribute(string $name, string $slug = ''): ?array
    {
        $attributes = $this->wooCommerce->getAttributes();

        foreach ($attributes as $attr) {
            if (strtolower($attr['name']) === strtolower($name)) {
                return $attr;
            }
        }

        // Create new attribute
        return $this->wooCommerce->createAttribute([
            'name' => $name,
            'slug' => $slug ?: sanitize_title($name),
            'type' => 'select',
            'order_by' => 'menu_order',
            'has_archives' => false,
        ]);
    }
}
