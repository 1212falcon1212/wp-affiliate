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
        Schema::table('bizimhesap_products', function (Blueprint $table) {
            // BizimHesap API'den gelen ek alanlar
            $table->boolean('is_active')->default(true)->after('bh_id');
            $table->string('code')->nullable()->after('is_active');
            $table->decimal('buying_price', 12, 2)->nullable()->after('price');
            $table->decimal('variant_price', 12, 2)->nullable()->after('buying_price');
            $table->string('currency', 10)->default('TL')->after('variant_price');
            $table->decimal('tax', 5, 2)->default(20)->after('currency');
            $table->string('photo')->nullable()->after('description');
            $table->text('ecommerce_description')->nullable()->after('photo');
            $table->text('note')->nullable()->after('ecommerce_description');
            $table->string('variant_name')->nullable()->after('note');
            $table->string('variant')->nullable()->after('variant_name');
            $table->boolean('is_ecommerce')->default(true)->after('variant');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bizimhesap_products', function (Blueprint $table) {
            $table->dropColumn([
                'is_active',
                'code',
                'buying_price',
                'variant_price',
                'currency',
                'tax',
                'photo',
                'ecommerce_description',
                'note',
                'variant_name',
                'variant',
                'is_ecommerce',
            ]);
        });
    }
};
