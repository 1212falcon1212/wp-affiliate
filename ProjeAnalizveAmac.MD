Amaç : 

- Laravel ve React kullanarak woocommerce api entegrasyon sistemi kurmak

Gereksinimler : 

- Ürün yönetimi : Woocommerce api'si üzerinden ürün çekme, ürün oluşturma, ürün varyasyon ekleme, ürün silme ve düzenleme işlemlerini yapmak. @BizimHesapAPI-Dokuman.MD dosyasından api bilgileri ile ürünleri çekip, woocommerce push ile gönderebilmek,

- Sipariş Yönetimi : Woocommerce üzerinden otomatik sipariş senkronu sağlamak, @BizimHesapAPI-Dokuman.MD dosyasından api bilgileri ile siparişleri bizim hesap paneline düşürüp, otomatik fatura kesebilmek.

- Affilate Yönetimi : Sisteme affilate sistemi ekleyeceğiz, affilate kişileri için kuponlar ve linkler oluşturacağız, woocommerce rest api üzeinden kupon oluşturma ve çekme işlemlerini gerçekleştireceezği, her affilate için, ödeme ve komisyon değerleri belirleyeceğiz.

Yukarıda 3 gereksinim sağlandıktan sonra, sistemi tam anlamıyla bir woocommerce yönetim merkezine çevireceğiz, tema, kategori, menü, içerik ve benzeri özellikleri woocommerce rest api ile oluşturacağız, sistemi yöneteceğiz.

Teknik Yapı : 

Backend : Laravel 12
Frontend : React (SPA Yapısı ile )
Database : MySQL

Tüm kodlar yazılırken, test edilebilir ve güvenli olmalıdır. Temiz kod standartlarına göre yazılacaktır, sistem her zaman responsive bir yapıda olmalıdır. Her yapılan işlem test edilecektir ve log yazılacaktır. 