<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderItem extends Model
{
    protected $fillable = [
        'order_id',
        'wc_item_id',
        'product_id',
        'variation_id',
        'name',
        'image_url',
        'sku',
        'quantity',
        'price',
        'subtotal',
        'total',
        'tax',
        'meta_data',
    ];

    protected $casts = [
        'meta_data' => 'array',
        'price' => 'decimal:2',
        'subtotal' => 'decimal:2',
        'total' => 'decimal:2',
        'tax' => 'decimal:2',
    ];

    /**
     * Parent order
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /**
     * Related product
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id', 'commerce_id');
    }

    /**
     * Related variation
     */
    public function variation(): BelongsTo
    {
        return $this->belongsTo(ProductVariation::class, 'variation_id', 'wc_id');
    }
}
