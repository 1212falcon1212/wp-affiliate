<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('product_images', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->onDelete('cascade');
            $table->unsignedBigInteger('wc_id')->nullable()->comment('WooCommerce image/attachment ID');
            $table->text('src')->comment('Image URL');
            $table->string('name')->nullable();
            $table->string('alt')->nullable();
            $table->integer('position')->default(0);
            $table->boolean('is_featured')->default(false);
            $table->string('thumbnail')->nullable();
            $table->timestamps();

            $table->index(['product_id', 'position']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_images');
    }
};
