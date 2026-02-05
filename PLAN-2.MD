Görev: Laravel 12 API ve React SPA (Vite) üzerinde, WooCommerce ve ERP (Bizimhesap) senkronizasyonunu yöneten "Inventory Control Center" modülünü inşa et.

Teknik Detaylar ve Beklentiler:

1. Backend: Product & Sync Engine
Product Mapping Logic: product_mappings tablosunu kullanarak ERP'den gelen ürünleri WooCommerce ürünleri/varyasyonları ile eşleştir. SKU bazlı kontrol sağla.

Bizimhesap Sync Service: > - Bizimhesap API'den ürün listesini çeken bir fetchFromERP() metodu yaz.

Gelen veriyi (Fiyat, Stok, İsim, Varyasyon) daha önce oluşturulan ProductDTO formatına dönüştür.

Push to WC: Değişen verileri WooCommerce API'nin /products/batch endpoint'ini kullanarak toplu şekilde güncelle.

Variation Manager: Varyasyonlu ürünlerin (Beden, Renk vb.) ana ürünle olan ilişkisini bozmadan fiyat ve stok senkronizasyonunu sağlayan logic'i kur.

Category Manager: WooCommerce kategori ağacını API üzerinden çek ve ERP kategorileri ile eşleştirme yapabilen bir servis katmanı ekle.

2. Frontend: Catalog Management UI (React & Shadcn)
Product Card Design: > - Liste yapısı yerine Responsive Card yapısını kullan.

Kart üzerinde: Ürün görseli, SKU, Stok (badge ile), Fiyat (ERP vs Site fiyatı), ve Senkronizasyon durumu (Senkronize/Hata) yer almalı.

Karanlık/Aydınlık mod tam uyumlu olmalı.

Bulk Actions: Birden fazla kartı seçip "Toplu Fiyat Güncelle", "Toplu Stok Senkronize Et" veya "Sitede Gizle" işlemlerini yapacak bir Action Toolbar ekle.

Filters & Search: Ürün adına, SKU'ya, kategoriye ve stok durumuna göre (Azalan stoklar vb.) gelişmiş filtreleme bileşeni hazırla.

Edit Modal: Ürün kartına tıklandığında açılan, hızlıca fiyat/stok/isim değiştiren ve anında hem ERP'ye hem WC'ye sinyal gönderen bir Shadcn Modal kur.

3. Veri Güvenliği ve Performans
Redis Locking: Aynı ürünün aynı anda iki kez senkronize edilmesini önlemek için atomic locks kullan.

Sync Logs: Her senkronizasyon işleminin sonucunu (başarılı/hata + hata detayı) bir log tablosuna kaydet.

Rate Limiting: WooCommerce API limitlerine takılmamak için batch işlemlerini 50'şerli gruplar halinde işle.

Laravel 12'nin "Concurrency" özelliklerini veya "Task Scheduling" yapısını kullanarak, gece saat 03:00'te tüm stokları otomatik olarak Bizimhesap'tan çekip siteye basacak bir "Auto-Pilot" modunu EKLE.

Senden Beklenen: Önce backend servis katmanındaki ProductSyncService yapısını ve frontend'deki ProductCard component'inin kodlarını hazırla. Eksik bir Mapping veya API endpoint'i kalmadığından emin ol.