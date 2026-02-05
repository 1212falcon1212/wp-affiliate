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
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('wc_id')->unique();
            $table->string('order_number')->nullable();
            $table->string('status')->default('pending');
            $table->string('currency')->default('TRY');
            $table->decimal('total', 12, 2)->default(0);
            $table->decimal('subtotal', 12, 2)->default(0);
            $table->decimal('total_tax', 12, 2)->default(0);
            $table->decimal('shipping_total', 12, 2)->default(0);
            $table->decimal('discount_total', 12, 2)->default(0);

            // Customer info
            $table->unsignedBigInteger('customer_id')->nullable();
            $table->string('customer_email')->nullable();
            $table->string('customer_name')->nullable();
            $table->string('customer_phone')->nullable();

            // Addresses (JSON)
            $table->json('billing_address')->nullable();
            $table->json('shipping_address')->nullable();

            // Payment
            $table->string('payment_method')->nullable();
            $table->string('payment_method_title')->nullable();
            $table->string('transaction_id')->nullable();

            // Dates
            $table->timestamp('date_created')->nullable();
            $table->timestamp('date_paid')->nullable();
            $table->timestamp('date_completed')->nullable();

            // BizimHesap integration
            $table->string('invoice_id')->nullable();
            $table->string('invoice_number')->nullable();
            $table->timestamp('invoice_date')->nullable();

            // Coupon/Affiliate tracking
            $table->string('coupon_code')->nullable();
            $table->unsignedBigInteger('affiliate_id')->nullable()->index();

            // Meta
            $table->json('meta_data')->nullable();
            $table->text('customer_note')->nullable();

            $table->timestamps();

            $table->index('status');
            $table->index('customer_id');
            $table->index('date_created');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
