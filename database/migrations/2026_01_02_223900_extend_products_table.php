<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            // Basic Info
            $table->string('name')->nullable()->after('sku');
            $table->string('slug')->nullable()->after('name');
            $table->text('permalink')->nullable()->after('slug');
            $table->string('type')->default('simple')->after('permalink');
            $table->string('status')->default('publish')->after('type');
            $table->boolean('featured')->default(false)->after('status');
            $table->string('catalog_visibility')->default('visible')->after('featured');

            // Descriptions
            $table->longText('description')->nullable()->after('catalog_visibility');
            $table->text('short_description')->nullable()->after('description');

            // Pricing
            $table->decimal('regular_price', 12, 2)->nullable()->after('price');
            $table->decimal('sale_price', 12, 2)->nullable()->after('regular_price');
            $table->boolean('on_sale')->default(false)->after('sale_price');
            $table->timestamp('date_on_sale_from')->nullable()->after('on_sale');
            $table->timestamp('date_on_sale_to')->nullable()->after('date_on_sale_from');
            $table->integer('total_sales')->default(0)->after('date_on_sale_to');

            // Inventory
            $table->boolean('manage_stock')->default(false)->after('stock');
            $table->string('stock_status')->default('instock')->after('manage_stock');
            $table->string('backorders')->default('no')->after('stock_status');

            // Physical
            $table->string('weight')->nullable()->after('backorders');
            $table->json('dimensions')->nullable()->after('weight');
            $table->string('shipping_class')->nullable()->after('dimensions');

            // Reviews
            $table->boolean('reviews_allowed')->default(true)->after('shipping_class');
            $table->decimal('average_rating', 3, 2)->default(0)->after('reviews_allowed');
            $table->integer('rating_count')->default(0)->after('average_rating');

            // Relations (JSON arrays)
            $table->json('categories')->nullable()->after('rating_count');
            $table->json('tags')->nullable()->after('categories');
            $table->json('images')->nullable()->after('tags');
            $table->json('attributes')->nullable()->after('images');
            $table->json('variations')->nullable()->after('attributes');
            $table->json('meta_data')->nullable()->after('variations');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn([
                'name',
                'slug',
                'permalink',
                'type',
                'status',
                'featured',
                'catalog_visibility',
                'description',
                'short_description',
                'regular_price',
                'sale_price',
                'on_sale',
                'date_on_sale_from',
                'date_on_sale_to',
                'total_sales',
                'manage_stock',
                'stock_status',
                'backorders',
                'weight',
                'dimensions',
                'shipping_class',
                'reviews_allowed',
                'average_rating',
                'rating_count',
                'categories',
                'tags',
                'images',
                'attributes',
                'variations',
                'meta_data',
            ]);
        });
    }
};
