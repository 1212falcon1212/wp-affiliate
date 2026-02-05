<?php

namespace App\Services\Order;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Affiliate;
use App\Models\AffiliateCoupon;
use App\Models\AffiliateReferral;
use App\Services\WooCommerce\WooCommerceService;
use App\Contracts\ERPInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

use App\Services\Affiliate\AffiliateService;

class OrderService
{
    public function __construct(
        protected WooCommerceService $wooCommerce,
        protected ERPInterface $erp,
        protected AffiliateService $affiliateService
    ) {
    }

    /**
     * Sync all orders from WooCommerce
     */
    public function syncAll(int $pages = 5): array
    {
        $stats = ['synced' => 0, 'created' => 0, 'updated' => 0, 'errors' => 0];

        for ($page = 1; $page <= $pages; $page++) {
            try {
                $orders = $this->wooCommerce->getOrders($page, 50);

                if (empty($orders)) {
                    break;
                }

                foreach ($orders as $orderDTO) {
                    try {
                        $result = $this->syncOrder($orderDTO->id);
                        if ($result) {
                            $stats['synced']++;
                            $result->wasRecentlyCreated ? $stats['created']++ : $stats['updated']++;
                        }
                    } catch (\Throwable $e) {
                        Log::error("Order sync error for #{$orderDTO->id}: " . $e->getMessage());
                        $stats['errors']++;
                    }
                }
            } catch (\Throwable $e) {
                Log::error("Order page sync error (page {$page}): " . $e->getMessage());
                break;
            }
        }

        return $stats;
    }

    /**
     * Sync single order from WooCommerce
     */
    public function syncOrder(string $wcId): ?Order
    {
        // Fetch full order data from WooCommerce
        $wcOrder = $this->wooCommerce->getOrderRaw($wcId);

        if (!$wcOrder) {
            return null;
        }

        return DB::transaction(function () use ($wcOrder) {
            // Create or update order
            $order = Order::updateOrCreate(
                ['wc_id' => $wcOrder['id']],
                $this->mapOrderData($wcOrder)
            );

            // Sync order items
            $this->syncOrderItems($order, $wcOrder['line_items'] ?? []);

            // Sync affiliate logic
            $this->syncAffiliate($order, $wcOrder);

            return $order;
        });
    }

    /**
     * Sync order from webhook payload
     */
    public function syncFromWebhook(array $payload): ?Order
    {
        if (empty($payload['id'])) {
            Log::warning('Webhook payload missing order ID');
            return null;
        }

        return DB::transaction(function () use ($payload) {
            $order = Order::updateOrCreate(
                ['wc_id' => $payload['id']],
                $this->mapOrderData($payload)
            );

            $this->syncOrderItems($order, $payload['line_items'] ?? []);

            // If new order with status processing/completed, create invoice
            if ($order->wasRecentlyCreated && in_array($order->status, ['processing', 'completed'])) {
                $this->createInvoice($order);
            }

            // Sync affiliate logic
            $this->syncAffiliate($order, $payload);

            return $order;
        });
    }

    /**
     * Map WooCommerce order data to local model
     */
    protected function mapOrderData(array $wcOrder): array
    {
        $billing = $wcOrder['billing'] ?? [];
        $shipping = $wcOrder['shipping'] ?? [];

        // Extract coupon code if any
        $couponCode = null;
        if (!empty($wcOrder['coupon_lines'])) {
            $couponCode = $wcOrder['coupon_lines'][0]['code'] ?? null;
        }

        return [
            'order_number' => $wcOrder['number'] ?? null,
            'status' => $wcOrder['status'] ?? 'pending',
            'currency' => $wcOrder['currency'] ?? 'TRY',
            'total' => $wcOrder['total'] ?? 0,
            'subtotal' => $this->calculateSubtotal($wcOrder['line_items'] ?? []),
            'total_tax' => $wcOrder['total_tax'] ?? 0,
            'shipping_total' => $wcOrder['shipping_total'] ?? 0,
            'discount_total' => $wcOrder['discount_total'] ?? 0,
            'customer_id' => $wcOrder['customer_id'] ?? null,
            'customer_email' => $billing['email'] ?? null,
            'customer_name' => trim(($billing['first_name'] ?? '') . ' ' . ($billing['last_name'] ?? '')),
            'customer_phone' => $billing['phone'] ?? null,
            'billing_address' => $billing,
            'shipping_address' => $shipping,
            'payment_method' => $wcOrder['payment_method'] ?? null,
            'payment_method_title' => $wcOrder['payment_method_title'] ?? null,
            'transaction_id' => $wcOrder['transaction_id'] ?? null,
            'date_created' => isset($wcOrder['date_created']) ? new \DateTime($wcOrder['date_created']) : null,
            'date_paid' => isset($wcOrder['date_paid']) ? new \DateTime($wcOrder['date_paid']) : null,
            'date_completed' => isset($wcOrder['date_completed']) ? new \DateTime($wcOrder['date_completed']) : null,
            'coupon_code' => $couponCode,
            'customer_note' => $wcOrder['customer_note'] ?? null,
            'meta_data' => $wcOrder['meta_data'] ?? null,
            'raw_data' => $wcOrder,
        ];
    }

