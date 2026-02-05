<?php

namespace App\Console\Commands;

use App\Models\KozvitProduct;
use App\Services\WooCommerce\WooCommerceService;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

class SyncKozvitBrands extends Command
{
    protected $signature = 'kozvit:sync-brands
                            {--dry-run : Test modu - WooCommerce\'e göndermez}
                            {--list : Sadece markaları listele}';

    protected $description = 'Kozvit ürünlerindeki markaları WooCommerce\'e attribute olarak senkronize et';

    protected ?int $brandAttributeId = null;

    protected array $existingTerms = [];

    public function __construct(
        protected WooCommerceService $wooCommerce
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        $dryRun = $this->option('dry-run');
        $listOnly = $this->option('list');

        $this->info('');
        $this->info('=== Kozvit Marka Senkronizasyonu ===');
        $this->info('');

        // Get unique brands from DB
        $brands = KozvitProduct::whereNotNull('brand')
            ->where('brand', '!=', '')
            ->distinct()
            ->pluck('brand')
            ->sort()
            ->values()
            ->toArray();

        $this->info('Veritabanındaki benzersiz marka sayısı: '.count($brands));
        $this->info('');

        if ($listOnly) {
            $this->table(['#', 'Marka', 'Slug'], collect($brands)->map(fn ($b, $i) => [
                $i + 1,
                $b,
                Str::slug($b),
            ])->toArray());

            return self::SUCCESS;
        }

        if ($dryRun) {
            $this->warn('DRY-RUN MODU - WooCommerce\'e gönderilmeyecek');
            $this->info('');
        }

        // Step 1: Find or create "Marka" attribute
        $this->info('Adım 1: "Marka" attribute kontrolü...');

        if (! $dryRun) {
            $this->brandAttributeId = $this->findOrCreateBrandAttribute();

            if (! $this->brandAttributeId) {
                $this->error('Marka attribute oluşturulamadı!');

                return self::FAILURE;
            }

            $this->info("  ✓ Marka attribute ID: {$this->brandAttributeId}");

            // Get existing terms
            $this->existingTerms = $this->getExistingTermsMap();
            $this->info('  ✓ Mevcut term sayısı: '.count($this->existingTerms));
        } else {
            $this->info('  ~ DRY-RUN: Attribute kontrolü atlandı');
        }

        $this->info('');
        $this->info('Adım 2: Marka term\'lerini oluşturma...');
        $this->info('');

        $results = [
            'total' => count($brands),
            'created' => 0,
            'skipped' => 0,
            'errors' => [],
        ];

        foreach ($brands as $index => $brand) {
            $current = $index + 1;
            $total = count($brands);
            $slug = Str::slug($brand);

            // Check if already exists
            if (isset($this->existingTerms[$slug])) {
                $this->line("  [{$current}/{$total}] ○ {$brand} - Zaten var (ID: {$this->existingTerms[$slug]})");
                $results['skipped']++;

                continue;
            }

            if ($dryRun) {
                $this->line("  [{$current}/{$total}] ~ {$brand} - Oluşturulacak (slug: {$slug})");
                $results['created']++;

                continue;
            }

            try {
                $term = $this->wooCommerce->createAttributeTerm($this->brandAttributeId, [
                    'name' => $brand,
                    'slug' => $slug,
                ]);

                if ($term && isset($term['id'])) {
                    $this->existingTerms[$slug] = $term['id'];
                    $this->line("  [{$current}/{$total}] ✓ {$brand} - Oluşturuldu (ID: {$term['id']})");
                    $results['created']++;
                } else {
                    throw new \Exception('Term oluşturulamadı');
                }
            } catch (\Throwable $e) {
                $this->error("  [{$current}/{$total}] ✗ {$brand} - HATA: {$e->getMessage()}");
                $results['errors'][] = ['brand' => $brand, 'error' => $e->getMessage()];
            }
        }

        $this->info('');
        $this->info('=== Sonuçlar ===');
        $this->table(
            ['Metrik', 'Değer'],
            [
                ['Toplam Marka', $results['total']],
                ['Oluşturulan', $results['created']],
                ['Atlanan (mevcut)', $results['skipped']],
                ['Hata', count($results['errors'])],
            ]
        );

        if (! $dryRun && $this->brandAttributeId) {
            $this->info('');
            $this->info("Marka Attribute ID: {$this->brandAttributeId}");
            $this->info('Bu ID\'yi .env dosyasına ekleyebilirsiniz:');
            $this->info("WOOCOMMERCE_BRAND_ATTRIBUTE_ID={$this->brandAttributeId}");
        }

        return self::SUCCESS;
    }

    protected function findOrCreateBrandAttribute(): ?int
    {
        // Get all attributes
        $attributes = $this->wooCommerce->getAttributes();

        // Find "Marka" or "Brand" attribute
        foreach ($attributes as $attr) {
            $name = strtolower($attr['name'] ?? '');
            $slug = $attr['slug'] ?? '';

            if (in_array($name, ['marka', 'brand']) || in_array($slug, ['pa_marka', 'pa_brand', 'marka', 'brand'])) {
                $this->info("  Mevcut attribute bulundu: {$attr['name']} (ID: {$attr['id']})");

                return $attr['id'];
            }
        }

        // Create new attribute
        $this->info('  Marka attribute bulunamadı, yeni oluşturuluyor...');

        $newAttr = $this->wooCommerce->createAttribute([
            'name' => 'Marka',
            'slug' => 'marka',
            'type' => 'select',
            'order_by' => 'name',
            'has_archives' => true,
        ]);

        if ($newAttr && isset($newAttr['id'])) {
            $this->info("  Yeni attribute oluşturuldu: Marka (ID: {$newAttr['id']})");

            return $newAttr['id'];
        }

        return null;
    }

    protected function getExistingTermsMap(): array
    {
        if (! $this->brandAttributeId) {
            return [];
        }

        $terms = $this->wooCommerce->getAttributeTerms($this->brandAttributeId);
        $map = [];

        foreach ($terms as $term) {
            $slug = $term['slug'] ?? Str::slug($term['name'] ?? '');
            $map[$slug] = $term['id'];
        }

        return $map;
    }
}
