<?php

namespace Tests\Unit;

use App\Models\Affiliate;
use App\Models\AffiliateCoupon;
use App\Models\AffiliateReferral;
use App\Models\Order;
use App\Services\Affiliate\AffiliateService;
use App\Services\WooCommerce\WooCommerceService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\TestCase;

class AffiliateServiceTest extends TestCase
{
    use RefreshDatabase;

    protected AffiliateService $service;
    protected $wcMock;

    protected function setUp(): void
    {
        parent::setUp();

        $this->wcMock = Mockery::mock(WooCommerceService::class);
        $this->app->instance(WooCommerceService::class, $this->wcMock);

        $this->service = $this->app->make(AffiliateService::class);
    }

    public function test_can_create_affiliate(): void
    {
        $data = [
            'name' => 'Test Affiliate',
            'email' => 'test@example.com',
            'commission_rate' => 10,
            'commission_type' => 'percentage',
            'payment_method' => 'bank_transfer',
        ];

        $affiliate = $this->service->createAffiliate($data);

        $this->assertInstanceOf(Affiliate::class, $affiliate);
        $this->assertEquals('Test Affiliate', $affiliate->name);
        $this->assertEquals('test@example.com', $affiliate->email);
        $this->assertEquals(10, $affiliate->commission_rate);
    }

    public function test_can_update_affiliate(): void
    {
        $affiliate = Affiliate::factory()->create([
            'name' => 'Original Name',
            'commission_rate' => 10,
        ]);

        $updated = $this->service->updateAffiliate($affiliate, [
            'name' => 'Updated Name',
            'commission_rate' => 15,
        ]);

        $this->assertEquals('Updated Name', $updated->name);
        $this->assertEquals(15, $updated->commission_rate);
    }

    public function test_can_create_coupon_and_sync_to_woocommerce(): void
    {
        $affiliate = Affiliate::factory()->create();

        // Mock WooCommerce coupon creation
        $this->wcMock->shouldReceive('createCoupon')
            ->once()
            ->andReturn(['id' => 12345, 'code' => 'testcoupon']);

        $coupon = $this->service->createCoupon($affiliate, [
            'code' => 'TESTCOUPON',
            'discount_type' => 'percent',
            'amount' => 10,
        ]);

        $this->assertInstanceOf(AffiliateCoupon::class, $coupon);
        $this->assertEquals('TESTCOUPON', $coupon->code);
        $this->assertEquals(12345, $coupon->wc_coupon_id);
    }

    public function test_coupon_created_locally_even_if_woocommerce_fails(): void
    {
        $affiliate = Affiliate::factory()->create();

        // Mock WooCommerce coupon creation failure
        $this->wcMock->shouldReceive('createCoupon')
            ->once()
            ->andThrow(new \Exception('API Error'));

        $coupon = $this->service->createCoupon($affiliate, [
            'code' => 'TESTCOUPON2',
            'discount_type' => 'percent',
            'amount' => 15,
        ]);

        $this->assertInstanceOf(AffiliateCoupon::class, $coupon);
        $this->assertEquals('TESTCOUPON2', $coupon->code);
        $this->assertNull($coupon->wc_coupon_id); // No WC ID because it failed
    }

    public function test_can_update_coupon(): void
    {
        $affiliate = Affiliate::factory()->create();
        $coupon = AffiliateCoupon::factory()->create([
            'affiliate_id' => $affiliate->id,
            'wc_coupon_id' => 12345,
            'amount' => 10,
        ]);

        $this->wcMock->shouldReceive('updateCoupon')
            ->once()
            ->with(12345, Mockery::type('array'))
            ->andReturn(['id' => 12345]);

        $updated = $this->service->updateCoupon($coupon, [
            'amount' => 20,
        ]);

        $this->assertEquals(20, $updated->amount);
    }

    public function test_can_delete_coupon(): void
    {
        $affiliate = Affiliate::factory()->create();
        $coupon = AffiliateCoupon::factory()->create([
            'affiliate_id' => $affiliate->id,
            'wc_coupon_id' => 12345,
        ]);

        $this->wcMock->shouldReceive('deleteCoupon')
            ->once()
            ->with(12345)
            ->andReturn(true);

        $result = $this->service->deleteCoupon($coupon);

        $this->assertTrue($result);
        $this->assertDatabaseMissing('affiliate_coupons', ['id' => $coupon->id]);
    }

