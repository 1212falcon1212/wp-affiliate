# Auto-Deploy Kurulum Rehberi

Bu rehber, GitHub'dan push yapıldığında sunucunun otomatik deploy yapması için gereken adımları açıklar.

## 1. Sunucu Gereksinimleri

```bash
# Gerekli yazılımlar
- PHP 8.2+
- Composer
- Node.js 18+ & NPM
- Git
- Supervisor (queue worker için)
```

## 2. Sunucu Kurulumu

### 2.1 Projeyi Klonlayın

```bash
cd /var/www
git clone https://github.com/1212falcon1212/wp-affiliate.git
cd wp-affiliate
```

### 2.2 Deploy Script'e Yetki Verin

```bash
chmod +x deploy.sh
```

### 2.3 Environment Dosyasını Oluşturun

```bash
cp .env.example .env
nano .env
```

Aşağıdaki değerleri ekleyin:

```env
# Deploy Settings
DEPLOY_BRANCH=main
DEPLOY_WEBHOOK_SECRET=your-secret-key-here

# Database
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=wp_affiliate
DB_USERNAME=your_db_user
DB_PASSWORD=your_db_password

# WooCommerce
WOOCOMMERCE_URL=https://your-store.com
WOOCOMMERCE_CONSUMER_KEY=ck_xxx
WOOCOMMERCE_CONSUMER_SECRET=cs_xxx

# BizimHesap
BIZIMHESAP_API_URL=https://api.bizimhesap.com
BIZIMHESAP_API_KEY=your_api_key
```

### 2.4 İlk Kurulum

```bash
composer install --no-dev --optimize-autoloader
npm ci
npm run build
php artisan key:generate
php artisan migrate --force
php artisan storage:link
```

### 2.5 Dosya İzinleri

```bash
chown -R www-data:www-data /var/www/wp-affiliate
chmod -R 775 storage bootstrap/cache
```

## 3. GitHub Webhook Kurulumu

### 3.1 Secret Key Oluşturun

```bash
openssl rand -hex 32
# Çıktıyı kopyalayın
```

### 3.2 GitHub Webhook Ekleyin

1. GitHub repo sayfasına gidin: https://github.com/1212falcon1212/wp-affiliate/settings/hooks
2. "Add webhook" tıklayın
3. Ayarları girin:

| Alan | Değer |
|------|-------|
| Payload URL | `https://your-domain.com/api/deploy/webhook` |
| Content type | `application/json` |
| Secret | Oluşturduğunuz secret key |
| Events | Just the push event |
| Active | ✓ |

4. "Add webhook" tıklayın

### 3.3 .env'ye Secret'ı Ekleyin

```bash
nano /var/www/wp-affiliate/.env
# DEPLOY_WEBHOOK_SECRET=<your-secret-key>
```

## 4. Nginx Konfigürasyonu

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/wp-affiliate/public;

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";

    index index.php;

    charset utf-8;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location = /favicon.ico { access_log off; log_not_found off; }
    location = /robots.txt  { access_log off; log_not_found off; }

    error_page 404 /index.php;

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_hide_header X-Powered-By;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}
```

## 5. Supervisor (Queue Worker)

```bash
sudo nano /etc/supervisor/conf.d/wp-affiliate-worker.conf
```

```ini
[program:wp-affiliate-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/wp-affiliate/artisan queue:work --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=www-data
numprocs=2
redirect_stderr=true
stdout_logfile=/var/www/wp-affiliate/storage/logs/worker.log
stopwaitsecs=3600
```

```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start wp-affiliate-worker:*
```

## 6. Test

### Local'den Push Yapın

```bash
git add .
git commit -m "Test deploy"
git push origin main
```

### Webhook Log'unu Kontrol Edin

```bash
tail -f /var/www/wp-affiliate/storage/logs/deploy.log
```

### Deploy Status API

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-domain.com/api/deploy/status
```

## 7. Manuel Deploy

Dashboard üzerinden veya API ile:

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-domain.com/api/deploy/trigger
```

## 8. Sorun Giderme

### Webhook Çalışmıyor
- GitHub webhook settings'den "Recent Deliveries" kontrol edin
- Secret key'in eşleştiğinden emin olun
- Nginx/Apache log'larını kontrol edin

### Deploy Script Hatası
```bash
# Manuel çalıştırıp test edin
cd /var/www/wp-affiliate
bash deploy.sh
```

### Permission Denied
```bash
chown -R www-data:www-data /var/www/wp-affiliate
chmod -R 775 storage bootstrap/cache
```

### Queue Worker Çalışmıyor
```bash
sudo supervisorctl status
sudo supervisorctl restart wp-affiliate-worker:*
```

---

## Özet: Kurulum Adımları

1. ✅ Sunucuya SSH ile bağlan
2. ✅ Projeyi klonla
3. ✅ `.env` dosyasını yapılandır
4. ✅ `composer install && npm ci && npm run build`
5. ✅ GitHub webhook ekle
6. ✅ Nginx/Apache yapılandır
7. ✅ Supervisor kur (opsiyonel)
8. ✅ Test et: `git push origin main`
