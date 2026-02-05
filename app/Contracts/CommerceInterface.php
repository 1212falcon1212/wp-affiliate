<?php

namespace App\Contracts;

use App\DataTransferObjects\OrderDTO;
use App\DataTransferObjects\ProductDTO;

interface CommerceInterface
{
    /**
     * @return ProductDTO[]
     */
    public function getProducts(int $page = 1, int $limit = 10): array;

    /**
     * @return OrderDTO[]
     */
    public function getOrders(int $page = 1, int $limit = 10, array $filters = []): array;

    public function getProduct(string $id): ?ProductDTO;

    public function getOrder(string $id): ?OrderDTO;

    public function syncStock(string $sku, int $quantity): bool;

    public function updateProductsBatch(array $data): array;
}
