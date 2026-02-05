<?php

namespace App\DataTransferObjects;

readonly class OrderDTO
{
    public function __construct(
        public string $id,
        public string $orderNumber,
        public string $currency,
        public float $total,
        public string $status,
        public array $items,
        public array $customer,
        public string $platform = 'woocommerce',
        public ?string $paymentMethod = null,
        public ?string $transactionId = null,
    ) {
    }

    public static function fromWooCommerce(array $data): self
    {
        return new self(
            id: (string) $data['id'],
            orderNumber: $data['number'],
            currency: $data['currency'],
            total: (float) $data['total'],
            status: $data['status'],
            items: $data['line_items'] ?? [],
            customer: [
                'name' => ($data['billing']['first_name'] ?? '') . ' ' . ($data['billing']['last_name'] ?? ''),
                'first_name' => $data['billing']['first_name'] ?? '',
                'last_name' => $data['billing']['last_name'] ?? '',
                'email' => $data['billing']['email'] ?? '',
                'phone' => $data['billing']['phone'] ?? '',
                'address_1' => $data['billing']['address_1'] ?? '',
                'address_2' => $data['billing']['address_2'] ?? '',
                'city' => $data['billing']['city'] ?? '',
                'state' => $data['billing']['state'] ?? '',
                'postcode' => $data['billing']['postcode'] ?? '',
                'country' => $data['billing']['country'] ?? '',
            ],
            platform: 'woocommerce',
            paymentMethod: $data['payment_method_title'] ?? null,
            transactionId: $data['transaction_id'] ?? null,
        );
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'order_number' => $this->orderNumber,
            'currency' => $this->currency,
            'total' => $this->total,
            'status' => $this->status,
            'items' => $this->items,
            'customer' => $this->customer,
            'platform' => $this->platform,
            'payment_method' => $this->paymentMethod,
            'transaction_id' => $this->transactionId,
        ];
    }
}
