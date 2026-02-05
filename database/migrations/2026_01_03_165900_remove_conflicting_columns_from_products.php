<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Drop columns that conflict with normalized table relationships:
     * - images -> now in product_images table
     * - categories -> now in categories + category_product pivot
     * - variations -> now in product_variations table
     * - tags -> (reserved for future normalization)
     */
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['images', 'categories', 'tags', 'variations']);
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->json('categories')->nullable();
            $table->json('tags')->nullable();
            $table->json('images')->nullable();
            $table->json('variations')->nullable();
        });
    }
};
