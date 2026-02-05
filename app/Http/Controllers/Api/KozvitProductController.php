<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\KozvitProduct;
use App\Services\Import\KozvitImportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class KozvitProductController extends Controller
{
    public function __construct(
        protected KozvitImportService $importService
    ) {}

    /**
     * Get statistics
     */
    public function stats(): JsonResponse
    {
        return response()->json([
            'total' => KozvitProduct::count(),
            'pending' => KozvitProduct::pending()->count(),
            'synced' => KozvitProduct::synced()->count(),
            'failed' => KozvitProduct::failed()->count(),
        ]);
    }

    /**
     * List products with filtering and pagination
     */
    public function index(Request $request): JsonResponse
    {
        $query = KozvitProduct::query();

        // Filters
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('barcode', 'like', "%{$search}%")
                    ->orWhere('brand', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status')) {
            $query->where('sync_status', $request->status);
        }

        if ($request->filled('brand')) {
            $query->where('brand', $request->brand);
        }

        if ($request->filled('main_category')) {
            $query->where('main_category', $request->main_category);
        }

        // Sorting
        $sortBy = $request->get('sort_by', 'created_at');
        $sortDir = $request->get('sort_dir', 'desc');
        $query->orderBy($sortBy, $sortDir);

        // Pagination
        $perPage = min($request->get('per_page', 20), 100);
        $products = $query->paginate($perPage);

        return response()->json([
            'data' => $products->items(),
            'meta' => [
                'current_page' => $products->currentPage(),
                'last_page' => $products->lastPage(),
                'per_page' => $products->perPage(),
                'total' => $products->total(),
            ],
        ]);
    }

    /**
     * Show single product
     */
    public function show(int $id): JsonResponse
    {
        $product = KozvitProduct::findOrFail($id);

        return response()->json(['data' => $product]);
    }

    /**
     * Push single product to WooCommerce
     */
    public function push(int $id): JsonResponse
    {
        $product = KozvitProduct::findOrFail($id);

        $result = $this->importService->pushToWooCommerce($product);

        if ($result['success']) {
            return response()->json([
                'success' => true,
                'message' => 'Ürün WooCommerce\'e gönderildi',
                'wc_id' => $result['wc_id'],
                'action' => $result['action'],
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => 'WooCommerce gönderimi başarısız',
            'error' => $result['error'],
        ], 400);
    }

    /**
     * Push multiple products to WooCommerce
     */
    public function pushBatch(Request $request): JsonResponse
    {
        $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'integer|exists:kozvit_products,id',
        ]);

        $results = $this->importService->pushBatchToWooCommerce($request->ids);

        return response()->json([
            'success' => true,
            'total' => $results['total'],
            'pushed' => $results['success'],
            'failed' => $results['failed'],
            'details' => $results['details'],
        ]);
    }

    /**
     * Push all pending products to WooCommerce
     */
    public function pushAllPending(Request $request): JsonResponse
    {
        $limit = min($request->get('limit', 50), 200);

        $pendingIds = KozvitProduct::pending()
            ->limit($limit)
            ->pluck('id')
            ->toArray();

        if (empty($pendingIds)) {
            return response()->json([
                'success' => true,
                'message' => 'Bekleyen ürün yok',
                'total' => 0,
            ]);
        }

        $results = $this->importService->pushBatchToWooCommerce($pendingIds);

        $remainingPending = KozvitProduct::pending()->count();

        return response()->json([
            'success' => true,
            'total' => $results['total'],
            'pushed' => $results['success'],
            'failed' => $results['failed'],
            'remaining_pending' => $remainingPending,
            'details' => $results['details'],
        ]);
    }

    /**
     * Reset failed products to pending
     */
    public function resetFailed(): JsonResponse
    {
        $count = KozvitProduct::failed()->update([
            'sync_status' => KozvitProduct::STATUS_PENDING,
            'sync_error' => null,
        ]);

        return response()->json([
            'success' => true,
            'reset_count' => $count,
        ]);
    }

    /**
     * Get unique brands
     */
    public function brands(): JsonResponse
    {
        $brands = KozvitProduct::whereNotNull('brand')
            ->distinct()
            ->pluck('brand')
            ->sort()
            ->values();

        return response()->json(['data' => $brands]);
    }

    /**
     * Get unique categories
     */
    public function categories(): JsonResponse
    {
        $mainCategories = KozvitProduct::whereNotNull('main_category')
            ->distinct()
            ->pluck('main_category')
            ->sort()
            ->values();

        $subCategories = KozvitProduct::whereNotNull('sub_category')
            ->distinct()
            ->pluck('sub_category')
            ->sort()
            ->values();

        return response()->json([
            'main_categories' => $mainCategories,
            'sub_categories' => $subCategories,
        ]);
    }

    /**
     * Delete a product
     */
    public function destroy(int $id): JsonResponse
    {
        $product = KozvitProduct::findOrFail($id);
        $product->delete();

        return response()->json([
            'success' => true,
            'message' => 'Ürün silindi',
        ]);
    }

    /**
     * Update a product
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $product = KozvitProduct::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'brand' => 'sometimes|nullable|string|max:255',
            'price' => 'sometimes|numeric|min:0',
            'description' => 'sometimes|nullable|string',
            'image_url' => 'sometimes|nullable|url',
        ]);

        // If product is updated and was synced, mark as pending for re-sync
        if ($product->sync_status === KozvitProduct::STATUS_SYNCED) {
            $validated['sync_status'] = KozvitProduct::STATUS_PENDING;
        }

        $product->update($validated);

        return response()->json([
            'success' => true,
            'data' => $product->fresh(),
        ]);
    }
}
