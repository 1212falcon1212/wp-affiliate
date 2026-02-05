<?php

namespace Database\Factories;

use App\Models\BizimHesapProduct;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<BizimHesapProduct>
 */
class BizimHesapProductFactory extends Factory
{
    protected $model = BizimHesapProduct::class;

    public function definition(): array
    {
        return [
            'bh_id' => Str::uuid()->toString(),
            'is_active' => true,
            'code' => $this->faker->bothify('PRD-####'),
            'name' => $this->faker->productName ?? $this->faker->words(3, true),
            'sku' => $this->faker->unique()->bothify('SKU-####'),
            'barcode' => $this->faker->ean13(),
            'price' => $this->faker->randomFloat(2, 10, 1000),
            'buying_price' => $this->faker->randomFloat(2, 5, 500),
            'variant_price' => null,
            'currency' => 'TL',
            'tax' => 20,
            'stock' => $this->faker->numberBetween(0, 100),
            'unit' => $this->faker->randomElement(['Adet', 'Kg', 'Lt', 'Mt']),
            'category' => $this->faker->randomElement(['Elektronik', 'Giyim', 'Kozmetik', 'Gıda']),
            'brand' => $this->faker->company(),
            'description' => $this->faker->paragraph(),
            'ecommerce_description' => $this->faker->paragraph(),
            'note' => $this->faker->sentence(),
            'variant_name' => null,
            'variant' => null,
            'is_ecommerce' => true,
            'photo' => null,
            'raw_data' => [],
            'wc_product_id' => null,
            'sync_status' => 'pending',
            'sync_error' => null,
            'synced_at' => null,
        ];
    }

    public function synced(): static
    {
        return $this->state(fn(array $attributes) => [
            'sync_status' => 'synced',
            'wc_product_id' => $this->faker->numberBetween(1000, 9999),
            'synced_at' => now(),
        ]);
    }

    public function failed(): static
    {
        return $this->state(fn(array $attributes) => [
            'sync_status' => 'failed',
            'sync_error' => 'Test error: ' . $this->faker->sentence(),
        ]);
    }

    public function inactive(): static
    {
        return $this->state(fn(array $attributes) => [
            'is_active' => false,
            'is_ecommerce' => false,
        ]);
    }
}
