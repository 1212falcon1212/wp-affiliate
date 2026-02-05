<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Brand extends Model
{
    protected $fillable = [
        'wc_id',
        'name',
        'slug',
        'description',
        'image',
    ];

    protected $casts = [
        'wc_id' => 'integer',
    ];

    /**
     * Products with this brand
     */
    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class);
    }
}
