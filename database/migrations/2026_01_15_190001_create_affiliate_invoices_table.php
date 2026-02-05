<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('affiliate_invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('affiliate_id')->constrained()->onDelete('cascade');

            // Invoice details
            $table->string('invoice_number')->unique();
            $table->decimal('amount', 12, 2);
            $table->decimal('tax_amount', 12, 2)->default(0);
            $table->decimal('total_amount', 12, 2);
            $table->string('currency', 3)->default('TRY');

            // BizimHesap integration
            $table->string('bizimhesap_id')->nullable();
            $table->string('bizimhesap_url')->nullable();
            $table->string('bizimhesap_status')->nullable();

            // Period (hangi dönem için kesildi)
            $table->date('period_start');
            $table->date('period_end');

            // Referrals included
            $table->json('referral_ids')->nullable();

            // Status: draft, sent, paid, cancelled
            $table->string('status')->default('draft');

            $table->text('notes')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();

            $table->index('status');
            $table->index('affiliate_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('affiliate_invoices');
    }
};
