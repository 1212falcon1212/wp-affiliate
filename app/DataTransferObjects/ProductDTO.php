<?php

namespace App\DataTransferObjects;

readonly class ProductDTO
{
    public function __construct(
        public string $id,
        public string $name,
        public string $sku,
        public float $price,
        public int $stockQuantity,
        public bool $manageStock,
        public string $status,
        public string $platform = 'woocommerce',
    ) {
    }

    public static function fromWooCommerce(array $data): self
    {
        return new self(
            id: (string) $data['id'],
            name: $data['name'],
            sku: $data['sku'],
            price: (float) ($data['price'] ?: 0),
            stockQuantity: (int) ($data['stock_quantity'] ?? 0),
            manageStock: (bool) ($data['manage_stock'] ?? false),
            status: $data['status'],
            platform: 'woocommerce',
        );
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'sku' => $this->sku,
            'price' => $this->price,
            'stock_quantity' => $this->stockQuantity,
            'manage_stock' => $this->manageStock,
            'status' => $this->status,
            'platform' => $this->platform,
        ];
    }
}
