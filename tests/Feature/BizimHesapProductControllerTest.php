<?php

namespace Tests\Feature;

use App\Models\BizimHesapProduct;
use App\Models\BizimHesapSyncJob;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BizimHesapProductControllerTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    public function test_can_list_products(): void
    {
        BizimHesapProduct::factory()->count(5)->create();

        $response = $this->actingAs($this->user)
            ->getJson('/api/bizimhesap-products');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'bh_id', 'name', 'sku', 'price', 'sync_status'],
                ],
                'meta' => ['current_page', 'last_page', 'per_page', 'total'],
            ]);
    }

    public function test_can_filter_products_by_sync_status(): void
    {
        BizimHesapProduct::factory()->count(3)->create(['sync_status' => 'pending']);
        BizimHesapProduct::factory()->count(2)->create(['sync_status' => 'synced']);

        $response = $this->actingAs($this->user)
            ->getJson('/api/bizimhesap-products?sync_status=pending');

        $response->assertStatus(200);
        $this->assertEquals(3, $response->json('meta.total'));
    }

    public function test_can_search_products(): void
    {
        BizimHesapProduct::factory()->create(['name' => 'Test Product Alpha']);
        BizimHesapProduct::factory()->create(['name' => 'Another Product']);

        $response = $this->actingAs($this->user)
            ->getJson('/api/bizimhesap-products?search=Alpha');

        $response->assertStatus(200);
        $this->assertEquals(1, $response->json('meta.total'));
    }

    public function test_can_get_single_product(): void
    {
        $product = BizimHesapProduct::factory()->create();

        $response = $this->actingAs($this->user)
            ->getJson("/api/bizimhesap-products/{$product->id}");

        $response->assertStatus(200)
            ->assertJsonPath('data.id', $product->id)
            ->assertJsonPath('data.name', $product->name);
    }

    public function test_returns_404_for_nonexistent_product(): void
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/bizimhesap-products/99999');

        $response->assertStatus(404);
    }

    public function test_can_get_stats(): void
    {
        BizimHesapProduct::factory()->count(5)->create(['sync_status' => 'pending']);
        BizimHesapProduct::factory()->count(3)->create(['sync_status' => 'synced']);
        BizimHesapProduct::factory()->count(2)->create(['sync_status' => 'failed']);

        $response = $this->actingAs($this->user)
            ->getJson('/api/bizimhesap-products/stats');

        $response->assertStatus(200)
            ->assertJsonPath('data.total', 10)
            ->assertJsonPath('data.pending', 5)
            ->assertJsonPath('data.synced', 3)
            ->assertJsonPath('data.failed', 2);
    }

    public function test_can_reset_failed_products(): void
    {
        BizimHesapProduct::factory()->count(3)->create([
            'sync_status' => 'failed',
            'sync_error' => 'Test error',
        ]);

        $response = $this->actingAs($this->user)
            ->postJson('/api/bizimhesap-products/reset-failed');

        $response->assertStatus(200)
            ->assertJsonPath('reset_count', 3);

        $this->assertEquals(0, BizimHesapProduct::where('sync_status', 'failed')->count());
        $this->assertEquals(3, BizimHesapProduct::where('sync_status', 'pending')->count());
    }

    public function test_push_requires_valid_product_ids(): void
    {
        $response = $this->actingAs($this->user)
            ->postJson('/api/bizimhesap-products/push', [
                'product_ids' => [99999],
            ]);

        $response->assertStatus(422);
    }

    public function test_can_list_sync_jobs(): void
    {
        BizimHesapSyncJob::factory()->count(3)->create(['type' => 'fetch']);
        BizimHesapSyncJob::factory()->count(2)->create(['type' => 'push']);

        $response = $this->actingAs($this->user)
            ->getJson('/api/bizimhesap-products/sync-jobs');

        $response->assertStatus(200)
            ->assertJsonPath('meta.total', 5);
    }

    public function test_can_filter_sync_jobs_by_type(): void
    {
        BizimHesapSyncJob::factory()->count(3)->create(['type' => 'fetch']);
        BizimHesapSyncJob::factory()->count(2)->create(['type' => 'push']);

        $response = $this->actingAs($this->user)
            ->getJson('/api/bizimhesap-products/sync-jobs?type=fetch');

        $response->assertStatus(200)
            ->assertJsonPath('meta.total', 3);
    }

    public function test_can_get_sync_job_status(): void
    {
        $job = BizimHesapSyncJob::factory()->create([
            'type' => 'fetch',
            'status' => 'completed',
            'total_items' => 100,
            'success_count' => 95,
            'error_count' => 5,
        ]);

        $response = $this->actingAs($this->user)
            ->getJson("/api/bizimhesap-products/sync-jobs/{$job->id}");

        $response->assertStatus(200)
            ->assertJsonPath('data.type', 'fetch')
            ->assertJsonPath('data.status', 'completed')
            ->assertJsonPath('data.total_items', 100);
    }
}
