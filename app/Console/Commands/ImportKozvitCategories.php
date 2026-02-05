<?php

namespace App\Console\Commands;

use App\Services\Import\KozvitImportService;
use Illuminate\Console\Command;

class ImportKozvitCategories extends Command
{
    protected $signature = 'kozvit:import-categories
                            {--file= : JSON dosya yolu (varsayılan: kozvit_categories.json)}
                            {--dry-run : Test modu - WooCommerce\'e göndermez}
                            {--limit= : Sadece ilk N ana kategoriyi import et}';

    protected $description = 'Kozvit kategorilerini WooCommerce\'e import et';

    public function handle(KozvitImportService $importService): int
    {
        $filePath = $this->option('file') ?: base_path('kozvit_categories.json');
        $dryRun = $this->option('dry-run');
        $limit = $this->option('limit') ? (int) $this->option('limit') : null;

        if (! file_exists($filePath)) {
            $this->error("Dosya bulunamadı: {$filePath}");

            return self::FAILURE;
        }

        // Show stats first
        $stats = $importService->getCategoryStats($filePath);
        $this->info('');
        $this->info('=== Kozvit Kategori Import ===');
        $this->info('');
        $this->table(
            ['Metrik', 'Değer'],
            [
                ['Ana Kategoriler', $stats['main_categories']],
                ['Alt Kategoriler', $stats['sub_categories']],
                ['Toplam', $stats['total']],
            ]
        );

        if ($dryRun) {
            $this->warn('');
            $this->warn('DRY-RUN MODU - WooCommerce\'e veri gönderilmeyecek');
        }

        if ($limit) {
            $this->info("Limit: İlk {$limit} ana kategori");
        }

        $this->info('');

        if (! $dryRun && ! $this->confirm('Kategorileri import etmek istiyor musunuz?')) {
            $this->info('İptal edildi.');

            return self::SUCCESS;
        }

        $this->info('');
        $this->info('Import başlıyor...');
        $this->info('');

        $startTime = microtime(true);

        try {
            $results = $importService->importCategories($filePath, $dryRun, $limit);

            $elapsed = round(microtime(true) - $startTime, 2);

            $this->info('');
            $this->info('=== Sonuçlar ===');
            $this->info('');
            $this->table(
                ['Metrik', 'Değer'],
                [
                    ['Ana Kategori (Toplam)', $results['total_main']],
                    ['Ana Kategori (Oluşturulan)', $results['created_main']],
                    ['Alt Kategori (Toplam)', $results['total_sub']],
                    ['Alt Kategori (Oluşturulan)', $results['created_sub']],
                    ['Atlan', $results['skipped']],
                    ['Hata', count($results['errors'])],
                    ['Süre', "{$elapsed}s"],
                ]
            );

            if (! empty($results['errors'])) {
                $this->error('');
                $this->error('Hatalar:');
                foreach (array_slice($results['errors'], 0, 10) as $error) {
                    $this->error("  - {$error}");
                }
                if (count($results['errors']) > 10) {
                    $this->error('  ... ve '.(count($results['errors']) - 10).' hata daha');
                }
            }

            if ($dryRun && $this->option('verbose')) {
                $this->info('');
                $this->info('Kategori Mapping:');
                foreach (array_slice($results['mapping'], 0, 20, true) as $name => $id) {
                    $this->line("  {$name} => {$id}");
                }
                if (count($results['mapping']) > 20) {
                    $this->line('  ... ve '.(count($results['mapping']) - 20).' kategori daha');
                }
            }

            return self::SUCCESS;
        } catch (\Throwable $e) {
            $this->error('');
            $this->error('Import hatası: '.$e->getMessage());

            return self::FAILURE;
        }
    }
}
