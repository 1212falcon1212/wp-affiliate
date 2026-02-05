<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('product_variations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->onDelete('cascade');
            $table->unsignedBigInteger('wc_id')->unique()->comment('WooCommerce variation ID');
            $table->string('sku')->nullable();
            $table->decimal('price', 12, 2)->default(0);
            $table->decimal('regular_price', 12, 2)->nullable();
            $table->decimal('sale_price', 12, 2)->nullable();
            $table->boolean('on_sale')->default(false);
            $table->integer('stock_quantity')->nullable();
            $table->string('stock_status')->default('instock');
            $table->boolean('manage_stock')->default(false);
            $table->string('weight')->nullable();
            $table->json('dimensions')->nullable();
            $table->json('attributes')->nullable()->comment('Variation attributes like size, color');
            $table->string('image')->nullable();
            $table->string('status')->default('publish');
            $table->timestamps();

            $table->index('sku');
            $table->index('product_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_variations');
    }
};
