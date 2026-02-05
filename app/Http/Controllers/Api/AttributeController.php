<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\WooCommerce\WooCommerceService;
use Illuminate\Http\Request;

class AttributeController extends Controller
{
    protected WooCommerceService $woocommerce;

    public function __construct(WooCommerceService $woocommerce)
    {
        $this->woocommerce = $woocommerce;
    }

    /**
     * Tüm ürün özelliklerini listele
     */
    public function index()
    {
        $attributes = $this->woocommerce->getAttributes();

        return response()->json([
            'success' => true,
            'data' => $attributes,
        ]);
    }

    /**
     * Tekil özellik detayı
     */
    public function show(int $id)
    {
        $attribute = $this->woocommerce->getAttribute($id);

        if (!$attribute) {
            return response()->json([
                'success' => false,
                'message' => 'Özellik bulunamadı',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $attribute,
        ]);
    }

    /**
     * Yeni özellik oluştur
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255',
            'type' => 'nullable|in:select,text',
            'order_by' => 'nullable|in:menu_order,name,name_num,id',
            'has_archives' => 'nullable|boolean',
        ]);

        $attribute = $this->woocommerce->createAttribute($validated);

        if (!$attribute) {
            return response()->json([
                'success' => false,
                'message' => 'Özellik oluşturulamadı',
            ], 500);
        }

        return response()->json([
            'success' => true,
            'data' => $attribute,
            'message' => 'Özellik başarıyla oluşturuldu',
        ], 201);
    }

    /**
     * Özellik güncelle
     */
    public function update(Request $request, int $id)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'slug' => 'nullable|string|max:255',
            'type' => 'nullable|in:select,text',
            'order_by' => 'nullable|in:menu_order,name,name_num,id',
            'has_archives' => 'nullable|boolean',
        ]);

        $attribute = $this->woocommerce->updateAttribute($id, $validated);

        if (!$attribute) {
            return response()->json([
                'success' => false,
                'message' => 'Özellik güncellenemedi',
            ], 500);
        }

        return response()->json([
            'success' => true,
            'data' => $attribute,
            'message' => 'Özellik başarıyla güncellendi',
        ]);
    }

    /**
     * Özellik sil
     */
    public function destroy(int $id)
    {
        $success = $this->woocommerce->deleteAttribute($id);

        if (!$success) {
            return response()->json([
                'success' => false,
                'message' => 'Özellik silinemedi',
            ], 500);
        }

        return response()->json([
            'success' => true,
            'message' => 'Özellik başarıyla silindi',
        ]);
    }

    // ==========================================
    // ATTRIBUTE TERMS
    // ==========================================

    /**
     * Özelliğin terimlerini listele
     */
    public function terms(int $attributeId)
    {
        $terms = $this->woocommerce->getAttributeTerms($attributeId);

        return response()->json([
            'success' => true,
            'data' => $terms,
        ]);
    }

    /**
     * Yeni terim oluştur
     */
    public function storeTerm(Request $request, int $attributeId)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'menu_order' => 'nullable|integer',
        ]);

        $term = $this->woocommerce->createAttributeTerm($attributeId, $validated);

        if (!$term) {
            return response()->json([
                'success' => false,
                'message' => 'Terim oluşturulamadı',
            ], 500);
        }

        return response()->json([
            'success' => true,
            'data' => $term,
            'message' => 'Terim başarıyla oluşturuldu',
        ], 201);
    }

    /**
     * Terim güncelle
     */
    public function updateTerm(Request $request, int $attributeId, int $termId)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'slug' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'menu_order' => 'nullable|integer',
        ]);

        $term = $this->woocommerce->updateAttributeTerm($attributeId, $termId, $validated);

        if (!$term) {
            return response()->json([
                'success' => false,
                'message' => 'Terim güncellenemedi',
            ], 500);
        }

        return response()->json([
            'success' => true,
            'data' => $term,
            'message' => 'Terim başarıyla güncellendi',
        ]);
    }

    /**
     * Terim sil
     */
    public function destroyTerm(int $attributeId, int $termId)
    {
        $success = $this->woocommerce->deleteAttributeTerm($attributeId, $termId);

        if (!$success) {
            return response()->json([
                'success' => false,
                'message' => 'Terim silinemedi',
            ], 500);
        }

        return response()->json([
            'success' => true,
            'message' => 'Terim başarıyla silindi',
        ]);
    }
}
