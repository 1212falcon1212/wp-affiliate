Görev: Laravel 12 API ve React (Vite) kullanarak "Full-Functional WooCommerce & ERP & Affiliate" yönetim sisteminin Faz 1 altyapısını kur.

Teknik Mimari Gereksinimleri:

Data Transfer Objects (DTO): WooCommerce'den gelen ham JSON verisini, sistemimizde kullanacağımız standart bir OrderDTO ve ProductDTO yapısına dönüştürecek sınıfları yaz.

Interface Based Service Layer: ERPInterface ve CommerceInterface oluştur. WooCommerceService bu interface'i implement etmeli. Yarın Shopify'a geçsek bile controller kodumuz değişmemeli.

Webhook Management: WooCommerce'den gelecek webshoot'ları karşıla ve Spatie/laravel-webhook-client (veya benzeri) bir yapı ile loglayarak Redis kuyruğuna (Job) aktar.

Database Design: > - products tablosu (erp_id, commerce_id, sku, price, stock, sync_status).

affiliate_referrals tablosu (id, affiliate_id, order_id, commission_amount, status).

settings tablosu (key, value, group) - Mağaza ayarlarını API üzerinden burada cache'leyeceğiz.

React SPA Base: Shadcn UI, Tailwind ve Lucide Icons kullanarak "Sidebar" ve "Dashboard Layout" yapısını kur. Dark mode desteği standart olmalı.

Önemli: Kodlar Laravel 12 standartlarında, Type-hinting içeren ve SOLID prensiplerine uygun olmalı. Önce klasör yapısını planla, sonra kodlamaya geç.