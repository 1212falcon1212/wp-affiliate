<?php

namespace Database\Factories;

use App\Models\BizimHesapSyncJob;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<BizimHesapSyncJob>
 */
class BizimHesapSyncJobFactory extends Factory
{
    protected $model = BizimHesapSyncJob::class;

    public function definition(): array
    {
        return [
            'type' => $this->faker->randomElement(['fetch', 'push']),
            'status' => 'pending',
            'total_items' => 0,
            'processed_items' => 0,
            'success_count' => 0,
            'error_count' => 0,
            'errors' => null,
            'started_at' => null,
            'completed_at' => null,
        ];
    }

    public function processing(): static
    {
        return $this->state(fn(array $attributes) => [
            'status' => 'processing',
            'started_at' => now(),
            'total_items' => $this->faker->numberBetween(10, 100),
        ]);
    }

    public function completed(): static
    {
        $total = $this->faker->numberBetween(10, 100);
        $success = $this->faker->numberBetween(8, $total);
        $errors = $total - $success;

        return $this->state(fn(array $attributes) => [
            'status' => 'completed',
            'started_at' => now()->subMinutes(5),
            'completed_at' => now(),
            'total_items' => $total,
            'processed_items' => $total,
            'success_count' => $success,
            'error_count' => $errors,
        ]);
    }

    public function failed(): static
    {
        return $this->state(fn(array $attributes) => [
            'status' => 'failed',
            'started_at' => now()->subMinutes(5),
            'completed_at' => now(),
            'errors' => ['Connection timeout', 'API rate limit exceeded'],
        ]);
    }

    public function fetch(): static
    {
        return $this->state(fn(array $attributes) => [
            'type' => 'fetch',
        ]);
    }

    public function push(): static
    {
        return $this->state(fn(array $attributes) => [
            'type' => 'push',
        ]);
    }
}
