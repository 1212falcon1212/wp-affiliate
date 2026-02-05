<?php

namespace App\Services\WooCommerce;

use App\Contracts\CommerceInterface;
use App\DataTransferObjects\OrderDTO;
use App\DataTransferObjects\ProductDTO;
use Automattic\WooCommerce\Client;
use Illuminate\Support\Facades\Log;

class WooCommerceService implements CommerceInterface
{
    protected Client $client;

    public function __construct()
    {
        $this->client = new Client(
            config('services.woocommerce.url'),
            config('services.woocommerce.key'),
            config('services.woocommerce.secret'),
            [
                'version' => 'wc/v3',
                'verify_ssl' => config('app.env') === 'production',
            ]
        );
    }

    // ==========================================
    // PRODUCTS - READ
    // ==========================================

    public function getProducts(int $page = 1, int $limit = 10): array
    {
        $results = $this->client->get('products', [
            'page' => $page,
            'per_page' => $limit,
        ]);

        $rows = json_decode(json_encode($results), true);

        return array_map(fn ($item) => ProductDTO::fromWooCommerce($item), $rows);
    }

    public function getProductsRaw(int $page = 1, int $limit = 10): array
    {
        $results = $this->client->get('products', [
            'page' => $page,
            'per_page' => $limit,
        ]);

        return json_decode(json_encode($results), true) ?? [];
    }

    public function getProduct(string $id): ?ProductDTO
    {
        try {
            $data = $this->client->get("products/{$id}");

            return ProductDTO::fromWooCommerce((array) $data);
        } catch (\Throwable $e) {
            Log::error('WooCommerce getProduct error: '.$e->getMessage());

            return null;
        }
    }

    public function getProductRaw(int $id): ?array
    {
        try {
            $result = $this->client->get("products/{$id}");

            return json_decode(json_encode($result), true);
        } catch (\Throwable $e) {
            Log::error('WooCommerce getProductRaw error: '.$e->getMessage());

            return null;
        }
    }

    /**
     * Get product by SKU
     * Returns the first product matching the SKU, or null if not found
     */
    public function getProductBySku(string $sku): ?array
    {
        try {
            $results = $this->client->get('products', ['sku' => $sku]);
            $products = json_decode(json_encode($results), true) ?? [];

            if (empty($products)) {
                return null;
            }

            return $products[0];
        } catch (\Throwable $e) {
            Log::error('WooCommerce getProductBySku error: '.$e->getMessage());

            return null;
        }
    }

    // ==========================================
    // PRODUCTS - CREATE, UPDATE, DELETE
    // ==========================================

    public function createProduct(array $data): ?array
    {
        try {
            $result = $this->client->post('products', $data);

            return json_decode(json_encode($result), true);
        } catch (\Throwable $e) {
            Log::error('WooCommerce createProduct error: '.$e->getMessage());

            return null;
        }
    }

    public function updateProduct(int $id, array $data): ?array
    {
        try {
            $result = $this->client->put("products/{$id}", $data);

            return json_decode(json_encode($result), true);
        } catch (\Throwable $e) {
            Log::error('WooCommerce updateProduct error: '.$e->getMessage());

            return null;
        }
    }

    public function deleteProduct(int $id, bool $force = false): bool
    {
        try {
            $this->client->delete("products/{$id}", ['force' => $force]);

            return true;
        } catch (\Throwable $e) {
            Log::error('WooCommerce deleteProduct error: '.$e->getMessage());

            return false;
        }
    }

    public function updateProductsBatch(array $data): array
    {
        try {
            $response = $this->client->post('products/batch', [
                'update' => $data,
            ]);

            return json_decode(json_encode($response), true) ?? [];
        } catch (\Throwable $e) {
            Log::error('WooCommerce batch update error: '.$e->getMessage());

            return [];
        }
    }

    // ==========================================
    // PRODUCT VARIATIONS
    // ==========================================

    public function getVariations(int $productId): array
    {
        try {
            $results = $this->client->get("products/{$productId}/variations", [
                'per_page' => 100,
            ]);

            return json_decode(json_encode($results), true) ?? [];
        } catch (\Throwable $e) {
            Log::error("WooCommerce getVariations error for product {$productId}: ".$e->getMessage());

            return [];
        }
    }

    public function getVariation(int $productId, int $variationId): ?array
    {
        try {
            $result = $this->client->get("products/{$productId}/variations/{$variationId}");

            return json_decode(json_encode($result), true);
        } catch (\Throwable $e) {
            Log::error('WooCommerce getVariation error: '.$e->getMessage());

            return null;
        }
    }

    public function createVariation(int $productId, array $data): ?array
    {
        try {
            $result = $this->client->post("products/{$productId}/variations", $data);

            return json_decode(json_encode($result), true);
        } catch (\Throwable $e) {
            Log::error('WooCommerce createVariation error: '.$e->getMessage());

            return null;
        }
    }

    public function updateVariation(int $productId, int $variationId, array $data): ?array
    {
        try {
            $result = $this->client->put("products/{$productId}/variations/{$variationId}", $data);

            return json_decode(json_encode($result), true);
        } catch (\Throwable $e) {
            Log::error('WooCommerce updateVariation error: '.$e->getMessage());

            return null;
        }
    }

