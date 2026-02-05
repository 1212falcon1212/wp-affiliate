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
        Schema::create('affiliates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null');
            $table->string('name');
            $table->string('email')->unique();
            $table->string('phone')->nullable();
            $table->string('company')->nullable();

            // Commission settings
            $table->decimal('commission_rate', 5, 2)->default(10.00); // Percentage
            $table->string('commission_type')->default('percentage'); // percentage, fixed

            // Payment settings
            $table->string('payment_method')->default('bank_transfer'); // bank_transfer, paypal, other
            $table->json('payment_details')->nullable(); // IBAN, PayPal email, etc.

            // Stats (cached for performance)
            $table->decimal('total_earnings', 12, 2)->default(0);
            $table->decimal('pending_balance', 12, 2)->default(0);
            $table->decimal('paid_balance', 12, 2)->default(0);
            $table->integer('total_orders')->default(0);
            $table->integer('total_clicks')->default(0);

            // Status
            $table->string('status')->default('active'); // active, inactive, suspended
            $table->text('notes')->nullable();

            // Tracking
            $table->string('referral_code')->unique(); // Unique code for tracking
            $table->timestamp('last_activity_at')->nullable();

            $table->timestamps();

            $table->index('status');
            $table->index('referral_code');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('affiliates');
    }
};
