<?php

namespace App\Console\Commands;

use App\Models\KozvitProduct;
use App\Services\Import\KozvitImportService;
use Illuminate\Console\Command;

class ImportKozvitProducts extends Command
{
    protected $signature = 'kozvit:import-products
                            {--file= : JSON dosya yolu (varsayılan: kozvit_products.json)}
                            {--dry-run : Test modu - DB\'ye kaydetmez}
                            {--offset=0 : Başlangıç indexi}
                            {--limit=10 : Import edilecek ürün sayısı}
                            {--all : Tüm ürünleri import et}';

    protected $description = 'Kozvit ürünlerini JSON\'dan veritabanına import et';

    public function handle(KozvitImportService $importService): int
    {
        $filePath = $this->option('file') ?: base_path('kozvit_products.json');
        $dryRun = $this->option('dry-run');
        $offset = (int) $this->option('offset');
        $limit = (int) $this->option('limit');
        $importAll = $this->option('all');

        if (! file_exists($filePath)) {
            $this->error("Dosya bulunamadı: {$filePath}");

            return self::FAILURE;
        }

        // Get counts
        $totalInJson = $importService->getProductCount($filePath);
        $totalInDb = KozvitProduct::count();
        $pendingInDb = KozvitProduct::pending()->count();
        $syncedInDb = KozvitProduct::synced()->count();

        $this->info('');
        $this->info('=== Kozvit Ürün Import (JSON → DB) ===');
        $this->info('');
        $this->table(
            ['Metrik', 'Değer'],
            [
                ['JSON\'daki Ürün', $totalInJson],
                ['DB\'deki Ürün', $totalInDb],
                ['Bekleyen (pending)', $pendingInDb],
                ['Senkronize (synced)', $syncedInDb],
                ['Offset', $offset],
                ['Limit', $importAll ? 'TÜMÜ' : $limit],
            ]
        );

        if ($dryRun) {
            $this->warn('');
            $this->warn('DRY-RUN MODU - Veritabanına kayıt yapılmayacak');
        }

        if ($importAll) {
            $limit = $totalInJson - $offset;
            $this->warn('');
            $this->warn("DİKKAT: {$limit} ürün import edilecek!");

            if (! $dryRun && ! $this->confirm('Devam etmek istiyor musunuz?')) {
                $this->info('İptal edildi.');

                return self::SUCCESS;
            }
        }

        $this->info('');

        if (! $dryRun && ! $importAll && ! $this->confirm("Offset {$offset}'dan başlayarak {$limit} ürün import edilecek. Devam?")) {
            $this->info('İptal edildi.');

            return self::SUCCESS;
        }

        $this->info('');
        $this->info('Import başlıyor...');
        $this->info('');

        $startTime = microtime(true);

        try {
            // Progress callback
            $progressCallback = function ($current, $total, $result) {
                $status = $result['status'] ?? 'unknown';
                $barcode = $result['barcode'] ?? '-';
                $name = mb_substr($result['name'] ?? '-', 0, 40);

                $statusIcon = match ($status) {
                    'created' => '✓',
                    'updated' => '↻',
                    'skipped' => '○',
                    'dry_run' => '~',
                    default => '?',
                };

                $this->line("  [{$current}/{$total}] {$statusIcon} {$barcode} - {$name}");
            };

            $results = $importService->importProducts(
                $filePath,
                $dryRun,
                $offset,
                $limit,
                $progressCallback
            );

            $elapsed = round(microtime(true) - $startTime, 2);

            $this->info('');
            $this->info('=== Sonuçlar ===');
            $this->info('');
            $this->table(
                ['Metrik', 'Değer'],
                [
                    ['İşlenen', $results['total']],
                    ['Yeni Oluşturulan', $results['created']],
                    ['Güncellenen', $results['updated'] ?? 0],
                    ['Atlanan', $results['skipped']],
                    ['Hata', count($results['errors'])],
                    ['Süre', "{$elapsed}s"],
                ]
            );

            // Show errors if any
            if (! empty($results['errors'])) {
                $this->error('');
                $this->error('Hatalar:');
                foreach (array_slice($results['errors'], 0, 10) as $error) {
                    $this->error("  - [{$error['barcode']}] {$error['name']}: {$error['error']}");
                }
                if (count($results['errors']) > 10) {
                    $this->error('  ... ve '.(count($results['errors']) - 10).' hata daha');
                }
            }

            // Next batch info
            if (! $importAll && $offset + $limit < $totalInJson) {
                $nextOffset = $offset + $limit;
                $remaining = $totalInJson - $nextOffset;
                $this->info('');
                $this->info("Sonraki batch için: php artisan kozvit:import-products --offset={$nextOffset} --limit={$limit}");
                $this->info("Kalan ürün: {$remaining}");
            } else {
                $this->info('');
                $this->info('Tüm ürünler veritabanına import edildi.');
                $this->info('WooCommerce\'e göndermek için: php artisan kozvit:push-products');
            }

            return self::SUCCESS;
        } catch (\Throwable $e) {
            $this->error('');
            $this->error('Import hatası: '.$e->getMessage());

            return self::FAILURE;
        }
    }
}
