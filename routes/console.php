<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// ==========================================
// AUTO-PILOT SCHEDULED TASKS
// ==========================================

// Gece 03:00 - Tam senkronizasyon (BizimHesap + WooCommerce + Siparişler)
Schedule::command('autopilot:run --sync-type=all')
    ->dailyAt('03:00')
    ->withoutOverlapping()
    ->onOneServer()
    ->appendOutputTo(storage_path('logs/autopilot.log'))
    ->description('Gece otomatik tam senkronizasyon');

// Her 4 saatte bir - Sadece siparişleri çek
Schedule::command('autopilot:run --sync-type=orders')
    ->everyFourHours()
    ->withoutOverlapping()
    ->onOneServer()
    ->appendOutputTo(storage_path('logs/autopilot.log'))
    ->description('Sipariş senkronizasyonu');

// Her 6 saatte bir - BizimHesap ürünlerini güncelle
Schedule::command('autopilot:run --sync-type=bizimhesap')
    ->everySixHours()
    ->withoutOverlapping()
    ->onOneServer()
    ->appendOutputTo(storage_path('logs/autopilot.log'))
    ->description('BizimHesap ürün senkronizasyonu');

// Queue worker health check - her 5 dakikada
Schedule::command('queue:monitor database --max=100')
    ->everyFiveMinutes()
    ->withoutOverlapping();

// Eski job kayıtlarını temizle - haftada bir
Schedule::command('model:prune --model=App\\Models\\BizimHesapSyncJob')
    ->weekly()
    ->description('Eski sync job kayıtlarını temizle');
