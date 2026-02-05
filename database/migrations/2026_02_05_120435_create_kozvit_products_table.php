<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('kozvit_products', function (Blueprint $table) {
            $table->id();

            // Identifiers
            $table->string('barcode')->unique();
            $table->string('kozvit_sku')->nullable();

            // Basic Info
            $table->string('name');
            $table->string('brand')->nullable();
            $table->decimal('price', 10, 2)->default(0);
            $table->string('currency', 10)->default('TRY');

            // Categories
            $table->string('main_category')->nullable();
            $table->string('sub_category')->nullable();

            // Content
            $table->text('description')->nullable();
            $table->string('image_url')->nullable();
            $table->string('source_url')->nullable();

            // Ratings
            $table->decimal('rating', 3, 2)->default(0);
            $table->integer('review_count')->default(0);

            // Raw data from JSON
            $table->json('raw_data')->nullable();

            // WooCommerce sync
            $table->unsignedBigInteger('wc_product_id')->nullable()->index();
            $table->string('sync_status', 20)->default('pending')->index();
            $table->text('sync_error')->nullable();
            $table->timestamp('synced_at')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('kozvit_products');
    }
};
