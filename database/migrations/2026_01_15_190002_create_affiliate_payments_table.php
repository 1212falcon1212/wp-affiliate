<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('affiliate_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('affiliate_id')->constrained()->onDelete('cascade');
            $table->foreignId('invoice_id')->nullable()->constrained('affiliate_invoices')->onDelete('set null');

            // Payment details
            $table->string('payment_number')->unique();
            $table->decimal('amount', 12, 2);
            $table->string('currency', 3)->default('TRY');

            // Payment method: bank_transfer, paytr, paypal, manual
            $table->string('payment_method')->default('bank_transfer');
            $table->json('payment_details')->nullable(); // IBAN, transaction ID, etc.

            // External payment provider
            $table->string('provider_transaction_id')->nullable();
            $table->string('provider_status')->nullable();
            $table->json('provider_response')->nullable();

            // Status: pending, processing, completed, failed, cancelled
            $table->string('status')->default('pending');

            // Referrals paid
            $table->json('referral_ids')->nullable();

            $table->text('notes')->nullable();
            $table->timestamp('processed_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index('status');
            $table->index('affiliate_id');
            $table->index('payment_method');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('affiliate_payments');
    }
};
