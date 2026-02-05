<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductImage extends Model
{
    protected $fillable = [
        'product_id',
        'wc_id',
        'src',
        'name',
        'alt',
        'position',
        'is_featured',
        'thumbnail',
    ];

    protected $casts = [
        'wc_id' => 'integer',
        'product_id' => 'integer',
        'position' => 'integer',
        'is_featured' => 'boolean',
    ];

    /**
     * Parent product
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
