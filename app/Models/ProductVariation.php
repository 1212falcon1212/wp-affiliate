<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductVariation extends Model
{
    protected $fillable = [
        'product_id',
        'wc_id',
        'sku',
        'price',
        'regular_price',
        'sale_price',
        'on_sale',
        'stock_quantity',
        'stock_status',
        'manage_stock',
        'weight',
        'dimensions',
        'attributes',
        'image',
        'status',
    ];

    protected $casts = [
        'wc_id' => 'integer',
        'product_id' => 'integer',
        'price' => 'decimal:2',
        'regular_price' => 'decimal:2',
        'sale_price' => 'decimal:2',
        'on_sale' => 'boolean',
        'stock_quantity' => 'integer',
        'manage_stock' => 'boolean',
        'dimensions' => 'array',
        'attributes' => 'array',
    ];

    /**
     * Parent product
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
