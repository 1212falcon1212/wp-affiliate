<?php

use App\Http\Controllers\Api\AffiliateController;
use App\Http\Controllers\Api\AttributeController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\VariationController;
use Illuminate\Support\Facades\Route;

// ==========================================
// AUTH API
// ==========================================
Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/user', [AuthController::class, 'user']);
        Route::post('/refresh', [AuthController::class, 'refresh']);
    });
});

// ==========================================
// PRODUCTS API
// ==========================================
Route::prefix('products')->group(function () {
    // Stats & Logs
    Route::get('/stats', [ProductController::class, 'stats']);
    Route::get('/logs', [ProductController::class, 'syncLogs']);
    Route::post('/fetch', [ProductController::class, 'fetch']);

    // Batch Operations
    Route::put('/batch-stock', [ProductController::class, 'batchStock']);

    // WooCommerce Direct Operations
    Route::prefix('wc')->group(function () {
        // Create products
        Route::post('/simple', [ProductController::class, 'createSimple']);
        Route::post('/variable', [ProductController::class, 'createVariable']);

        // Get WooCommerce data
        Route::get('/categories', [ProductController::class, 'getWcCategories']);
        Route::get('/tags', [ProductController::class, 'getWcTags']);
        Route::get('/attributes', [ProductController::class, 'getWcAttributes']);
        Route::get('/{wcId}', [ProductController::class, 'getWcProduct']);
        Route::delete('/{wcId}', [ProductController::class, 'deleteWcProduct']);

        // Variations
        Route::get('/{wcId}/variations', [ProductController::class, 'getVariations']);
        Route::post('/{wcId}/variations', [ProductController::class, 'addVariation']);
        Route::put('/{wcId}/variations/{variationId}', [ProductController::class, 'updateVariation']);
        Route::delete('/{wcId}/variations/{variationId}', [ProductController::class, 'deleteVariation']);
    });

    // Attributes
    Route::get('/attributes', [AttributeController::class, 'index']);
    Route::post('/attributes', [AttributeController::class, 'store']);
    Route::get('/attributes/{id}', [AttributeController::class, 'show']);
    Route::put('/attributes/{id}', [AttributeController::class, 'update']);
    Route::delete('/attributes/{id}', [AttributeController::class, 'destroy']);

    // Attribute Terms
    Route::get('/attributes/{attributeId}/terms', [AttributeController::class, 'terms']);
    Route::post('/attributes/{attributeId}/terms', [AttributeController::class, 'storeTerm']);
    Route::put('/attributes/{attributeId}/terms/{termId}', [AttributeController::class, 'updateTerm']);
    Route::delete('/attributes/{attributeId}/terms/{termId}', [AttributeController::class, 'destroyTerm']);

    // Product CRUD
    Route::get('/', [ProductController::class, 'index']);
    Route::get('/{id}', [ProductController::class, 'show']);
    Route::put('/{id}', [ProductController::class, 'update']);

    // Price & Stock
    Route::put('/{id}/price', [ProductController::class, 'updatePrice']);
    Route::put('/{id}/stock', [ProductController::class, 'updateStock']);
    Route::post('/{id}/convert-to-variable', [ProductController::class, 'convertToVariable']);

    // Variations
    Route::get('/{productId}/variations', [VariationController::class, 'index']);
    Route::post('/{productId}/variations', [VariationController::class, 'store']);
    Route::put('/{productId}/variations/batch', [VariationController::class, 'batchUpdate']);
    Route::get('/{productId}/variations/{variationId}', [VariationController::class, 'show']);
    Route::put('/{productId}/variations/{variationId}', [VariationController::class, 'update']);
    Route::delete('/{productId}/variations/{variationId}', [VariationController::class, 'destroy']);
});

// ==========================================
// ORDERS API
// ==========================================
Route::prefix('orders')->group(function () {
    // Stats & Sync
    Route::get('/stats', [OrderController::class, 'stats']);
    Route::post('/fetch', [OrderController::class, 'fetch']);

    // Order CRUD
    Route::get('/', [OrderController::class, 'index']);
    Route::get('/{id}', [OrderController::class, 'show']);
    Route::put('/{id}/status', [OrderController::class, 'updateStatus']);
    Route::post('/{id}/sync', [OrderController::class, 'sync']);
    Route::post('/{id}/invoice', [OrderController::class, 'createInvoice']);
});

// ==========================================
// AFFILIATES API
// ==========================================
Route::prefix('affiliates')->group(function () {
    // Stats
    Route::get('/stats', [AffiliateController::class, 'stats']);

    // CRUD
    Route::get('/', [AffiliateController::class, 'index']);
    Route::post('/', [AffiliateController::class, 'store']);
    Route::get('/{id}', [AffiliateController::class, 'show']);
    Route::put('/{id}', [AffiliateController::class, 'update']);
    Route::delete('/{id}', [AffiliateController::class, 'destroy']);

    // Coupons
    Route::get('/{id}/coupons', [AffiliateController::class, 'coupons']);
    Route::post('/{id}/coupons', [AffiliateController::class, 'storeCoupon']);
    Route::put('/{id}/coupons/{couponId}', [AffiliateController::class, 'updateCoupon']);
    Route::delete('/{id}/coupons/{couponId}', [AffiliateController::class, 'destroyCoupon']);

    // Referrals
    Route::get('/{id}/referrals', [AffiliateController::class, 'referrals']);
    Route::post('/{id}/referrals/{referralId}/confirm', [AffiliateController::class, 'confirmReferral']);
    Route::post('/{id}/mark-as-paid', [AffiliateController::class, 'markAsPaid']);

    // Earnings
    Route::get('/{id}/earnings', [AffiliateController::class, 'earnings']);
});

