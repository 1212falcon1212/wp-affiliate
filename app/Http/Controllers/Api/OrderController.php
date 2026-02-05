<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\SyncOrdersJob;
use App\Models\Order;
use App\Services\Order\OrderService;
use App\Services\WooCommerce\WooCommerceService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class OrderController extends Controller
{
    public function __construct(
        protected OrderService $orderService,
        protected WooCommerceService $woocommerce
    ) {
    }

    /**
     * Siparişleri listele (pagination)
     */
    public function index(Request $request): JsonResponse
    {
        $query = Order::with('items');

        // Arama (sipariş no veya müşteri)
        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('order_number', 'like', "%{$search}%")
                    ->orWhere('customer_name', 'like', "%{$search}%")
                    ->orWhere('customer_email', 'like', "%{$search}%");
            });
        }

        // Durum filtresi
        if ($status = $request->get('status')) {
            $query->where('status', $status);
        }

        // Tarih filtresi
        if ($dateFrom = $request->get('date_from')) {
            $query->whereDate('date_created', '>=', $dateFrom);
        }
        if ($dateTo = $request->get('date_to')) {
            $query->whereDate('date_created', '<=', $dateTo);
        }

        // Sıralama
        $sortBy = $request->get('sort_by', 'date_created');
        $sortDir = $request->get('sort_dir', 'desc');
        $query->orderBy($sortBy, $sortDir);

        $orders = $query->paginate($request->get('per_page', 20));

        return response()->json([
            'data' => $orders->items(),
            'meta' => [
                'current_page' => $orders->currentPage(),
                'last_page' => $orders->lastPage(),
                'per_page' => $orders->perPage(),
                'total' => $orders->total(),
            ],
        ]);
    }

    /**
     * Tekil sipariş detayı
     */
    public function show(int $id): JsonResponse
    {
        $order = Order::with('items')->findOrFail($id);

        return response()->json([
            'data' => $order,
        ]);
    }

    /**
     * Sipariş durumunu güncelle
     */
    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'status' => 'required|string|in:pending,processing,on-hold,completed,cancelled,refunded,failed',
        ]);

        $order = Order::findOrFail($id);
        $oldStatus = $order->status;
        $newStatus = $request->input('status');

        // Update in WooCommerce first
        $wcUpdated = $this->woocommerce->updateOrderStatus((string) $order->wc_id, $newStatus);

        if (!$wcUpdated) {
            return response()->json([
                'message' => 'WooCommerce güncelleme hatası',
            ], 500);
        }

        // Update local
        $order->update(['status' => $newStatus]);

        // If status changed to completed and no invoice, create invoice
        if ($newStatus === 'completed' && !$order->hasInvoice()) {
            $this->orderService->createInvoice($order);
        }

        return response()->json([
            'message' => 'Sipariş durumu güncellendi',
            'data' => $order->fresh(),
        ]);
    }

    /**
     * Sipariş istatistikleri
     */
    public function stats(): JsonResponse
    {
        return response()->json([
            'data' => $this->orderService->getStats(),
        ]);
    }

    /**
     * WooCommerce'den siparişleri çek
     */
    public function fetch(Request $request): JsonResponse
    {
        $pages = $request->input('pages', 5);

        // Run sync
        $stats = $this->orderService->syncAll($pages);

        return response()->json([
            'message' => 'Sipariş senkronizasyonu tamamlandı',
            'stats' => $stats,
        ]);
    }

    /**
     * Tekil siparişi senkronize et
     */
    public function sync(int $id): JsonResponse
    {
        $order = Order::findOrFail($id);

        $synced = $this->orderService->syncOrder((string) $order->wc_id);

        if (!$synced) {
            return response()->json([
                'message' => 'Sipariş senkronizasyonu başarısız',
            ], 500);
        }

        return response()->json([
            'message' => 'Sipariş senkronize edildi',
            'data' => $synced,
        ]);
    }

    /**
     * Fatura oluştur
     */
    public function createInvoice(int $id): JsonResponse
    {
        $order = Order::findOrFail($id);

        if ($order->hasInvoice()) {
            return response()->json([
                'message' => 'Bu sipariş için zaten fatura kesilmiş',
                'invoice_id' => $order->invoice_id,
            ], 400);
        }

        $success = $this->orderService->createInvoice($order);

        if (!$success) {
            return response()->json([
                'message' => 'Fatura oluşturma hatası',
            ], 500);
        }

        return response()->json([
            'message' => 'Fatura oluşturuldu',
            'data' => $order->fresh(['items']),
        ]);
    }
}
