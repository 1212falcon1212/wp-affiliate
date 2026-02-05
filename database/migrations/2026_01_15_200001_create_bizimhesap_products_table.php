<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bizimhesap_products', function (Blueprint $table) {
            $table->id();
            $table->string('bh_id')->unique(); // BizimHesap product ID
            $table->string('name');
            $table->string('sku')->nullable();
            $table->string('barcode')->nullable();
            $table->decimal('price', 12, 2)->default(0);
            $table->decimal('cost_price', 12, 2)->nullable();
            $table->integer('stock')->default(0);
            $table->string('unit')->nullable();
            $table->string('category')->nullable();
            $table->string('brand')->nullable();
            $table->text('description')->nullable();
            $table->json('raw_data')->nullable();

            // WooCommerce sync status
            $table->unsignedBigInteger('wc_product_id')->nullable();
            $table->string('sync_status')->default('pending'); // pending, synced, failed, skipped
            $table->text('sync_error')->nullable();
            $table->timestamp('synced_at')->nullable();

            $table->timestamps();

            $table->index('sku');
            $table->index('sync_status');
            $table->index('wc_product_id');
        });

        // Sync jobs table
        Schema::create('bizimhesap_sync_jobs', function (Blueprint $table) {
            $table->id();
            $table->string('type'); // fetch, push_single, push_batch
            $table->string('status')->default('pending'); // pending, processing, completed, failed
            $table->integer('total_items')->default(0);
            $table->integer('processed_items')->default(0);
            $table->integer('success_count')->default(0);
            $table->integer('error_count')->default(0);
            $table->json('errors')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bizimhesap_sync_jobs');
        Schema::dropIfExists('bizimhesap_products');
    }
};