    /**
     * Calculate subtotal from line items
     */
    protected function calculateSubtotal(array $lineItems): float
    {
        return array_reduce($lineItems, function ($carry, $item) {
            return $carry + (float) ($item['subtotal'] ?? 0);
        }, 0);
    }

    /**
     * Sync order items
     */
    protected function syncOrderItems(Order $order, array $lineItems): void
    {
        // Remove existing items
        $order->items()->delete();

        foreach ($lineItems as $item) {
            OrderItem::create([
                'order_id' => $order->id,
                'wc_item_id' => $item['id'] ?? null,
                'product_id' => $item['product_id'] ?? null,
                'variation_id' => $item['variation_id'] ?? null,
                'name' => $item['name'] ?? 'Unknown',
                'image_url' => $item['image']['src'] ?? null,
                'sku' => $item['sku'] ?? null,
                'quantity' => $item['quantity'] ?? 1,
                'price' => $item['price'] ?? 0,
                'subtotal' => $item['subtotal'] ?? 0,
                'total' => $item['total'] ?? 0,
                'tax' => $item['total_tax'] ?? 0,
                'meta_data' => $item['meta_data'] ?? null,
            ]);
        }
    }

    /**
     * Create invoice in BizimHesap
     */
    public function createInvoice(Order $order): bool
    {
        try {
            $invoiceId = $this->erp->createInvoice($this->orderToDTO($order));

            if ($invoiceId) {
                // Construct BizimHesap Invoice URL
                $invoiceUrl = "https://bizimhesap.com/web/ngn/doc/ngnorder?rc=1&id={$invoiceId}";

                $order->update([
                    'invoice_id' => $invoiceId,
                    'invoice_url' => $invoiceUrl,
                    'invoice_date' => now(),
                ]);

                Log::info("Invoice created for order #{$order->order_number}: {$invoiceId}");
                return true;
            }
        } catch (\Throwable $e) {
            Log::error("Invoice creation failed for order #{$order->order_number}: " . $e->getMessage());
        }

        return false;
    }

    /**
     * Convert Order model to OrderDTO
     */
    protected function orderToDTO(Order $order): \App\DataTransferObjects\OrderDTO
    {
        return new \App\DataTransferObjects\OrderDTO(
            id: (string) $order->wc_id,
            orderNumber: $order->order_number ?? '',
            currency: $order->currency,
            total: (float) $order->total,
            status: $order->status,
            items: $order->items->map(fn($item) => [
                'name' => $item->name,
                'sku' => $item->sku,
                'quantity' => $item->quantity,
                'price' => $item->price,
                'total' => $item->total,
            ])->toArray(),
            customer: [
                'name' => $order->customer_name,
                'email' => $order->customer_email,
                'phone' => $order->customer_phone,
                'address_1' => $order->billing_address['address_1'] ?? '',
                'address_2' => $order->billing_address['address_2'] ?? '',
                'city' => $order->billing_address['city'] ?? '',
                'state' => $order->billing_address['state'] ?? '',
                'postcode' => $order->billing_address['postcode'] ?? '',
                'country' => $order->billing_address['country'] ?? '',
            ],
            platform: 'woocommerce',
            paymentMethod: $order->payment_method_title,
            transactionId: $order->transaction_id
        );
    }

    /**
     * Fetch orders from WooCommerce (for auto-pilot)
     */
    public function fetchFromWooCommerce(int $page = 1, int $perPage = 50): array
    {
        $stats = ['synced' => 0, 'total' => 0, 'errors' => 0];

        try {
            $orders = $this->wooCommerce->getOrders($page, $perPage, [
                'after' => now()->subDays(7)->toIso8601String(), // Last 7 days
            ]);

            $stats['total'] = count($orders);

            foreach ($orders as $orderDTO) {
                try {
                    $this->syncOrder($orderDTO->id);
                    $stats['synced']++;
                } catch (\Throwable $e) {
                    Log::error("Order fetch sync error: " . $e->getMessage());
                    $stats['errors']++;
                }
            }
        } catch (\Throwable $e) {
            Log::error("Order fetch from WooCommerce failed: " . $e->getMessage());
        }

        return $stats;
    }

    /**
     * Get order statistics
     */
    public function getStats(): array
    {
        return [
            'total' => Order::count(),
            'pending' => Order::where('status', 'pending')->count(),
            'processing' => Order::where('status', 'processing')->count(),
            'completed' => Order::where('status', 'completed')->count(),
            'cancelled' => Order::where('status', 'cancelled')->count(),
            'total_revenue' => Order::whereIn('status', ['completed', 'processing'])->sum('total'),
            'today_orders' => Order::whereDate('date_created', today())->count(),
            'today_revenue' => Order::whereDate('date_created', today())
                ->whereIn('status', ['completed', 'processing'])
                ->sum('total'),
        ];
    }

    /**
     * Sync affiliate commission from order coupons
     */
    protected function syncAffiliate(Order $order, array $wcOrder): void
    {
        // We rely on the primary coupon code mapped to the Order model.
        // If the order has a coupon, AffiliateService will check if it belongs to an affiliate.
        if (!empty($order->coupon_code)) {
            $this->affiliateService->processOrderForCommission($order);
        }
    }
}
