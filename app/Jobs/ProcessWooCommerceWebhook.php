<?php

namespace App\Jobs;

use App\Services\Order\OrderService;
use App\Services\Sync\ProductSyncService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Spatie\WebhookClient\Jobs\ProcessWebhookJob as SpatieProcessWebhookJob;

class ProcessWooCommerceWebhook extends SpatieProcessWebhookJob implements ShouldQueue
{
    use Queueable;

    public function handle()
    {
        $payload = $this->webhookCall->payload;
        $headers = $this->webhookCall->headers ?? [];

        // Get webhook topic from headers
        $topic = $headers['x-wc-webhook-topic'] ?? $this->detectTopic($payload);

        Log::info("Processing WooCommerce Webhook", [
            'id' => $this->webhookCall->id,
            'topic' => $topic,
        ]);

        match (true) {
            str_starts_with($topic, 'order.') => $this->handleOrder($topic, $payload),
            str_starts_with($topic, 'product.') => $this->handleProduct($topic, $payload),
            default => Log::info("Unhandled webhook topic: {$topic}"),
        };
    }

    /**
     * Detect topic from payload structure
     */
    protected function detectTopic(array $payload): string
    {
        if (isset($payload['number']) && isset($payload['line_items'])) {
            return 'order.unknown';
        }

        if (isset($payload['sku']) && isset($payload['type'])) {
            return 'product.unknown';
        }

        return 'unknown';
    }

    /**
     * Handle order webhooks
     */
    protected function handleOrder(string $topic, array $payload): void
    {
        $orderService = app(OrderService::class);

        try {
            $order = $orderService->syncFromWebhook($payload);

            if ($order) {
                Log::info("Order synced from webhook", [
                    'order_id' => $order->id,
                    'order_number' => $order->order_number,
                    'status' => $order->status,
                    'topic' => $topic,
                ]);
            }
        } catch (\Exception $e) {
            Log::error("Order webhook processing failed", [
                'topic' => $topic,
                'error' => $e->getMessage(),
                'payload_id' => $payload['id'] ?? null,
            ]);
        }
    }

    /**
     * Handle product webhooks
     */
    protected function handleProduct(string $topic, array $payload): void
    {
        $productService = app(ProductSyncService::class);

        try {
            if ($topic === 'product.deleted') {
                // Handle product deletion
                Log::info("Product deleted webhook received", ['product_id' => $payload['id'] ?? null]);
                return;
            }

            // For created/updated products, sync from WooCommerce
            if (isset($payload['id'])) {
                Log::info("Product webhook received, triggering sync", [
                    'product_id' => $payload['id'],
                    'topic' => $topic,
                ]);
            }
        } catch (\Exception $e) {
            Log::error("Product webhook processing failed", [
                'topic' => $topic,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
