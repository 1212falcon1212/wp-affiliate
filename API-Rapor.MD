# WooCommerce REST API Raporu

> **Paket:** `automattic/woocommerce` v3.1  
> **API Versiyonu:** wc/v3  
> **Rapor Tarihi:** 2026-01-03

---

## 📋 Özet

Bu rapor, projede kullanılan WooCommerce REST API v3'ün tüm endpoint'lerini ve mevcut implementasyon durumunu belgelemektedir.

| Kategori | Toplam Endpoint | Uygulandı | Bekliyor |
|----------|-----------------|-----------|----------|
| Ürünler | 15+ | 6 | 9+ |
| Siparişler | 10+ | 4 | 6+ |
| Müşteriler | 8+ | 0 | 8+ |
| Kuponlar | 5+ | 0 | 5+ |
| Raporlar | 6+ | 0 | 6+ |
| Webhooklar | 5+ | 1 | 4+ |
| **Toplam** | **49+** | **11** | **38+** |

---

## 🛍️ Ürünler (Products)

### Mevcut Uygulama

| Endpoint | HTTP Metodu | Durum | Dosya |
|----------|-------------|-------|-------|
| `products` | GET | ✅ Uygulandı | `WooCommerceService.php:28-40` |
| `products` (raw) | GET | ✅ Uygulandı | `WooCommerceService.php:45-54` |
| `products/{id}` | GET | ✅ Uygulandı | `WooCommerceService.php:86-95` |
| `products/{id}` | PUT | ✅ Uygulandı | `WooCommerceService.php:108-132` |
| `products/batch` | POST | ✅ Uygulandı | `WooCommerceService.php:134-149` |
| `products/{id}/variations` | GET | ✅ Uygulandı | `WooCommerceService.php:59-72` |

### API'de Mevcut Ama Henüz Uygulanmayan

| Endpoint | HTTP Metodu | Açıklama |
|----------|-------------|----------|
| `products` | POST | Yeni ürün oluştur |
| `products/{id}` | DELETE | Ürün sil |
| `products/categories` | GET | Kategorileri listele |
| `products/categories` | POST | Kategori oluştur |
| `products/categories/{id}` | PUT | Kategori güncelle |
| `products/categories/{id}` | DELETE | Kategori sil |
| `products/tags` | GET/POST/PUT/DELETE | Etiket işlemleri |
| `products/attributes` | GET/POST/PUT/DELETE | Özellik işlemleri |
| `products/attributes/{id}/terms` | GET/POST/PUT/DELETE | Özellik terimleri |
| `products/{id}/reviews` | GET/POST/PUT/DELETE | Ürün yorumları |
| `products/shipping_classes` | GET/POST/PUT/DELETE | Kargo sınıfları |

---

## 📦 Siparişler (Orders)

### Mevcut Uygulama

| Endpoint | HTTP Metodu | Durum | Dosya |
|----------|-------------|-------|-------|
| `orders` | GET | ✅ Uygulandı | `WooCommerceService.php:74-84` |
| `orders/{id}` | GET | ✅ Uygulandı | `WooCommerceService.php:97-106` |

### API'de Mevcut Ama Henüz Uygulanmayan

| Endpoint | HTTP Metodu | Açıklama |
|----------|-------------|----------|
| `orders` | POST | Yeni sipariş oluştur |
| `orders/{id}` | PUT | Sipariş güncelle (durum değiştir, not ekle) |
| `orders/{id}` | DELETE | Sipariş sil |
| `orders/batch` | POST | Toplu sipariş işlemleri |
| `orders/{id}/notes` | GET | Sipariş notlarını listele |
| `orders/{id}/notes` | POST | Sipariş notu ekle |
| `orders/{id}/notes/{note_id}` | DELETE | Sipariş notu sil |
| `orders/{id}/refunds` | GET | İadeleri listele |
| `orders/{id}/refunds` | POST | İade oluştur |
| `orders/{id}/refunds/{refund_id}` | DELETE | İade sil |

---

## 👥 Müşteriler (Customers)

### Mevcut Uygulama
❌ Henüz uygulanmadı

### API'de Mevcut Tüm Endpoint'ler

| Endpoint | HTTP Metodu | Açıklama |
|----------|-------------|----------|
| `customers` | GET | Müşteri listesi |
| `customers` | POST | Yeni müşteri oluştur |
| `customers/{id}` | GET | Müşteri detayı |
| `customers/{id}` | PUT | Müşteri güncelle |
| `customers/{id}` | DELETE | Müşteri sil |
| `customers/batch` | POST | Toplu müşteri işlemleri |
| `customers/{id}/downloads` | GET | Müşteri indirmeleri |

---

## 🎟️ Kuponlar (Coupons)

### Mevcut Uygulama
❌ Henüz uygulanmadı

### API'de Mevcut Tüm Endpoint'ler

| Endpoint | HTTP Metodu | Açıklama |
|----------|-------------|----------|
| `coupons` | GET | Kupon listesi |
| `coupons` | POST | Yeni kupon oluştur |
| `coupons/{id}` | GET | Kupon detayı |
| `coupons/{id}` | PUT | Kupon güncelle |
| `coupons/{id}` | DELETE | Kupon sil |
| `coupons/batch` | POST | Toplu kupon işlemleri |

---

## 📊 Raporlar (Reports)

### Mevcut Uygulama
❌ Henüz uygulanmadı

### API'de Mevcut Tüm Endpoint'ler