    public function test_processes_order_with_affiliate_coupon(): void
    {
        $affiliate = Affiliate::factory()->create([
            'commission_rate' => 10,
            'commission_type' => 'percentage',
            'status' => 'active',
        ]);

        $coupon = AffiliateCoupon::factory()->create([
            'affiliate_id' => $affiliate->id,
            'code' => 'AFFILIATE10',
            'status' => 'active',
        ]);

        $order = Order::factory()->create([
            'coupon_code' => 'AFFILIATE10',
            'total' => 100,
            'status' => 'processing',
        ]);

        $referral = $this->service->processOrderForCommission($order);

        $this->assertInstanceOf(AffiliateReferral::class, $referral);
        $this->assertEquals($affiliate->id, $referral->affiliate_id);
        $this->assertEquals(10, $referral->commission_amount); // 10% of 100
        $this->assertEquals('pending', $referral->status);
    }

    public function test_does_not_create_duplicate_referral(): void
    {
        $affiliate = Affiliate::factory()->create(['status' => 'active']);
        $coupon = AffiliateCoupon::factory()->create([
            'affiliate_id' => $affiliate->id,
            'code' => 'TESTCODE',
            'status' => 'active',
        ]);

        $order = Order::factory()->create([
            'coupon_code' => 'TESTCODE',
            'total' => 100,
        ]);

        // First call creates referral
        $referral1 = $this->service->processOrderForCommission($order);

        // Second call should return existing referral
        $referral2 = $this->service->processOrderForCommission($order);

        $this->assertEquals($referral1->id, $referral2->id);
        $this->assertEquals(1, AffiliateReferral::count());
    }

    public function test_can_confirm_referral(): void
    {
        $referral = AffiliateReferral::factory()->create(['status' => 'pending']);

        $this->service->confirmReferral($referral);

        $this->assertEquals('confirmed', $referral->fresh()->status);
    }

    public function test_can_mark_referrals_as_paid(): void
    {
        $affiliate = Affiliate::factory()->create();
        $referrals = AffiliateReferral::factory()->count(3)->create([
            'affiliate_id' => $affiliate->id,
            'status' => 'confirmed',
        ]);

        $count = $this->service->markReferralsAsPaid(
            $affiliate,
            $referrals->pluck('id')->toArray()
        );

        $this->assertEquals(3, $count);
        $this->assertEquals(3, AffiliateReferral::where('status', 'paid')->count());
    }

    public function test_get_stats_returns_correct_counts(): void
    {
        Affiliate::factory()->count(5)->create(['status' => 'active']);
        Affiliate::factory()->count(2)->create(['status' => 'inactive']);
        AffiliateCoupon::factory()->count(3)->create(['status' => 'active']);
        AffiliateReferral::factory()->count(4)->create(['status' => 'pending']);

        $stats = $this->service->getStats();

        $this->assertEquals(7, $stats['total_affiliates']);
        $this->assertEquals(5, $stats['active_affiliates']);
        $this->assertEquals(3, $stats['active_coupons']);
        $this->assertEquals(4, $stats['pending_referrals']);
    }

    public function test_find_affiliate_by_referral_code(): void
    {
        $affiliate = Affiliate::factory()->create([
            'referral_code' => 'TESTREF123',
            'status' => 'active',
        ]);

        $found = $this->service->findByReferralCode('TESTREF123');

        $this->assertNotNull($found);
        $this->assertEquals($affiliate->id, $found->id);
    }

    public function test_find_affiliate_by_coupon_code(): void
    {
        $affiliate = Affiliate::factory()->create();
        AffiliateCoupon::factory()->create([
            'affiliate_id' => $affiliate->id,
            'code' => 'COUPONCODE',
        ]);

        $found = $this->service->findByCouponCode('COUPONCODE');

        $this->assertNotNull($found);
        $this->assertEquals($affiliate->id, $found->id);
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }
}