    public function deleteVariation(int $productId, int $variationId, bool $force = false): bool
    {
        try {
            $this->client->delete("products/{$productId}/variations/{$variationId}", ['force' => $force]);

            return true;
        } catch (\Throwable $e) {
            Log::error('WooCommerce deleteVariation error: '.$e->getMessage());

            return false;
        }
    }

    public function updateVariationsBatch(int $productId, array $data): array
    {
        try {
            $response = $this->client->post("products/{$productId}/variations/batch", $data);

            return json_decode(json_encode($response), true) ?? [];
        } catch (\Throwable $e) {
            Log::error('WooCommerce variations batch error: '.$e->getMessage());

            return [];
        }
    }

    // ==========================================
    // PRODUCT ATTRIBUTES
    // ==========================================

    public function getAttributes(): array
    {
        try {
            $results = $this->client->get('products/attributes');

            return json_decode(json_encode($results), true) ?? [];
        } catch (\Throwable $e) {
            Log::error('WooCommerce getAttributes error: '.$e->getMessage());

            return [];
        }
    }

    public function getAttribute(int $id): ?array
    {
        try {
            $result = $this->client->get("products/attributes/{$id}");

            return json_decode(json_encode($result), true);
        } catch (\Throwable $e) {
            Log::error('WooCommerce getAttribute error: '.$e->getMessage());

            return null;
        }
    }

    public function createAttribute(array $data): ?array
    {
        try {
            $result = $this->client->post('products/attributes', $data);

            return json_decode(json_encode($result), true);
        } catch (\Throwable $e) {
            Log::error('WooCommerce createAttribute error: '.$e->getMessage());

            return null;
        }
    }

    public function updateAttribute(int $id, array $data): ?array
    {
        try {
            $result = $this->client->put("products/attributes/{$id}", $data);

            return json_decode(json_encode($result), true);
        } catch (\Throwable $e) {
            Log::error('WooCommerce updateAttribute error: '.$e->getMessage());

            return null;
        }
    }

    public function deleteAttribute(int $id): bool
    {
        try {
            $this->client->delete("products/attributes/{$id}");

            return true;
        } catch (\Throwable $e) {
            Log::error('WooCommerce deleteAttribute error: '.$e->getMessage());

            return false;
        }
    }

    // ==========================================
    // ATTRIBUTE TERMS
    // ==========================================

    public function getAttributeTerms(int $attributeId): array
    {
        try {
            $results = $this->client->get("products/attributes/{$attributeId}/terms", [
                'per_page' => 100,
            ]);

            return json_decode(json_encode($results), true) ?? [];
        } catch (\Throwable $e) {
            Log::error('WooCommerce getAttributeTerms error: '.$e->getMessage());

            return [];
        }
    }

    public function createAttributeTerm(int $attributeId, array $data): ?array
    {
        try {
            $result = $this->client->post("products/attributes/{$attributeId}/terms", $data);

            return json_decode(json_encode($result), true);
        } catch (\Throwable $e) {
            Log::error('WooCommerce createAttributeTerm error: '.$e->getMessage());

            return null;
        }
    }

    public function updateAttributeTerm(int $attributeId, int $termId, array $data): ?array
    {
        try {
            $result = $this->client->put("products/attributes/{$attributeId}/terms/{$termId}", $data);

            return json_decode(json_encode($result), true);
        } catch (\Throwable $e) {
            Log::error('WooCommerce updateAttributeTerm error: '.$e->getMessage());

            return null;
        }
    }

    public function deleteAttributeTerm(int $attributeId, int $termId): bool
    {
        try {
            $this->client->delete("products/attributes/{$attributeId}/terms/{$termId}");

            return true;
        } catch (\Throwable $e) {
            Log::error('WooCommerce deleteAttributeTerm error: '.$e->getMessage());

            return false;
        }
    }

    // ==========================================
    // PRODUCT CATEGORIES
    // ==========================================

    public function getCategories(int $page = 1, int $limit = 100): array
    {
        try {
            $results = $this->client->get('products/categories', [
                'page' => $page,
                'per_page' => $limit,
            ]);

            return json_decode(json_encode($results), true) ?? [];
        } catch (\Throwable $e) {
            Log::error('WooCommerce getCategories error: '.$e->getMessage());

            return [];
        }
    }

    public function createCategory(array $data): ?array
    {
        try {
            $result = $this->client->post('products/categories', $data);

            return json_decode(json_encode($result), true);
        } catch (\Throwable $e) {
            Log::error('WooCommerce createCategory error: '.$e->getMessage());

            return null;
        }
    }

    public function updateCategory(int $id, array $data): ?array
    {
        try {
            $result = $this->client->put("products/categories/{$id}", $data);

            return json_decode(json_encode($result), true);
        } catch (\Throwable $e) {
            Log::error('WooCommerce updateCategory error: '.$e->getMessage());

            return null;
        }
    }

