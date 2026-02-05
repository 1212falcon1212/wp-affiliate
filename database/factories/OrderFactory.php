<?php

namespace Database\Factories;

use App\Models\Order;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Order>
 */
class OrderFactory extends Factory
{
    protected $model = Order::class;

    public function definition(): array
    {
        $total = $this->faker->randomFloat(2, 50, 2000);

        return [
            'wc_id' => $this->faker->unique()->numberBetween(1000, 99999),
            'order_number' => $this->faker->unique()->numberBetween(10000, 99999),
            'status' => $this->faker->randomElement(['pending', 'processing', 'completed', 'cancelled']),
            'currency' => 'TRY',
            'total' => $total,
            'subtotal' => $total * 0.82,
            'total_tax' => $total * 0.18,
            'shipping_total' => $this->faker->randomFloat(2, 0, 50),
            'discount_total' => 0,
            'customer_id' => $this->faker->numberBetween(1, 100),
            'customer_email' => $this->faker->safeEmail(),
            'customer_name' => $this->faker->name(),
            'customer_phone' => $this->faker->phoneNumber(),
            'billing_address' => [
                'first_name' => $this->faker->firstName(),
                'last_name' => $this->faker->lastName(),
                'address_1' => $this->faker->streetAddress(),
                'city' => $this->faker->city(),
                'state' => $this->faker->state(),
                'postcode' => $this->faker->postcode(),
                'country' => 'TR',
            ],
            'shipping_address' => [],
            'payment_method' => 'bacs',
            'payment_method_title' => 'Banka Havalesi',
            'transaction_id' => null,
            'date_created' => now(),
            'date_paid' => null,
            'date_completed' => null,
            'coupon_code' => null,
            'customer_note' => null,
            'meta_data' => [],
            'raw_data' => [],
            'invoice_id' => null,
            'invoice_url' => null,
            'invoice_date' => null,
        ];
    }

    public function processing(): static
    {
        return $this->state(fn(array $attributes) => [
            'status' => 'processing',
            'date_paid' => now(),
        ]);
    }

    public function completed(): static
    {
        return $this->state(fn(array $attributes) => [
            'status' => 'completed',
            'date_paid' => now()->subDays(3),
            'date_completed' => now(),
        ]);
    }

    public function cancelled(): static
    {
        return $this->state(fn(array $attributes) => [
            'status' => 'cancelled',
        ]);
    }

    public function withCoupon(string $code): static
    {
        return $this->state(fn(array $attributes) => [
            'coupon_code' => $code,
            'discount_total' => $this->faker->randomFloat(2, 5, 50),
        ]);
    }

    public function withInvoice(): static
    {
        $invoiceId = $this->faker->uuid();
        return $this->state(fn(array $attributes) => [
            'invoice_id' => $invoiceId,
            'invoice_url' => "https://bizimhesap.com/invoice/{$invoiceId}",
            'invoice_date' => now(),
        ]);
    }
}
