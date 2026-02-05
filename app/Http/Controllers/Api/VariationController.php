<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductVariation;
use App\Services\WooCommerce\WooCommerceService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class VariationController extends Controller
{
    protected WooCommerceService $woocommerce;

    public function __construct(WooCommerceService $woocommerce)
    {
        $this->woocommerce = $woocommerce;
    }

    /**
     * Ürünün varyasyonlarını listele
     */
    public function index(int $productId)
    {
        $product = Product::with('variations')->findOrFail($productId);

        return response()->json([
            'success' => true,
            'data' => $product->variations,
            'product' => [
                'id' => $product->id,
                'name' => $product->name,
                'type' => $product->type,
            ],
        ]);
    }

    /**
     * Tekil varyasyon detayı
     */
    public function show(int $productId, int $variationId)
    {
        $variation = ProductVariation::where('product_id', $productId)
            ->where('id', $variationId)
            ->first();

        if (!$variation) {
            return response()->json([
                'success' => false,
                'message' => 'Varyasyon bulunamadı',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $variation,
        ]);
    }

    /**
     * Yeni varyasyon oluştur
     */
    public function store(Request $request, int $productId)
    {
        $product = Product::findOrFail($productId);

        if (!$product->commerce_id) {
            return response()->json([
                'success' => false,
                'message' => 'Ürün WooCommerce ile senkronize değil',
            ], 400);
        }

        $validated = $request->validate([
            'sku' => 'nullable|string|max:255',
            'regular_price' => 'required|numeric|min:0',
            'sale_price' => 'nullable|numeric|min:0',
            'stock_quantity' => 'nullable|integer|min:0',
            'manage_stock' => 'nullable|boolean',
            'stock_status' => 'nullable|in:instock,outofstock,onbackorder',
            'weight' => 'nullable|string',
            'dimensions' => 'nullable|array',
            'attributes' => 'required|array',
            'attributes.*.name' => 'required|string',
            'attributes.*.option' => 'required|string',
        ]);

        // WooCommerce'da varyasyon oluştur
        $wcData = [
            'sku' => $validated['sku'] ?? '',
            'regular_price' => (string) $validated['regular_price'],
            'manage_stock' => $validated['manage_stock'] ?? true,
            'stock_quantity' => $validated['stock_quantity'] ?? 0,
            'stock_status' => $validated['stock_status'] ?? 'instock',
            'attributes' => $validated['attributes'],
        ];

        if (isset($validated['sale_price'])) {
            $wcData['sale_price'] = (string) $validated['sale_price'];
        }

        if (isset($validated['weight'])) {
            $wcData['weight'] = $validated['weight'];
        }

        if (isset($validated['dimensions'])) {
            $wcData['dimensions'] = $validated['dimensions'];
        }

        $wcVariation = $this->woocommerce->createVariation((int) $product->commerce_id, $wcData);

        if (!$wcVariation) {
            return response()->json([
                'success' => false,
                'message' => 'WooCommerce varyasyon oluşturulamadı',
            ], 500);
        }

        // Local DB'ye kaydet
        $variation = ProductVariation::create([
            'product_id' => $product->id,
            'wc_id' => $wcVariation['id'],
            'sku' => $wcVariation['sku'] ?? null,
            'price' => (float) ($wcVariation['price'] ?? 0),
            'regular_price' => (float) ($wcVariation['regular_price'] ?? 0),
            'sale_price' => !empty($wcVariation['sale_price']) ? (float) $wcVariation['sale_price'] : null,
            'on_sale' => $wcVariation['on_sale'] ?? false,
            'stock_quantity' => $wcVariation['stock_quantity'] ?? null,
            'stock_status' => $wcVariation['stock_status'] ?? 'instock',
            'manage_stock' => $wcVariation['manage_stock'] ?? false,
            'weight' => $wcVariation['weight'] ?? null,
            'dimensions' => $wcVariation['dimensions'] ?? null,
            'attributes' => $wcVariation['attributes'] ?? [],
            'image' => $wcVariation['image']['src'] ?? null,
            'status' => $wcVariation['status'] ?? 'publish',
        ]);

        return response()->json([
            'success' => true,
            'data' => $variation,
            'message' => 'Varyasyon başarıyla oluşturuldu',
        ], 201);
    }

    /**
     * Varyasyon güncelle
     */
    public function update(Request $request, int $productId, int $variationId)
    {
        $product = Product::findOrFail($productId);
        $variation = ProductVariation::where('product_id', $productId)
            ->where('id', $variationId)
            ->firstOrFail();

        if (!$product->commerce_id || !$variation->wc_id) {
            return response()->json([
                'success' => false,
                'message' => 'WooCommerce senkronizasyonu eksik',
            ], 400);
        }

        $validated = $request->validate([
            'sku' => 'nullable|string|max:255',
            'regular_price' => 'sometimes|numeric|min:0',
            'sale_price' => 'nullable|numeric|min:0',
            'stock_quantity' => 'nullable|integer|min:0',
            'manage_stock' => 'nullable|boolean',
            'stock_status' => 'nullable|in:instock,outofstock,onbackorder',
            'weight' => 'nullable|string',
            'dimensions' => 'nullable|array',
            'attributes' => 'nullable|array',
            'status' => 'nullable|in:publish,private',
        ]);

        // WooCommerce update data hazırla
        $wcData = [];

        if (isset($validated['sku'])) {
            $wcData['sku'] = $validated['sku'];
        }
        if (isset($validated['regular_price'])) {
            $wcData['regular_price'] = (string) $validated['regular_price'];
        }
        if (array_key_exists('sale_price', $validated)) {
            $wcData['sale_price'] = $validated['sale_price'] ? (string) $validated['sale_price'] : '';
        }
        if (isset($validated['stock_quantity'])) {
            $wcData['stock_quantity'] = $validated['stock_quantity'];
        }
        if (isset($validated['manage_stock'])) {
            $wcData['manage_stock'] = $validated['manage_stock'];
        }
        if (isset($validated['stock_status'])) {
            $wcData['stock_status'] = $validated['stock_status'];
        }
        if (isset($validated['weight'])) {
            $wcData['weight'] = $validated['weight'];
        }
        if (isset($validated['dimensions'])) {
            $wcData['dimensions'] = $validated['dimensions'];
        }
        if (isset($validated['attributes'])) {
            $wcData['attributes'] = $validated['attributes'];
        }
        if (isset($validated['status'])) {
            $wcData['status'] = $validated['status'];
        }

        // WooCommerce'da güncelle
        $wcVariation = $this->woocommerce->updateVariation(
            (int) $product->commerce_id,
            $variation->wc_id,
            $wcData
        );

        if (!$wcVariation) {
            return response()->json([
                'success' => false,
                'message' => 'WooCommerce varyasyon güncellenemedi',
            ], 500);
        }

        // Local DB güncelle
        $variation->update([
            'sku' => $wcVariation['sku'] ?? $variation->sku,
            'price' => (float) ($wcVariation['price'] ?? $variation->price),
            'regular_price' => (float) ($wcVariation['regular_price'] ?? $variation->regular_price),
            'sale_price' => !empty($wcVariation['sale_price']) ? (float) $wcVariation['sale_price'] : null,
            'on_sale' => $wcVariation['on_sale'] ?? $variation->on_sale,
            'stock_quantity' => $wcVariation['stock_quantity'] ?? $variation->stock_quantity,
            'stock_status' => $wcVariation['stock_status'] ?? $variation->stock_status,
            'manage_stock' => $wcVariation['manage_stock'] ?? $variation->manage_stock,
            'weight' => $wcVariation['weight'] ?? $variation->weight,
            'dimensions' => $wcVariation['dimensions'] ?? $variation->dimensions,
            'attributes' => $wcVariation['attributes'] ?? $variation->attributes,
            'status' => $wcVariation['status'] ?? $variation->status,
        ]);

        return response()->json([
            'success' => true,
            'data' => $variation->fresh(),
            'message' => 'Varyasyon başarıyla güncellendi',
        ]);
    }

    /**
     * Varyasyon sil
     */
    public function destroy(int $productId, int $variationId)
    {
        $product = Product::findOrFail($productId);
        $variation = ProductVariation::where('product_id', $productId)
            ->where('id', $variationId)
            ->firstOrFail();

        // WooCommerce'dan sil
        if ($product->commerce_id && $variation->wc_id) {
            $success = $this->woocommerce->deleteVariation(
                (int) $product->commerce_id,
                $variation->wc_id,
                true // force delete
            );

            if (!$success) {
                return response()->json([
                    'success' => false,
                    'message' => 'WooCommerce varyasyon silinemedi',
                ], 500);
            }
        }

        // Local DB'den sil
        $variation->delete();

        return response()->json([
            'success' => true,
            'message' => 'Varyasyon başarıyla silindi',
        ]);
    }

    /**
     * Toplu varyasyon güncelle (stok/fiyat)
     */
    public function batchUpdate(Request $request, int $productId)
    {
        $product = Product::findOrFail($productId);

        if (!$product->commerce_id) {
            return response()->json([
                'success' => false,
                'message' => 'Ürün WooCommerce ile senkronize değil',
            ], 400);
        }

        $validated = $request->validate([
            'variations' => 'required|array',
            'variations.*.id' => 'required|integer',
            'variations.*.regular_price' => 'nullable|numeric|min:0',
            'variations.*.sale_price' => 'nullable|numeric|min:0',
            'variations.*.stock_quantity' => 'nullable|integer|min:0',
            'variations.*.stock_status' => 'nullable|in:instock,outofstock,onbackorder',
        ]);

        $updateData = [];
        foreach ($validated['variations'] as $var) {
            $localVariation = ProductVariation::where('product_id', $productId)
                ->where('id', $var['id'])
                ->first();

            if ($localVariation && $localVariation->wc_id) {
                $data = ['id' => $localVariation->wc_id];

                if (isset($var['regular_price'])) {
                    $data['regular_price'] = (string) $var['regular_price'];
                }
                if (array_key_exists('sale_price', $var)) {
                    $data['sale_price'] = $var['sale_price'] ? (string) $var['sale_price'] : '';
                }
                if (isset($var['stock_quantity'])) {
                    $data['stock_quantity'] = $var['stock_quantity'];
                }
                if (isset($var['stock_status'])) {
                    $data['stock_status'] = $var['stock_status'];
                }

                $updateData[] = $data;
            }
        }

        if (empty($updateData)) {
            return response()->json([
                'success' => false,
                'message' => 'Güncellenecek varyasyon bulunamadı',
            ], 400);
        }

        $result = $this->woocommerce->updateVariationsBatch((int) $product->commerce_id, [
            'update' => $updateData,
        ]);

        if (empty($result)) {
            return response()->json([
                'success' => false,
                'message' => 'Toplu güncelleme başarısız',
            ], 500);
        }

        // Local DB güncelle
        foreach ($result['update'] ?? [] as $wcVar) {
            ProductVariation::where('wc_id', $wcVar['id'])->update([
                'price' => (float) ($wcVar['price'] ?? 0),
                'regular_price' => (float) ($wcVar['regular_price'] ?? 0),
                'sale_price' => !empty($wcVar['sale_price']) ? (float) $wcVar['sale_price'] : null,
                'stock_quantity' => $wcVar['stock_quantity'] ?? null,
                'stock_status' => $wcVar['stock_status'] ?? 'instock',
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => count($updateData) . ' varyasyon başarıyla güncellendi',
        ]);
    }
}
