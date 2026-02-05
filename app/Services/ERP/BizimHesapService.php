<?php

namespace App\Services\ERP;

use App\Contracts\ERPInterface;
use App\DataTransferObjects\OrderDTO;
use App\DataTransferObjects\ProductDTO;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class BizimHesapService implements ERPInterface
{
    protected string $baseUrl = 'https://bizimhesap.com/api/b2b';
    protected ?string $apiKey;
    protected ?string $apiToken;
    protected ?string $firmId;
    protected float $taxRate = 20.0;

    public function __construct()
    {
        // Try to get from DB first, fallback to config
        $settings = \App\Models\Setting::where('group', 'bizimhesap')->pluck('value', 'key');

        $this->apiKey = $settings['api_key'] ?? config('services.bizimhesap.key');

        // User indicates Token and FirmID might be same as Key. Fallback if missing.
        $this->apiToken = $settings['api_secret'] ?? config('services.bizimhesap.token');
        if (empty($this->apiToken)) {
            $this->apiToken = $this->apiKey;
        }

        $this->firmId = $settings['firm_id'] ?? config('services.bizimhesap.firm_id');
        if (empty($this->firmId)) {
            $this->firmId = $this->apiKey;
        }

        $this->taxRate = (float) ($settings['tax_rate'] ?? 20.0);

        if (isset($settings['base_url'])) {
            $this->baseUrl = rtrim($settings['base_url'], '/');
        }
    }

    /**
     * Fetch products from BizimHesap API - returns raw data for full storage
     */
    public function fetchProductsRaw(): array
    {
        if (empty($this->apiKey)) {
            Log::warning("BizimHesap API Key not found. Skipping ERP fetch.");
            return [];
        }

        try {
            $key = $this->firmId ?: $this->apiKey;
            $token = $this->apiKey;

            Log::info("BizimHesap fetching products (raw)", [
                'url' => "{$this->baseUrl}/products",
            ]);

            $response = Http::withHeaders([
                'Key' => $key,
                'Token' => $token,
            ])->get("{$this->baseUrl}/products");

            if ($response->failed()) {
                Log::error("BizimHesap fetchProductsRaw failed: " . $response->body());
                return [];
            }

            $json = $response->json();
            $data = $json['data']['products'] ?? $json['data'] ?? $json['products'] ?? $json ?? [];

            if (!is_array($data) || empty($data)) {
                Log::info("BizimHesap returned empty product list");
                return [];
            }

            Log::info("BizimHesap found " . count($data) . " products (raw)");

            return $data;

        } catch (\Exception $e) {
            Log::error("BizimHesap fetchProductsRaw Error: " . $e->getMessage());
            return [];
        }
    }

    public function fetchFromERP(int $page = 1, int $limit = 50): array
    {
        if (empty($this->apiKey)) {
            Log::warning("BizimHesap API Key not found. Skipping ERP fetch.");
            return [];
        }

        // BizimHesap B2B API - GET request with Key and Token headers
        // Docs: https://bizimhesap.com/api/b2b/products
        // Headers: Key (Required), Token (Required)
        // Note: Key = firmId, Token = apiKey (based on working invoice implementation)
        try {
            // Based on invoice working: firmId is the identifier, apiKey might be the token
            $key = $this->firmId ?: $this->apiKey;
            $token = $this->apiKey;

            Log::info("BizimHesap fetching products", [
                'url' => "{$this->baseUrl}/products",
                'key' => substr($key, 0, 8) . '...',
                'token' => substr($token, 0, 8) . '...',
            ]);

            $response = Http::withHeaders([
                'Key' => $key,
                'Token' => $token,
            ])->get("{$this->baseUrl}/products");

            Log::info("BizimHesap products response", [
                'status' => $response->status(),
                'body' => substr($response->body(), 0, 500),
            ]);

            if ($response->failed()) {
                Log::error("BizimHesap fetchFromERP failed: " . $response->body());
                return [];
            }

            $json = $response->json();

            // Response structure: { resultCode, errorText, data: { products: [...] } }
            $data = $json['data']['products'] ?? $json['data'] ?? $json['products'] ?? $json ?? [];

            if (!is_array($data) || empty($data)) {
                Log::info("BizimHesap returned empty product list");
                return [];
            }

            Log::info("BizimHesap found " . count($data) . " products");

            // Transform to ProductDTOs
            return array_map(function ($item) {
                // Get SKU from code, barcode, or generate from id
                $sku = $item['code'] ?? $item['sku'] ?? $item['barcode'] ?? null;
                if (empty($sku)) {
                    $sku = 'BH-' . ($item['id'] ?? uniqid());
                }

                return new ProductDTO(
                    id: (string) ($item['id'] ?? $item['guid'] ?? uniqid()),
                    name: $item['title'] ?? $item['name'] ?? $item['productName'] ?? 'Unnamed',
                    sku: (string) $sku,
                    price: (float) ($item['price'] ?? $item['salePrice'] ?? $item['sale_price'] ?? 0),
                    stockQuantity: (int) ($item['quantity'] ?? $item['stock'] ?? 0),
                    manageStock: true,
                    status: 'publish',
                    platform: 'bizimhesap'
                );
            }, $data);

        } catch (\Exception $e) {
            Log::error("BizimHesap Code Error: " . $e->getMessage());
            return [];
        }
    }

    public function syncProduct(ProductDTO $product): string
    {
        Log::info("Syncing product to BizimHesap: " . $product->sku);
        return "mock-erp-id-{$product->sku}";
    }

    public function createInvoice(OrderDTO $order): string
    {
        if (empty($this->apiKey) || empty($this->firmId)) {
            Log::error("BizimHesap credentials missing for invoice creation (Firm ID or API Key).");
            return '';
        }

        $payload = $this->prepareInvoicePayload($order);

        Log::info("Sending Invoice to BizimHesap", ['payload' => $payload]);

        try {
            $response = Http::post("{$this->baseUrl}/addinvoice", $payload);

            if ($response->successful()) {
                $result = $response->json();
                if (!empty($result['guid'])) {
                    Log::info("BizimHesap Invoice Created: " . $result['guid']);
                    return $result['guid'];
                }
                if (!empty($result['error'])) {
                    Log::error("BizimHesap API Error: " . $result['error']);
                }
            } else {
                Log::error("BizimHesap Request Failed: " . $response->body());
            }
        } catch (\Exception $e) {
            Log::error("BizimHesap Exception: " . $e->getMessage());
        }

        return '';
    }

    protected function prepareInvoicePayload(OrderDTO $order): array
    {
        $date = now()->toIso8601String();

        $details = array_map(function ($item) {
            // WooCommerce price is treated as Tax Inclusive (Total)
            $total = (float) $item['price'] * (int) $item['quantity'];

            // Calculate Net backward from Total
            // Total = Net * (1 + TaxRate/100) => Net = Total / (1 + TaxRate/100)
            $taxFactor = 1 + ($this->taxRate / 100);

            $net = $total / $taxFactor;
            $tax = $total - $net;

            $unitNet = ((float) $item['price']) / $taxFactor;

            return [
                'productName' => $item['name'],
                'quantity' => (int) $item['quantity'],
                'unitPrice' => number_format($unitNet, 2, '.', ''), // Net Unit Price
                'grossPrice' => number_format($net, 2, '.', ''),    // Net Line Total (BizimHesap uses 'grossPrice' as line net often, but let's check doc)
                // Wait, doc says: GrossPrice = Amount * UnitPrice. Net = Discounted Gross.
                // Let's assume standard flow: UnitPrice(Net) * Qty = Gross -> -Discount = Net + Tax = Total
                'net' => number_format($net, 2, '.', ''),
                'taxRate' => number_format($this->taxRate, 2, '.', ''),
                'total' => number_format($total, 2, '.', '')
            ];
        }, $order->items);

        $totalNet = array_sum(array_map(fn($d) => (float) $d['net'], $details));
        $totalTax = array_sum(array_map(fn($d) => (float) $d['total'], $details)) - $totalNet;
        $totalAmount = $totalNet + $totalTax;

        return [
            'firmId' => $this->firmId,
            'invoiceNo' => (string) $order->orderNumber,
            'invoiceType' => 3, // Satış Faturası
            'note' => "WooCommerce Siparis #" . $order->orderNumber,
            'dates' => [
                'invoiceDate' => $date,
                'dueDate' => $date,
                'deliveryDate' => $date
            ],
            'customer' => [
                'title' => $order->customer['name'] ?: 'Misafir Müşteri',
                'email' => $order->customer['email'] ?? '',
                'phone' => $order->customer['phone'] ?? '',
                'address' => trim(implode(' ', [
                    $order->customer['address_1'] ?? '',
                    $order->customer['address_2'] ?? '',
                    $order->customer['postcode'] ?? '',
                    $order->customer['city'] ?? '',
                    $order->customer['state'] ?? '',
                    $order->customer['country'] ?? ''
                ])) ?: 'Adres bilgisi mevcut degil'
            ],
            'amounts' => [
                'currency' => $order->currency ?: 'TL',
                'gross' => number_format($totalNet, 2, '.', ''), // Gross is usually pre-discount total. If 0 discount, it's Net.
                'discount' => '0.00',
                'net' => number_format($totalNet, 2, '.', ''),
                'tax' => number_format($totalTax, 2, '.', ''),
                'total' => number_format($totalAmount, 2, '.', '')
            ],
            'details' => $details
        ];
    }

    public function checkStock(string $sku): int
    {
        // Mock check for now, can be implemented with list product service
        return 100;
    }
}
