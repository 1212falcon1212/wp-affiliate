<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Jobs\SyncProductsJob;
use App\Models\Product;
use App\Services\WooCommerce\WooCommerceService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ProductController extends Controller
{
    protected WooCommerceService $woocommerce;

    public function __construct(WooCommerceService $woocommerce)
    {
        $this->woocommerce = $woocommerce;
    }

    /**
     * Ürünleri listele (pagination)
     */
    public function index(Request $request)
    {
        $query = Product::with(['images', 'categories', 'brands']);

        // Arama
        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%");
            });
        }

        // Kategori filtresi
        if ($categoryId = $request->get('category_id')) {
            $query->whereHas('categories', fn($q) => $q->where('categories.id', $categoryId));
        }

        // Durum filtresi
        if ($status = $request->get('status')) {
            $query->where('status', $status);
        }

        // Stok durumu filtresi
        if ($stockStatus = $request->get('stock_status')) {
            $query->where('stock_status', $stockStatus);
        }

        // Sıralama
        $sortBy = $request->get('sort_by', 'updated_at');
        $sortDir = $request->get('sort_dir', 'desc');
        $query->orderBy($sortBy, $sortDir);

        $products = $query->paginate($request->get('per_page', 20));

        return ProductResource::collection($products);
    }

    /**
     * Tekil ürün detayı
     */
    public function show(int $id)
    {
        $product = Product::with(['images', 'categories', 'brands', 'variations'])
            ->findOrFail($id);

        return new ProductResource($product);
    }

    /**
     * Ürün güncelle (WooCommerce sync)
     */
    public function update(Request $request, int $id)
    {
        $product = Product::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'sometimes|string',
            'short_description' => 'sometimes|string',
            'regular_price' => 'sometimes|numeric|min:0',
            'sale_price' => 'nullable|numeric|min:0',
            'stock' => 'sometimes|integer|min:0',
            'manage_stock' => 'sometimes|boolean',
            'stock_status' => 'sometimes|in:instock,outofstock,onbackorder',
            'status' => 'sometimes|in:publish,draft,private,pending',
            'featured' => 'sometimes|boolean',
            'catalog_visibility' => 'sometimes|in:visible,catalog,search,hidden',
            'weight' => 'nullable|string',
            'sku' => 'sometimes|string|max:255',
        ]);

        // WooCommerce'a senkronize et
        if ($product->commerce_id) {
            $wcData = [];

            if (isset($validated['name']))
                $wcData['name'] = $validated['name'];
            if (isset($validated['description']))
                $wcData['description'] = $validated['description'];
            if (isset($validated['short_description']))
                $wcData['short_description'] = $validated['short_description'];
            if (isset($validated['regular_price']))
                $wcData['regular_price'] = (string) $validated['regular_price'];
            if (array_key_exists('sale_price', $validated)) {
                $wcData['sale_price'] = $validated['sale_price'] ? (string) $validated['sale_price'] : '';
            }
            if (isset($validated['stock'])) {
                $wcData['stock_quantity'] = $validated['stock'];
                $wcData['manage_stock'] = true;
            }
            if (isset($validated['manage_stock']))
                $wcData['manage_stock'] = $validated['manage_stock'];
            if (isset($validated['stock_status']))
                $wcData['stock_status'] = $validated['stock_status'];
            if (isset($validated['status']))
                $wcData['status'] = $validated['status'];
            if (isset($validated['featured']))
                $wcData['featured'] = $validated['featured'];
            if (isset($validated['catalog_visibility']))
                $wcData['catalog_visibility'] = $validated['catalog_visibility'];
            if (isset($validated['weight']))
                $wcData['weight'] = $validated['weight'];
            if (isset($validated['sku']))
                $wcData['sku'] = $validated['sku'];

            $wcResult = $this->woocommerce->updateProduct((int) $product->commerce_id, $wcData);

            if (!$wcResult) {
                return response()->json([
                    'success' => false,
                    'message' => 'WooCommerce güncelleme başarısız',
                ], 500);
            }

            Log::info("Product {$id} synced to WooCommerce", ['wc_id' => $product->commerce_id]);
        }

        // Local DB güncelle
        $product->update($validated);

        return response()->json([
            'success' => true,
            'data' => new ProductResource($product->fresh(['images', 'categories', 'brands'])),
            'message' => 'Ürün başarıyla güncellendi',
        ]);
    }

    /**
     * Sadece fiyat güncelle (WooCommerce sync)
     */
    public function updatePrice(Request $request, int $id)
    {
        $product = Product::findOrFail($id);

        $validated = $request->validate([
            'regular_price' => 'required|numeric|min:0',
            'sale_price' => 'nullable|numeric|min:0',
        ]);

        if (!$product->commerce_id) {
            return response()->json([
                'success' => false,
                'message' => 'Ürün WooCommerce ile senkronize değil',
            ], 400);
        }

        $wcResult = $this->woocommerce->updatePrice(
            (int) $product->commerce_id,
            $validated['regular_price'],
            $validated['sale_price'] ?? null
        );

        if (!$wcResult) {
            return response()->json([
                'success' => false,
                'message' => 'WooCommerce fiyat güncelleme başarısız',
            ], 500);
        }

        // Local DB güncelle
        $product->update([
            'regular_price' => $validated['regular_price'],
            'sale_price' => $validated['sale_price'] ?? null,
            'price' => $validated['sale_price'] ?? $validated['regular_price'],
            'on_sale' => !empty($validated['sale_price']),
        ]);

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $product->id,
                'regular_price' => $product->regular_price,
                'sale_price' => $product->sale_price,
                'price' => $product->price,
            ],
            'message' => 'Fiyat başarıyla güncellendi',
        ]);
    }

    /**
     * Sadece stok güncelle (WooCommerce sync)
     */
    public function updateStock(Request $request, int $id)
    {
        $product = Product::findOrFail($id);

        $validated = $request->validate([
            'stock' => 'required|integer|min:0',
            'stock_status' => 'nullable|in:instock,outofstock,onbackorder',
        ]);

        if (!$product->commerce_id) {
            return response()->json([
                'success' => false,
                'message' => 'Ürün WooCommerce ile senkronize değil',
            ], 400);
        }

        $wcResult = $this->woocommerce->updateStock(
            (int) $product->commerce_id,
            $validated['stock']
        );

        if (!$wcResult) {
            return response()->json([
                'success' => false,
                'message' => 'WooCommerce stok güncelleme başarısız',
            ], 500);
        }

        // Stok durumunu belirle
        $stockStatus = $validated['stock_status'] ?? ($validated['stock'] > 0 ? 'instock' : 'outofstock');

        // Local DB güncelle
        $product->update([
            'stock' => $validated['stock'],
            'stock_status' => $stockStatus,
            'manage_stock' => true,
        ]);

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $product->id,
                'stock' => $product->stock,
                'stock_status' => $product->stock_status,
            ],
            'message' => 'Stok başarıyla güncellendi',
        ]);
    }

    /**
     * Toplu stok güncelle
     */
    public function batchStock(Request $request)
    {
        $validated = $request->validate([
            'products' => 'required|array',
            'products.*.id' => 'required|integer|exists:products,id',
            'products.*.stock' => 'required|integer|min:0',
        ]);

        $updateData = [];
        $localUpdates = [];

        foreach ($validated['products'] as $item) {
            $product = Product::find($item['id']);
            if ($product && $product->commerce_id) {
                $updateData[] = [
                    'id' => (int) $product->commerce_id,
                    'manage_stock' => true,
                    'stock_quantity' => $item['stock'],
                ];
                $localUpdates[$product->id] = $item['stock'];
            }
        }

        if (empty($updateData)) {
            return response()->json([
                'success' => false,
                'message' => 'Güncellenecek ürün bulunamadı',
            ], 400);
        }

        $result = $this->woocommerce->updateProductsBatch($updateData);

        if (empty($result)) {
            return response()->json([
                'success' => false,
                'message' => 'WooCommerce toplu güncelleme başarısız',
            ], 500);
        }

        // Local DB toplu güncelle
        foreach ($localUpdates as $productId => $stock) {
            Product::where('id', $productId)->update([
                'stock' => $stock,
                'stock_status' => $stock > 0 ? 'instock' : 'outofstock',
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => count($localUpdates) . ' ürün stoğu güncellendi',
        ]);
    }

    /**
     * Ürün senkronizasyonu başlat
     */
    public function fetch(Request $request)
    {
        Log::info('Fetch Products request received via API.');

        try {
            // Sync modunda çalıştır (queue worker gerektirmez)
            SyncProductsJob::dispatchSync();
            Log::info('SyncProductsJob completed successfully.');

            $count = \App\Models\Product::count();

            return response()->json([
                'success' => true,
                'message' => "Ürün senkronizasyonu tamamlandı. {$count} ürün mevcut.",
                'status' => 'completed',
                'product_count' => $count
            ]);
        } catch (\Exception $e) {
            Log::error('Error in SyncProductsJob: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Senkronizasyon logları
     */
    public function syncLogs()
    {
        $logs = DB::table('sync_logs')
            ->orderByDesc('created_at')
            ->limit(100)
            ->get();

        return response()->json([
            'success' => true,
            'data' => $logs,
        ]);
    }

    /**
     * Ürün istatistikleri
     */
    public function stats()
    {
        return response()->json([
            'total_products' => Product::count(),
            'published' => Product::where('status', 'publish')->count(),
            'draft' => Product::where('status', 'draft')->count(),
            'in_stock' => Product::where('stock_status', 'instock')->count(),
            'out_of_stock' => Product::where('stock_status', 'outofstock')->count(),
            'low_stock' => Product::where('stock', '<', 10)->where('stock', '>', 0)->count(),
            'on_sale' => Product::where('on_sale', true)->count(),
        ]);
    }

    /**
     * Basit ürünü değişken ürüne çevir
     */
    public function convertToVariable(int $id)
    {
        $product = Product::findOrFail($id);

        if ($product->type === 'variable') {
            return response()->json([
                'success' => false,
                'message' => 'Ürün zaten değişken türünde',
            ], 400);
        }

        if (!$product->commerce_id) {
            return response()->json([
                'success' => false,
                'message' => 'Ürün WooCommerce ile senkronize değil',
            ], 400);
        }

        // WooCommerce'da ürün türünü değiştir
        $wcResult = $this->woocommerce->updateProduct((int) $product->commerce_id, [
            'type' => 'variable',
        ]);

        if (!$wcResult) {
            return response()->json([
                'success' => false,
                'message' => 'WooCommerce güncelleme başarısız',
            ], 500);
        }

        // Local DB güncelle
        $product->update(['type' => 'variable']);

        Log::info("Product {$id} converted to variable", ['wc_id' => $product->commerce_id]);

        return response()->json([
            'success' => true,
            'data' => new ProductResource($product->fresh(['images', 'categories', 'brands', 'variations'])),
            'message' => 'Ürün değişken türüne dönüştürüldü',
        ]);
    }
}
