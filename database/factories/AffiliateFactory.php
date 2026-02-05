<?php

namespace Database\Factories;

use App\Models\Affiliate;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Affiliate>
 */
class AffiliateFactory extends Factory
{
    protected $model = Affiliate::class;

    public function definition(): array
    {
        return [
            'name' => $this->faker->name(),
            'email' => $this->faker->unique()->safeEmail(),
            'phone' => $this->faker->phoneNumber(),
            'company' => $this->faker->company(),
            'referral_code' => strtoupper(Str::random(8)),
            'commission_rate' => $this->faker->randomFloat(2, 5, 30),
            'commission_type' => $this->faker->randomElement(['percentage', 'fixed']),
            'payment_method' => $this->faker->randomElement(['bank_transfer', 'paypal', 'other']),
            'payment_details' => [
                'bank_name' => $this->faker->company(),
                'iban' => $this->faker->iban('TR'),
            ],
            'status' => 'active',
            'total_earnings' => 0,
            'pending_balance' => 0,
            'paid_balance' => 0,
            'total_orders' => 0,
            'notes' => null,
            'last_activity_at' => null,
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn(array $attributes) => [
            'status' => 'inactive',
        ]);
    }

    public function suspended(): static
    {
        return $this->state(fn(array $attributes) => [
            'status' => 'suspended',
        ]);
    }

    public function withEarnings(): static
    {
        return $this->state(fn(array $attributes) => [
            'total_earnings' => $this->faker->randomFloat(2, 100, 10000),
            'pending_balance' => $this->faker->randomFloat(2, 0, 500),
            'paid_balance' => $this->faker->randomFloat(2, 100, 5000),
            'total_orders' => $this->faker->numberBetween(10, 100),
        ]);
    }
}
