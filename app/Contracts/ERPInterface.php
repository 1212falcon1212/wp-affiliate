<?php

namespace App\Contracts;

use App\DataTransferObjects\ProductDTO;
use App\DataTransferObjects\OrderDTO;

interface ERPInterface
{
    public function syncProduct(ProductDTO $product): string; // Returns ERP ID

    public function createInvoice(OrderDTO $order): string; // Returns Invoice ID

    public function checkStock(string $sku): int;
}
