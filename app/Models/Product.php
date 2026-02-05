<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    protected $fillable = [
        'erp_id',
        'commerce_id',
        'sku',
        'name',
        'slug',
        'permalink',
        'type',
        'status',
        'featured',
        'catalog_visibility',
        'description',
        'short_description',
        'price',
        'regular_price',
        'sale_price',
        'on_sale',
        'date_on_sale_from',
        'date_on_sale_to',
        'total_sales',
        'manage_stock',
        'stock',
        'stock_status',
        'backorders',
        'weight',
        'dimensions',
        'shipping_class',
        'reviews_allowed',
        'average_rating',
        'rating_count',
        'attributes',
        'meta_data',
        'sync_status',
    ];

    protected $casts = [
        'on_sale' => 'boolean',
        'featured' => 'boolean',
        'manage_stock' => 'boolean',
        'reviews_allowed' => 'boolean',
        'date_on_sale_from' => 'datetime',
        'date_on_sale_to' => 'datetime',
        'dimensions' => 'array',
        'attributes' => 'array',
        'meta_data' => 'array',
    ];

    /**
     * Product images
     */
    public function images(): HasMany
    {
        return $this->hasMany(ProductImage::class)->orderBy('position');
    }

    /**
     * Featured image (first image)
     */
    public function featuredImage(): HasMany
    {
        return $this->hasMany(ProductImage::class)->where('is_featured', true)->limit(1);
    }

    /**
     * Product variations (for variable products)
     */
    public function variations(): HasMany
    {
        return $this->hasMany(ProductVariation::class);
    }

    /**
     * Product categories
     */
    public function categories(): BelongsToMany
    {
        return $this->belongsToMany(Category::class);
    }

    /**
     * Product brands
     */
    public function brands(): BelongsToMany
    {
        return $this->belongsToMany(Brand::class);
    }

    /**
     * Check if product is variable
     */
    public function isVariable(): bool
    {
        return $this->type === 'variable';
    }

    /**
     * Get price display (considering variations)
     */
    public function getPriceRangeAttribute(): string
    {
        if ($this->isVariable() && $this->variations->count() > 0) {
            $min = $this->variations->min('price');
            $max = $this->variations->max('price');
            return $min == $max ? number_format($min, 2) : number_format($min, 2) . ' - ' . number_format($max, 2);
        }
        return number_format($this->price, 2);
    }
}