// ==========================================
// AFFILIATE INVOICES API
// ==========================================
use App\Http\Controllers\Api\AffiliateInvoiceController;
use App\Http\Controllers\Api\AffiliatePaymentController;
use App\Http\Controllers\Api\BizimHesapProductController;

Route::prefix('affiliate-invoices')->group(function () {
    Route::get('/stats', [AffiliateInvoiceController::class, 'stats']);
    Route::get('/', [AffiliateInvoiceController::class, 'index']);
    Route::post('/', [AffiliateInvoiceController::class, 'store']);
    Route::get('/{id}', [AffiliateInvoiceController::class, 'show']);
    Route::post('/{id}/send-to-bizimhesap', [AffiliateInvoiceController::class, 'sendToBizimHesap']);
    Route::get('/{id}/check-status', [AffiliateInvoiceController::class, 'checkStatus']);
    Route::post('/{id}/mark-as-paid', [AffiliateInvoiceController::class, 'markAsPaid']);
    Route::post('/{id}/cancel', [AffiliateInvoiceController::class, 'cancel']);
});

// ==========================================
// AFFILIATE PAYMENTS API
// ==========================================
Route::prefix('affiliate-payments')->group(function () {
    Route::get('/stats', [AffiliatePaymentController::class, 'stats']);
    Route::get('/', [AffiliatePaymentController::class, 'index']);
    Route::post('/', [AffiliatePaymentController::class, 'store']);
    Route::get('/{id}', [AffiliatePaymentController::class, 'show']);
    Route::post('/{id}/process', [AffiliatePaymentController::class, 'process']);
    Route::post('/{id}/complete', [AffiliatePaymentController::class, 'complete']);
    Route::post('/{id}/cancel', [AffiliatePaymentController::class, 'cancel']);
    Route::get('/affiliate/{affiliateId}/info', [AffiliatePaymentController::class, 'affiliatePaymentInfo']);
});

// ==========================================
// BIZIMHESAP PRODUCTS API
// ==========================================
Route::prefix('bizimhesap-products')->group(function () {
    Route::get('/stats', [BizimHesapProductController::class, 'stats']);
    Route::get('/sync-jobs', [BizimHesapProductController::class, 'syncJobs']);
    Route::get('/sync-jobs/{id}', [BizimHesapProductController::class, 'syncJobStatus']);
    Route::post('/fetch', [BizimHesapProductController::class, 'fetch']);
    Route::post('/push', [BizimHesapProductController::class, 'push']);
    Route::post('/push-all', [BizimHesapProductController::class, 'pushAll']);
    Route::post('/reset-failed', [BizimHesapProductController::class, 'resetFailed']);
    Route::get('/', [BizimHesapProductController::class, 'index']);
    Route::get('/{id}', [BizimHesapProductController::class, 'show']);
});

// ==========================================
// KOZVIT PRODUCTS API
// ==========================================
use App\Http\Controllers\Api\KozvitProductController;

Route::prefix('kozvit-products')->group(function () {
    Route::get('/stats', [KozvitProductController::class, 'stats']);
    Route::get('/brands', [KozvitProductController::class, 'brands']);
    Route::get('/categories', [KozvitProductController::class, 'categories']);
    Route::post('/push-batch', [KozvitProductController::class, 'pushBatch']);
    Route::post('/push-all-pending', [KozvitProductController::class, 'pushAllPending']);
    Route::post('/reset-failed', [KozvitProductController::class, 'resetFailed']);
    Route::get('/', [KozvitProductController::class, 'index']);
    Route::get('/{id}', [KozvitProductController::class, 'show']);
    Route::put('/{id}', [KozvitProductController::class, 'update']);
    Route::delete('/{id}', [KozvitProductController::class, 'destroy']);
    Route::post('/{id}/push', [KozvitProductController::class, 'push']);
});

// ==========================================
// DEPLOY API (GitHub Webhook)
// ==========================================
use App\Http\Controllers\Api\DeployController;

Route::prefix('deploy')->group(function () {
    // GitHub webhook endpoint (public, verified by signature)
    Route::post('/webhook', [DeployController::class, 'webhook']);

    // Protected endpoints
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/status', [DeployController::class, 'status']);
        Route::post('/trigger', [DeployController::class, 'trigger']);
    });
});

// ==========================================
// OTHER ROUTES
// ==========================================
Route::webhooks('webhooks/woocommerce', 'woocommerce');
Route::apiResource('settings', \App\Http\Controllers\Api\SettingsController::class);
