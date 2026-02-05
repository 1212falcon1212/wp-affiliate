<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('affiliate_coupons', function (Blueprint $table) {
            $table->id();
            $table->foreignId('affiliate_id')->constrained()->onDelete('cascade');
            $table->unsignedBigInteger('wc_coupon_id')->nullable(); // WooCommerce coupon ID
            $table->string('code')->unique(); // Coupon code
            $table->string('discount_type')->default('percent'); // percent, fixed_cart, fixed_product
            $table->decimal('amount', 10, 2)->default(0); // Discount amount
            $table->decimal('minimum_amount', 10, 2)->nullable(); // Minimum order amount
            $table->decimal('maximum_amount', 10, 2)->nullable(); // Maximum discount amount
            $table->integer('usage_limit')->nullable(); // Total usage limit
            $table->integer('usage_limit_per_user')->nullable();
            $table->integer('usage_count')->default(0);
            $table->boolean('individual_use')->default(false);
            $table->boolean('exclude_sale_items')->default(false);
            $table->json('product_ids')->nullable(); // Specific products
            $table->json('excluded_product_ids')->nullable();
            $table->json('category_ids')->nullable(); // Specific categories
            $table->timestamp('date_expires')->nullable();
            $table->string('status')->default('active'); // active, inactive, expired
            $table->timestamps();

            $table->index('code');
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('affiliate_coupons');
    }
};