| Endpoint | HTTP Metodu | Açıklama |
|----------|-------------|----------|
| `reports` | GET | Mevcut rapor türlerini listele |
| `reports/sales` | GET | Satış raporu |
| `reports/top_sellers` | GET | En çok satanlar |
| `reports/coupons/totals` | GET | Kupon istatistikleri |
| `reports/customers/totals` | GET | Müşteri istatistikleri |
| `reports/orders/totals` | GET | Sipariş istatistikleri |
| `reports/products/totals` | GET | Ürün istatistikleri |
| `reports/reviews/totals` | GET | Yorum istatistikleri |

---

## 🔔 Webhook'lar

### Mevcut Uygulama

| Endpoint/İşlev | Durum | Dosya |
|----------------|-------|-------|
| Webhook dinleme | ✅ Uygulandı | `routes/api.php`, `ProcessWooCommerceWebhook.php` |

### API'de Mevcut Ama Henüz Uygulanmayan

| Endpoint | HTTP Metodu | Açıklama |
|----------|-------------|----------|
| `webhooks` | GET | Webhook listesi |
| `webhooks` | POST | Webhook oluştur |
| `webhooks/{id}` | GET | Webhook detayı |
| `webhooks/{id}` | PUT | Webhook güncelle |
| `webhooks/{id}` | DELETE | Webhook sil |

---

## ⚙️ Sistem Ayarları (Settings)

### Mevcut Uygulama
❌ Henüz uygulanmadı

### API'de Mevcut Tüm Endpoint'ler

| Endpoint | HTTP Metodu | Açıklama |
|----------|-------------|----------|
| `settings` | GET | Ayar grupları |
| `settings/{group}` | GET | Grup ayarları |
| `settings/{group}/{id}` | GET | Tekil ayar |
| `settings/{group}/{id}` | PUT | Ayar güncelle |
| `settings/batch` | POST | Toplu ayar güncelle |

---

## 🚚 Kargo (Shipping)

### Mevcut Uygulama
❌ Henüz uygulanmadı

### API'de Mevcut Tüm Endpoint'ler

| Endpoint | HTTP Metodu | Açıklama |
|----------|-------------|----------|
| `shipping/zones` | GET | Kargo bölgeleri |
| `shipping/zones` | POST | Bölge oluştur |
| `shipping/zones/{id}` | GET/PUT/DELETE | Bölge işlemleri |
| `shipping/zones/{id}/locations` | GET/PUT | Bölge konumları |
| `shipping/zones/{id}/methods` | GET/POST | Kargo metodları |
| `shipping_methods` | GET | Mevcut kargo metodları |

---

## 💳 Ödeme (Payment)

### Mevcut Uygulama
❌ Henüz uygulanmadı

### API'de Mevcut Tüm Endpoint'ler

| Endpoint | HTTP Metodu | Açıklama |
|----------|-------------|----------|
| `payment_gateways` | GET | Ödeme kapıları listesi |
| `payment_gateways/{id}` | GET | Ödeme kapısı detayı |
| `payment_gateways/{id}` | PUT | Ödeme kapısı güncelle |

---

## 💰 Vergiler (Taxes)

### Mevcut Uygulama
❌ Henüz uygulanmadı

### API'de Mevcut Tüm Endpoint'ler

| Endpoint | HTTP Metodu | Açıklama |
|----------|-------------|----------|
| `taxes` | GET | Vergi oranları |
| `taxes` | POST | Vergi oranı oluştur |
| `taxes/{id}` | GET/PUT/DELETE | Vergi oranı işlemleri |
| `taxes/classes` | GET | Vergi sınıfları |
| `taxes/classes` | POST | Vergi sınıfı oluştur |
| `taxes/classes/{slug}` | DELETE | Vergi sınıfı sil |

---

## 📌 Sonraki Adımlar - Önerilen İmplementasyonlar

Öncelik sırasına göre uygulanması önerilen endpoint'ler:

### Yüksek Öncelik
1. **`orders/{id}` PUT** - Sipariş durumu güncelleme
2. **`customers` GET** - Müşteri listesi çekme
3. **`reports/sales` GET** - Satış raporları

### Orta Öncelik
4. **`orders/{id}/notes` POST** - Sipariş notu ekleme
5. **`products/categories` GET** - WooCommerce'dan kategori senkronizasyonu
6. **`coupons` GET/POST** - Kupon yönetimi

### Düşük Öncelik
7. **`shipping/zones`** - Kargo bölgeleri yönetimi
8. **`payment_gateways`** - Ödeme kapıları bilgisi
9. **`taxes`** - Vergi yönetimi

---

## 🔧 Teknik Notlar

### Mevcut SDK Kullanımı

```php
// Client oluşturma
$this->client = new Client(
    config('services.woocommerce.url'),
    config('services.woocommerce.key'),
    config('services.woocommerce.secret'),
    ['version' => 'wc/v3']
);

// GET isteği
$this->client->get('products', ['per_page' => 100]);

// POST isteği
$this->client->post('products/batch', ['update' => $data]);

// PUT isteği
$this->client->put("products/{$id}", ['stock_quantity' => $qty]);

// DELETE isteği (henüz kullanılmıyor)
$this->client->delete("products/{$id}");
```

### Rate Limiting
- WooCommerce API'si varsayılan olarak rate limiting uygulamaz
- Ancak batch endpoint'ler (toplu işlemler) 100 item/istek ile sınırlıdır
- Mevcut implementasyon 50 item'lık chunk'lar kullanmaktadır

### Pagination
- Maksimum `per_page`: 100
- Header'dan toplam kayıt ve sayfa bilgisi alınabilir:
  - `X-WP-Total`: Toplam kayıt sayısı
  - `X-WP-TotalPages`: Toplam sayfa sayısı

---

## 📚 Resmi Dokümantasyon

- [WooCommerce REST API Docs](https://woocommerce.github.io/woocommerce-rest-api-docs/)
- [Automattic/WooCommerce PHP Client](https://github.com/woocommerce/wc-api-php)
