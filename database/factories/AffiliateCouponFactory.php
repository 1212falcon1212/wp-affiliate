<?php

namespace Database\Factories;

use App\Models\Affiliate;
use App\Models\AffiliateCoupon;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AffiliateCoupon>
 */
class AffiliateCouponFactory extends Factory
{
    protected $model = AffiliateCoupon::class;

    public function definition(): array
    {
        return [
            'affiliate_id' => Affiliate::factory(),
            'code' => strtoupper($this->faker->unique()->bothify('COUPON-####')),
            'wc_coupon_id' => null,
            'discount_type' => $this->faker->randomElement(['percent', 'fixed_cart', 'fixed_product']),
            'amount' => $this->faker->randomFloat(2, 5, 50),
            'minimum_amount' => null,
            'maximum_amount' => null,
            'usage_limit' => null,
            'usage_limit_per_user' => null,
            'usage_count' => 0,
            'individual_use' => false,
            'exclude_sale_items' => false,
            'date_expires' => null,
            'status' => 'active',
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn(array $attributes) => [
            'status' => 'inactive',
        ]);
    }

    public function synced(): static
    {
        return $this->state(fn(array $attributes) => [
            'wc_coupon_id' => $this->faker->numberBetween(1000, 9999),
        ]);
    }

    public function expired(): static
    {
        return $this->state(fn(array $attributes) => [
            'date_expires' => now()->subDays(7),
        ]);
    }
}
