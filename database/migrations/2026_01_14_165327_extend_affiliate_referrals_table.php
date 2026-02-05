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
        Schema::table('affiliate_referrals', function (Blueprint $table) {
            // Add foreign key constraint
            $table->foreign('affiliate_id')->references('id')->on('affiliates')->onDelete('cascade');

            // Add more fields
            $table->string('coupon_code')->nullable()->after('order_id');
            $table->unsignedBigInteger('coupon_id')->nullable()->after('coupon_code');
            $table->decimal('order_total', 12, 2)->default(0)->after('coupon_id');
            $table->decimal('commission_rate', 5, 2)->default(0)->after('order_total');
            $table->string('currency')->default('TRY')->after('commission_amount');
            $table->timestamp('paid_at')->nullable()->after('status');
            $table->text('notes')->nullable()->after('paid_at');

            // Add foreign key for coupon
            $table->foreign('coupon_id')->references('id')->on('affiliate_coupons')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('affiliate_referrals', function (Blueprint $table) {
            $table->dropForeign(['affiliate_id']);
            $table->dropForeign(['coupon_id']);
            $table->dropColumn(['coupon_code', 'coupon_id', 'order_total', 'commission_rate', 'currency', 'paid_at', 'notes']);
        });
    }
};
