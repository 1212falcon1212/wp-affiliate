<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('brands', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('wc_id')->unique()->nullable()->comment('WooCommerce brand ID');
            $table->string('name');
            $table->string('slug')->nullable();
            $table->text('description')->nullable();
            $table->string('image')->nullable();
            $table->timestamps();

            $table->index('slug');
        });

        // Pivot table for product-brand relationship
        Schema::create('brand_product', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->onDelete('cascade');
            $table->foreignId('brand_id')->constrained()->onDelete('cascade');
            $table->timestamps();

            $table->unique(['product_id', 'brand_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('brand_product');
        Schema::dropIfExists('brands');
    }
};
