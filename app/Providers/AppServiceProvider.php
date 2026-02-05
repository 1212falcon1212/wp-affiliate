<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(\App\Contracts\CommerceInterface::class, \App\Services\WooCommerce\WooCommerceService::class);
        $this->app->bind(\App\Contracts\ERPInterface::class, \App\Services\ERP\BizimHesapService::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
