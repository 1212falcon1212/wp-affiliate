<?php

namespace Database\Factories;

use App\Models\Affiliate;
use App\Models\AffiliateReferral;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AffiliateReferral>
 */
class AffiliateReferralFactory extends Factory
{
    protected $model = AffiliateReferral::class;

    public function definition(): array
    {
        $orderTotal = $this->faker->randomFloat(2, 50, 1000);
        $commissionRate = $this->faker->randomFloat(2, 5, 20);

        return [
            'affiliate_id' => Affiliate::factory(),
            'order_id' => (string) $this->faker->unique()->numberBetween(1000, 99999),
            'coupon_code' => strtoupper($this->faker->bothify('REF-####')),
            'coupon_id' => null,
            'order_total' => $orderTotal,
            'commission_rate' => $commissionRate,
            'commission_amount' => round($orderTotal * ($commissionRate / 100), 2),
            'currency' => 'TRY',
            'status' => 'pending',
            'confirmed_at' => null,
            'paid_at' => null,
        ];
    }

    public function confirmed(): static
    {
        return $this->state(fn(array $attributes) => [
            'status' => 'confirmed',
            'confirmed_at' => now(),
        ]);
    }

    public function paid(): static
    {
        return $this->state(fn(array $attributes) => [
            'status' => 'paid',
            'confirmed_at' => now()->subDays(7),
            'paid_at' => now(),
        ]);
    }

    public function rejected(): static
    {
        return $this->state(fn(array $attributes) => [
            'status' => 'rejected',
        ]);
    }
}