    // ==========================================
    // PRODUCT TAGS
    // ==========================================

    public function getTags(int $page = 1, int $limit = 100): array
    {
        try {
            $results = $this->client->get('products/tags', [
                'page' => $page,
                'per_page' => $limit,
            ]);

            return json_decode(json_encode($results), true) ?? [];
        } catch (\Throwable $e) {
            Log::error('WooCommerce getTags error: '.$e->getMessage());

            return [];
        }
    }

    public function createTag(array $data): ?array
    {
        try {
            $result = $this->client->post('products/tags', $data);

            return json_decode(json_encode($result), true);
        } catch (\Throwable $e) {
            Log::error('WooCommerce createTag error: '.$e->getMessage());

            return null;
        }
    }

    // ==========================================
    // ORDERS
    // ==========================================

    public function getOrders(int $page = 1, int $limit = 10, array $filters = []): array
    {
        $params = array_merge([
            'page' => $page,
            'per_page' => $limit,
        ], $filters);

        $results = $this->client->get('orders', $params);

        $rows = json_decode(json_encode($results), true);

        return array_map(fn ($item) => OrderDTO::fromWooCommerce($item), $rows);
    }

    public function getOrder(string $id): ?OrderDTO
    {
        try {
            $data = $this->client->get("orders/{$id}");

            return OrderDTO::fromWooCommerce((array) $data);
        } catch (\Throwable $e) {
            Log::error('WooCommerce getOrder error: '.$e->getMessage());

            return null;
        }
    }

    public function getOrderRaw(string $id): ?array
    {
        try {
            $data = $this->client->get("orders/{$id}");

            return json_decode(json_encode($data), true);
        } catch (\Throwable $e) {
            Log::error('WooCommerce getOrderRaw error: '.$e->getMessage());

            return null;
        }
    }

    public function updateOrderStatus(string $id, string $status): bool
    {
        try {
            $this->client->put("orders/{$id}", ['status' => $status]);

            return true;
        } catch (\Throwable $e) {
            Log::error('WooCommerce updateOrderStatus error: '.$e->getMessage());

            return false;
        }
    }

    // ==========================================
    // STOCK SYNC
    // ==========================================

    public function syncStock(string $sku, int $quantity): bool
    {
        $products = (array) $this->client->get('products', ['sku' => $sku]);

        if (empty($products)) {
            Log::warning("WooCommerce syncStock: Product not found for SKU: {$sku}");

            return false;
        }

        $product = $products[0];
        $id = $product->id;

        try {
            $this->client->put("products/{$id}", [
                'manage_stock' => true,
                'stock_quantity' => $quantity,
            ]);

            return true;
        } catch (\Throwable $e) {
            Log::error('WooCommerce syncStock error: '.$e->getMessage());

            return false;
        }
    }

    public function updateStock(int $wcId, int $quantity): ?array
    {
        return $this->updateProduct($wcId, [
            'manage_stock' => true,
            'stock_quantity' => $quantity,
        ]);
    }

    public function updatePrice(int $wcId, float $regularPrice, ?float $salePrice = null): ?array
    {
        $data = ['regular_price' => (string) $regularPrice];

        if ($salePrice !== null) {
            $data['sale_price'] = (string) $salePrice;
        }

        return $this->updateProduct($wcId, $data);
    }

    // ==========================================
    // COUPONS
    // ==========================================

    public function getCoupons(int $page = 1, int $limit = 10): array
    {
        $results = (array) $this->client->get('coupons', [
            'page' => $page,
            'per_page' => $limit,
        ]);

        return array_map(fn ($item) => (array) $item, $results);
    }

    public function getCoupon(int $id): ?array
    {
        try {
            $data = $this->client->get("coupons/{$id}");

            return (array) $data;
        } catch (\Throwable $e) {
            Log::error('WooCommerce getCoupon error: '.$e->getMessage());

            return null;
        }
    }

    public function getCouponByCode(string $code): ?array
    {
        try {
            $results = (array) $this->client->get('coupons', ['code' => $code]);

            return ! empty($results) ? (array) $results[0] : null;
        } catch (\Throwable $e) {
            Log::error('WooCommerce getCouponByCode error: '.$e->getMessage());

            return null;
        }
    }

    public function createCoupon(array $data): array
    {
        try {
            $result = $this->client->post('coupons', $data);

            return (array) $result;
        } catch (\Throwable $e) {
            Log::error('WooCommerce createCoupon error: '.$e->getMessage());
            throw $e;
        }
    }

    public function updateCoupon(int $id, array $data): ?array
    {
        try {
            $result = $this->client->put("coupons/{$id}", $data);

            return (array) $result;
        } catch (\Throwable $e) {
            Log::error('WooCommerce updateCoupon error: '.$e->getMessage());

            return null;
        }
    }

    public function deleteCoupon(int $id, bool $force = true): bool
    {
        try {
            $this->client->delete("coupons/{$id}", ['force' => $force]);

            return true;
        } catch (\Throwable $e) {
            Log::error('WooCommerce deleteCoupon error: '.$e->getMessage());

            return false;
        }
    }
}
