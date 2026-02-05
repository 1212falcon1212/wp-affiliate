<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'commerce_id' => $this->commerce_id,
            'sku' => $this->sku,
            'name' => $this->name,
            'slug' => $this->slug,
            'permalink' => $this->permalink,
            'type' => $this->type,
            'status' => $this->status,
            'featured' => $this->featured,
            'catalog_visibility' => $this->catalog_visibility,
            'description' => $this->description,
            'short_description' => $this->short_description,

            // Pricing
            'price' => $this->price,
            'regular_price' => $this->regular_price,
            'sale_price' => $this->sale_price,
            'on_sale' => $this->on_sale,
            'price_range' => $this->price_range,

            // Inventory
            'manage_stock' => $this->manage_stock,
            'stock' => $this->stock,
            'stock_status' => $this->stock_status,

            // Reviews
            'average_rating' => $this->average_rating,
            'rating_count' => $this->rating_count,

            // Relations - Always return arrays, with null safety
            'categories' => $this->categories?->map(fn($cat) => [
                'id' => $cat->id,
                'wc_id' => $cat->wc_id,
                'name' => $cat->name,
                'slug' => $cat->slug,
            ])?->toArray() ?? [],

            'brands' => $this->brands?->map(fn($br) => [
                'id' => $br->id,
                'wc_id' => $br->wc_id,
                'name' => $br->name,
            ])?->toArray() ?? [],

            'images' => $this->images?->map(fn($img) => [
                'id' => $img->id,
                'src' => $img->src,
                'name' => $img->name,
                'alt' => $img->alt,
                'is_featured' => $img->is_featured,
                'thumbnail' => $img->thumbnail,
            ])?->toArray() ?? [],

            'variations' => $this->variations?->map(fn($var) => [
                'id' => $var->id,
                'wc_id' => $var->wc_id,
                'sku' => $var->sku,
                'price' => $var->price,
                'regular_price' => $var->regular_price,
                'sale_price' => $var->sale_price,
                'stock_quantity' => $var->stock_quantity,
                'stock_status' => $var->stock_status,
                'attributes' => $var->attributes,
                'image' => $var->image,
            ])?->toArray() ?? [],

            'sync_status' => $this->sync_status,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
