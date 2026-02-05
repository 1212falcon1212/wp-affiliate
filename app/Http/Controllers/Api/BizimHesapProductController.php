<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\FetchBizimHesapProductsJob;
use App\Jobs\PushProductToWooCommerceJob;
use App\Models\BizimHesapProduct;
use App\Models\BizimHesapSyncJob;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class BizimHesapProductController extends Controller
{
    /**
     * List all BizimHesap products
     */
    public function index(Request $request): JsonResponse
    {
        $query = BizimHesapProduct::query();

        // Search
        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%")
                    ->orWhere('barcode', 'like', "%{$search}%");
            });
        }

        // Filter by sync status
        if ($status = $request->get('sync_status')) {
            $query->where('sync_status', $status);
        }

        // Filter by category
        if ($category = $request->get('category')) {
            $query->where('category', $category);
        }

        $products = $query->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 20));

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
     * Get product details
     */
    public function show(int $id): JsonResponse
    {
        $product = BizimHesapProduct::findOrFail($id);

        return response()->json([
            'data' => $product,
        ]);
    }

    /**
     * Get statistics
     */
    public function stats(): JsonResponse
    {
        return response()->json([
            'data' => [
                'total' => BizimHesapProduct::count(),
                'pending' => BizimHesapProduct::where('sync_status', 'pending')->count(),
                'synced' => BizimHesapProduct::where('sync_status', 'synced')->count(),
                'failed' => BizimHesapProduct::where('sync_status', 'failed')->count(),
                'last_fetch' => BizimHesapSyncJob::where('type', 'fetch')
                    ->where('status', 'completed')
                    ->latest()
                    ->first()?->completed_at,
                'last_push' => BizimHesapSyncJob::where('type', 'push')
                    ->where('status', 'completed')
                    ->latest()
                    ->first()?->completed_at,
            ],
        ]);
    }

    /**
     * Fetch products from BizimHesap
     */
    public function fetch(Request $request): JsonResponse
    {
        // Check if there's already a running fetch job
        $runningJob = BizimHesapSyncJob::where('type', 'fetch')
            ->whereIn('status', ['pending', 'processing'])
            ->first();

        if ($runningJob) {
            return response()->json([
                'message' => 'Zaten devam eden bir çekme işlemi var',
                'job' => $runningJob,
            ], 409);
        }

        // Create sync job record
        $syncJob = BizimHesapSyncJob::create([
            'type' => 'fetch',
            'status' => 'pending',
            'started_at' => now(),
        ]);

        // Run synchronously for now (can change to dispatch for queue)
        try {
            FetchBizimHesapProductsJob::dispatchSync($syncJob->id);

            $syncJob->refresh();

            return response()->json([
                'message' => 'Ürünler başarıyla çekildi',
                'job' => $syncJob,
                'stats' => [
                    'total' => BizimHesapProduct::count(),
                    'new' => $syncJob->success_count,
                    'errors' => $syncJob->error_count,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error("BizimHesap fetch failed", ['error' => $e->getMessage()]);

            $syncJob->update([
                'status' => 'failed',
                'error_log' => [$e->getMessage()],
                'completed_at' => now(),
            ]);

            return response()->json([
                'message' => 'Ürün çekme işlemi başarısız: ' . $e->getMessage(),
                'job' => $syncJob,
            ], 500);
        }
    }

    /**
     * Push selected products to WooCommerce
     */
    public function push(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_ids' => 'required|array|min:1',
            'product_ids.*' => 'exists:bizimhesap_products,id',
        ]);

        $productIds = $validated['product_ids'];

        // Create sync job
        $syncJob = BizimHesapSyncJob::create([
            'type' => 'push',
            'status' => 'processing',
            'total_items' => count($productIds),
            'processed_items' => 0,
            'started_at' => now(),
        ]);

        // Queue each product with delay to avoid overwhelming WooCommerce
        foreach ($productIds as $index => $productId) {
            PushProductToWooCommerceJob::dispatch($productId, $syncJob->id)
                ->delay(now()->addSeconds($index)); // 1 second delay between each
        }

        Log::info("Queued {$syncJob->total_items} products for WooCommerce push", [
            'sync_job_id' => $syncJob->id,
        ]);

        return response()->json([
            'message' => "{$syncJob->total_items} ürün kuyruğa alındı, worker ile işlenecek",
            'job' => $syncJob,
        ]);
    }

    /**
     * Push all pending products to WooCommerce
     */
    public function pushAll(): JsonResponse
    {
        $pendingProducts = BizimHesapProduct::where('sync_status', 'pending')
            ->orWhere('sync_status', 'failed')
            ->get();

        if ($pendingProducts->isEmpty()) {
            return response()->json([
                'message' => 'Gönderilecek ürün bulunamadı',
            ]);
        }

        // Create sync job
        $syncJob = BizimHesapSyncJob::create([
            'type' => 'push',
            'status' => 'processing',
            'total_items' => $pendingProducts->count(),
            'processed_items' => 0,
            'started_at' => now(),
        ]);

        // Queue each product with delay to avoid overwhelming WooCommerce
        foreach ($pendingProducts->values() as $index => $product) {
            PushProductToWooCommerceJob::dispatch($product->id, $syncJob->id)
                ->delay(now()->addSeconds($index)); // 1 second delay between each
        }

        Log::info("Queued all pending products for WooCommerce push", [
            'sync_job_id' => $syncJob->id,
            'count' => $pendingProducts->count(),
        ]);

        return response()->json([
            'message' => "{$pendingProducts->count()} ürün kuyruğa alındı, worker ile işlenecek",
            'job' => $syncJob,
        ]);
    }

    /**
     * Get sync job status
     */
    public function syncJobStatus(int $id): JsonResponse
    {
        $job = BizimHesapSyncJob::findOrFail($id);

        return response()->json([
            'data' => $job,
        ]);
    }

    /**
     * List sync jobs
     */
    public function syncJobs(Request $request): JsonResponse
    {
        $query = BizimHesapSyncJob::query();

        if ($type = $request->get('type')) {
            $query->where('type', $type);
        }

        $jobs = $query->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 10));

        return response()->json([
            'data' => $jobs->items(),
            'meta' => [
                'current_page' => $jobs->currentPage(),
                'last_page' => $jobs->lastPage(),
                'per_page' => $jobs->perPage(),
                'total' => $jobs->total(),
            ],
        ]);
    }

    /**
     * Reset failed products to pending
     */
    public function resetFailed(): JsonResponse
    {
        $count = BizimHesapProduct::where('sync_status', 'failed')
            ->update([
                'sync_status' => 'pending',
                'sync_error' => null,
            ]);

        return response()->json([
            'message' => "{$count} başarısız ürün sıfırlandı",
            'reset_count' => $count,
        ]);
    }
}
