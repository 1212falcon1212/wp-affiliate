import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Star, Package, DollarSign, Tag, Image as ImageIcon, Layers, Info } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ProductDetail {
    id: number;
    commerce_id: string;
    sku: string;
    name: string;
    slug: string;
    permalink: string;
    type: string;
    status: string;
    featured: boolean;
    description: string;
    short_description: string;
    price: number;
    regular_price: number;
    sale_price: number | null;
    on_sale: boolean;
    price_range: string;
    manage_stock: boolean;
    stock: number;
    stock_status: string;
    average_rating: number;
    rating_count: number;
    sync_status: string;
    categories: { id: number; wc_id: number; name: string; slug: string }[];
    brands: { id: number; wc_id: number; name: string }[];
    images: { id: number; src: string; name: string; alt: string; is_featured: boolean }[];
    variations: {
        id: number;
        wc_id: number;
        sku: string;
        price: number;
        regular_price: number;
        sale_price: number | null;
        stock_quantity: number;
        stock_status: string;
        attributes: Record<string, string>[];
        image: string | null;
    }[];
}

const ProductDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const [product, setProduct] = useState<ProductDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('general');

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const response = await fetch(`/api/products/${id}`);
                if (response.ok) {
                    const data = await response.json();
                    setProduct(data.data);
                }
            } catch (error) {
                console.error('Ürün yüklenirken hata:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchProduct();
    }, [id]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="text-center py-12">
                <h2 className="text-2xl font-bold">Ürün bulunamadı</h2>
                <Link to="/products" className="text-primary hover:underline mt-4 inline-block">
                    Ürünlere Dön
                </Link>
            </div>
        );
    }

    const tabs = [
        { id: 'general', label: 'Genel', icon: Info },
        { id: 'pricing', label: 'Fiyatlandırma', icon: DollarSign },
        { id: 'inventory', label: 'Envanter', icon: Package },
        { id: 'images', label: 'Görseller', icon: ImageIcon },
        { id: 'variations', label: 'Varyasyonlar', icon: Layers },
        { id: 'categories', label: 'Kategoriler', icon: Tag },
    ];

    return (
        <div className="space-y-6">
            {/* Başlık */}
            <div className="flex items-center gap-4">
                <Link to="/products">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold">{product.name}</h1>
                    <p className="text-muted-foreground">SKU: {product.sku}</p>
                </div>
                <Badge variant={product.status === 'publish' ? 'default' : 'secondary'}>
                    {product.status === 'publish' ? 'Yayında' : product.status === 'draft' ? 'Taslak' : product.status}
                </Badge>
                <Badge variant={product.stock_status === 'instock' ? 'default' : 'destructive'}>
                    {product.stock_status === 'instock' ? 'Stokta' : 'Stok Yok'}
                </Badge>
            </div>

            {/* Öne Çıkan Görsel */}
            {(product.images?.length ?? 0) > 0 ? (
                <div className="flex gap-4">
                    <img
                        src={product.images[0]?.src}
                        alt={product.images[0]?.alt || product.name}
                        className="w-48 h-48 object-cover rounded-lg border"
                        onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/192?text=Görsel+Yok'; }}
                    />
                    <div className="flex-1">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-muted-foreground">Fiyat</p>
                                <p className="text-2xl font-bold">₺{product.price_range || product.price}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Stok</p>
                                <p className="text-2xl font-bold">{product.stock}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Puan</p>
                                <div className="flex items-center gap-1">
                                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                                    <span className="text-lg font-medium">{product.average_rating}</span>
                                    <span className="text-muted-foreground">({product.rating_count})</span>
                                </div>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Tür</p>
                                <Badge variant="outline">{product.type === 'simple' ? 'Basit' : product.type === 'variable' ? 'Varyasyonlu' : product.type}</Badge>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex gap-4">
                    <div className="w-48 h-48 bg-muted rounded-lg border flex items-center justify-center text-muted-foreground">
                        Görsel Yok
                    </div>
                    <div className="flex-1">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-muted-foreground">Fiyat</p>
                                <p className="text-2xl font-bold">₺{product.price_range || product.price}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Stok</p>
                                <p className="text-2xl font-bold">{product.stock}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Sekmeler */}
            <div className="border-b">
                <nav className="flex gap-4">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${activeTab === tab.id
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            <tab.icon className="h-4 w-4" />
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Sekme İçeriği */}
            <div className="mt-6">
                {activeTab === 'general' && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Genel Bilgiler</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="text-sm font-medium">Ürün Adı</label>
                                <p>{product.name}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium">Kısa Açıklama</label>
                                <div dangerouslySetInnerHTML={{ __html: product.short_description }} />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Tam Açıklama</label>
                                <div dangerouslySetInnerHTML={{ __html: product.description }} className="prose prose-sm max-w-none" />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Ürün Linki</label>
                                <a href={product.permalink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline block truncate">
                                    {product.permalink}
                                </a>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {activeTab === 'pricing' && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Fiyatlandırma</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="text-sm font-medium">Normal Fiyat</label>
                                    <p className="text-xl">₺{product.regular_price}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium">İndirimli Fiyat</label>
                                    <p className="text-xl">{product.sale_price ? `₺${product.sale_price}` : '-'}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium">İndirimde mi?</label>
                                    <Badge variant={product.on_sale ? 'default' : 'secondary'}>
                                        {product.on_sale ? 'Evet' : 'Hayır'}
                                    </Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {activeTab === 'inventory' && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Envanter</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="text-sm font-medium">Stok Miktarı</label>
                                    <p className="text-xl">{product.stock}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Stok Durumu</label>
                                    <Badge variant={product.stock_status === 'instock' ? 'default' : 'destructive'}>
                                        {product.stock_status === 'instock' ? 'Stokta' : 'Stok Yok'}
                                    </Badge>
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Stok Yönetimi</label>
                                    <Badge variant={product.manage_stock ? 'default' : 'secondary'}>
                                        {product.manage_stock ? 'Aktif' : 'Pasif'}
                                    </Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {activeTab === 'images' && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Görseller ({product.images?.length ?? 0})</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {(product.images?.length ?? 0) > 0 ? (
                                <div className="grid grid-cols-4 gap-4">
                                    {product.images?.map((img) => (
                                        <div key={img.id} className="relative">
                                            <img
                                                src={img.src}
                                                alt={img.alt || img.name}
                                                className="w-full aspect-square object-cover rounded-lg border"
                                            />
                                            {img.is_featured && (
                                                <Badge className="absolute top-2 left-2">Ana Görsel</Badge>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-muted-foreground">Görsel bulunmuyor</p>
                            )}
                        </CardContent>
                    </Card>
                )}

                {activeTab === 'variations' && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Varyasyonlar ({product.variations?.length ?? 0})</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {(product.variations?.length ?? 0) > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b">
                                                <th className="text-left py-2">SKU</th>
                                                <th className="text-left py-2">Fiyat</th>
                                                <th className="text-left py-2">Stok</th>
                                                <th className="text-left py-2">Özellikler</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {product.variations?.map((v) => (
                                                <tr key={v.id} className="border-b">
                                                    <td className="py-2">{v.sku || '-'}</td>
                                                    <td className="py-2">₺{v.price}</td>
                                                    <td className="py-2">
                                                        <Badge variant={v.stock_status === 'instock' ? 'default' : 'destructive'}>
                                                            {v.stock_quantity ?? 'Yok'}
                                                        </Badge>
                                                    </td>
                                                    <td className="py-2">
                                                        {v.attributes?.map((attr: any, i: number) => (
                                                            <Badge key={i} variant="outline" className="mr-1">
                                                                {attr.name}: {attr.option}
                                                            </Badge>
                                                        ))}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="text-muted-foreground">Bu ürün basit türde, varyasyonu bulunmuyor.</p>
                            )}
                        </CardContent>
                    </Card>
                )}

                {activeTab === 'categories' && (
                    <div className="grid grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Kategoriler ({product.categories?.length ?? 0})</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-2">
                                    {(product.categories?.length ?? 0) > 0 ? (
                                        product.categories?.map((cat) => (
                                            <Badge key={cat.id} variant="outline">
                                                {cat.name}
                                            </Badge>
                                        ))
                                    ) : (
                                        <p className="text-muted-foreground">Kategori atanmamış</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Markalar ({product.brands?.length ?? 0})</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-2">
                                    {(product.brands?.length ?? 0) > 0 ? (
                                        product.brands?.map((br) => (
                                            <Badge key={br.id} variant="outline">
                                                {br.name}
                                            </Badge>
                                        ))
                                    ) : (
                                        <p className="text-muted-foreground">Marka atanmamış</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProductDetailPage;
