<?php

namespace App\Console\Commands;

use App\Models\KozvitProduct;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

class GenerateKozvitDescriptions extends Command
{
    protected $signature = 'kozvit:generate-descriptions
                            {--id= : Tek bir ürün için ID}
                            {--dry-run : Test modu - DB\'ye kaydetmez}
                            {--offset=0 : Başlangıç indexi}
                            {--limit=10 : İşlenecek ürün sayısı}
                            {--all : Tüm ürünleri işle}
                            {--only-empty : Sadece açıklaması boş olanları işle}
                            {--force : Mevcut açıklamaların üzerine yaz}';

    protected $description = 'Kozvit ürünleri için SEO açıklamaları oluştur';

    public function handle(): int
    {
        $dryRun = $this->option('dry-run');
        $singleId = $this->option('id');
        $onlyEmpty = $this->option('only-empty');
        $force = $this->option('force');

        $this->info('');
        $this->info('=== Kozvit Açıklama Oluşturucu ===');
        $this->info('');

        // Single product mode
        if ($singleId) {
            return $this->processSingleProduct((int) $singleId, $dryRun);
        }

        // Batch mode
        return $this->processBatch($dryRun, $onlyEmpty, $force);
    }

    protected function processSingleProduct(int $id, bool $dryRun): int
    {
        $product = KozvitProduct::find($id);

        if (! $product) {
            $this->error("Ürün bulunamadı: ID {$id}");

            return self::FAILURE;
        }

        $this->info("Ürün: {$product->name}");
        $this->info("Barkod: {$product->barcode}");
        $this->info("Kategori: {$product->main_category} > {$product->sub_category}");
        $this->info('');

        $description = $this->generateDescription($product);

        $this->info('Oluşturulan Açıklama:');
        $this->line('');
        $this->line($description);
        $this->line('');

        $this->info('HTML Önizleme:');
        $this->line(strip_tags($description));
        $this->line('');

        if ($dryRun) {
            $this->warn('DRY-RUN: Veritabanına kaydedilmedi');

            return self::SUCCESS;
        }

        if ($this->confirm('Bu açıklamayı kaydetmek istiyor musunuz?')) {
            $product->update(['description' => $description]);
            $this->info('Açıklama kaydedildi!');

            // Mark as pending if was synced
            if ($product->sync_status === KozvitProduct::STATUS_SYNCED) {
                $product->update(['sync_status' => KozvitProduct::STATUS_PENDING]);
                $this->warn('Ürün tekrar senkronize edilmek üzere "Bekliyor" olarak işaretlendi.');
            }
        }

        return self::SUCCESS;
    }

    protected function processBatch(bool $dryRun, bool $onlyEmpty, bool $force): int
    {
        $offset = (int) $this->option('offset');
        $limit = (int) $this->option('limit');
        $processAll = $this->option('all');

        // Build query
        $query = KozvitProduct::query();

        if ($onlyEmpty) {
            $query->where(function ($q) {
                $q->whereNull('description')
                    ->orWhere('description', '');
            });
        }

        $totalCount = $query->count();

        if ($processAll) {
            $limit = $totalCount;
        }

        $this->table(
            ['Metrik', 'Değer'],
            [
                ['Toplam Ürün (filtrelenmiş)', $totalCount],
                ['Offset', $offset],
                ['Limit', $processAll ? 'TÜMÜ' : $limit],
                ['Sadece Boş Olanlar', $onlyEmpty ? 'Evet' : 'Hayır'],
                ['Üzerine Yaz', $force ? 'Evet' : 'Hayır'],
                ['Dry Run', $dryRun ? 'Evet' : 'Hayır'],
            ]
        );

        if ($dryRun) {
            $this->warn('');
            $this->warn('DRY-RUN MODU - Veritabanına kayıt yapılmayacak');
        }

        if (! $dryRun && ! $this->confirm('Devam etmek istiyor musunuz?')) {
            $this->info('İptal edildi.');

            return self::SUCCESS;
        }

        $products = $query->offset($offset)->limit($limit)->get();

        $results = [
            'processed' => 0,
            'updated' => 0,
            'skipped' => 0,
            'errors' => [],
        ];

        $this->info('');
        $this->info('İşleniyor...');
        $this->info('');

        foreach ($products as $index => $product) {
            $current = $index + 1;
            $total = $products->count();

            // Skip if has description and not forcing
            if (! $force && ! empty($product->description)) {
                $this->line("  [{$current}/{$total}] ○ {$product->barcode} - Atlandı (mevcut açıklama var)");
                $results['skipped']++;

                continue;
            }

            try {
                $description = $this->generateDescription($product);
                $results['processed']++;

                if (! $dryRun) {
                    $product->update(['description' => $description]);

                    // Mark as pending if was synced
                    if ($product->sync_status === KozvitProduct::STATUS_SYNCED) {
                        $product->update(['sync_status' => KozvitProduct::STATUS_PENDING]);
                    }

                    $results['updated']++;
                }

                $statusIcon = $dryRun ? '~' : '✓';
                $name = mb_substr($product->name, 0, 40);
                $this->line("  [{$current}/{$total}] {$statusIcon} {$product->barcode} - {$name}");

            } catch (\Throwable $e) {
                $results['errors'][] = [
                    'id' => $product->id,
                    'barcode' => $product->barcode,
                    'error' => $e->getMessage(),
                ];
                $this->error("  [{$current}/{$total}] ✗ {$product->barcode} - HATA: {$e->getMessage()}");
            }
        }

        $this->info('');
        $this->info('=== Sonuçlar ===');
        $this->table(
            ['Metrik', 'Değer'],
            [
                ['İşlenen', $results['processed']],
                ['Güncellenen', $results['updated']],
                ['Atlanan', $results['skipped']],
                ['Hata', count($results['errors'])],
            ]
        );

        // Next batch info
        if (! $processAll && $offset + $limit < $totalCount) {
            $nextOffset = $offset + $limit;
            $remaining = $totalCount - $nextOffset;
            $this->info('');
            $this->info("Sonraki batch için: php artisan kozvit:generate-descriptions --offset={$nextOffset} --limit={$limit}");
            $this->info("Kalan ürün: {$remaining}");
        }

        return self::SUCCESS;
    }

    protected function generateDescription(KozvitProduct $product): string
    {
        $productName = $product->name;
        $mainCategory = $product->main_category;
        $subCategory = $product->sub_category;

        // Generate category slug
        $categorySlug = $this->generateCategorySlug($mainCategory, $subCategory);

        // Determine display category name (prefer sub_category if exists)
        $categoryDisplayName = $subCategory ?: $mainCategory ?: 'Ürünler';

        // Build description with HTML links
        $description = sprintf(
            '%s ürününe uygun fiyat ve hızlı kargo seçenekleri ile <a href="/">İstanbul Vitamin</a>\'den ulaşabilirsiniz. <a href="%s">%s</a> kategorisindeki diğer ürünlerimizi inceleyebilirsiniz.',
            htmlspecialchars($productName),
            $categorySlug,
            htmlspecialchars($categoryDisplayName)
        );

        return $description;
    }

    protected function generateCategorySlug(?string $mainCategory, ?string $subCategory): string
    {
        $basePath = '/product-category';

        if (! $mainCategory) {
            return $basePath.'/';
        }

        $mainSlug = Str::slug($mainCategory);

        if (! $subCategory) {
            return "{$basePath}/{$mainSlug}/";
        }

        $subSlug = Str::slug($subCategory);

        return "{$basePath}/{$mainSlug}/{$subSlug}/";
    }
}
