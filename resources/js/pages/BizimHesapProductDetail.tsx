import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    ArrowLeft,
    Upload,
    RefreshCw,
    CheckCircle,
    XCircle,
    Clock,
    Loader2,
    Package,
    DollarSign,
    Tag,
    Barcode,
    Layers,
    FileText,
    ExternalLink,
    Image,
    AlertCircle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BizimHesapProductDetail {
    id: number;
    bh_id: string;
    is_active: boolean;
    code: string | null;
    name: string;
    sku: string | null;
    barcode: string | null;
    price: number;
    buying_price: number | null;
    variant_price: number | null;
    currency: string;
    tax: number;
    stock: number;
    unit: string | null;
    category: string | null;
    brand: string | null;
    description: string | null;
    photo: string | null;
    ecommerce_description: string | null;
    note: string | null;
    variant_name: string | null;
    variant: string | null;
    is_ecommerce: boolean;
    raw_data: Record<string, unknown>;
    wc_product_id: number | null;
    sync_status: 'pending' | 'synced' | 'failed';
    sync_error: string | null;
    synced_at: string | null;
    created_at: string;
    updated_at: string;
}

const BizimHesapProductDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [product, setProduct] = useState<BizimHesapProductDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [pushing, setPushing] = useState(false);

    const fetchProduct = async () => {
        try {
            const response = await fetch(`/api/bizimhesap-products/${id}`);
            if (response.ok) {
                const data = await response.json();
                setProduct(data.data);
            } else if (response.status === 404) {
                toast({
                    title: 'Hata',
                    description: 'Urun bulunamadi',
                    variant: 'destructive',
                });
                navigate('/bizimhesap-products');
            }
        } catch (error) {
            console.error('Error fetching product:', error);
            toast({
                title: 'Hata',
                description: 'Urun yuklenirken bir hata olustu',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProduct();
    }, [id]);

    const handlePushToWooCommerce = async () => {
        if (!product) return;

        setPushing(true);
        try {
            const response = await fetch('/api/bizimhesap-products/push', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ product_ids: [product.id] }),
            });
            const data = await response.json();

            if (response.ok) {
                toast({
                    title: 'Kuyruga Alindi',
                    description: data.message,
                });
                // Poll for completion
                setTimeout(() => fetchProduct(), 3000);
            } else {
                toast({
                    title: 'Hata',
                    description: data.message || 'Urun gonderilirken bir hata olustu',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            toast({
                title: 'Hata',
                description: 'Urun gonderilirken bir hata olustu',
                variant: 'destructive',
            });
        } finally {
            setPushing(false);
        }
    };

    const formatPrice = (price: number | null, currency: string = 'TRY') => {
        if (price === null || price === undefined) return '-';
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: currency === 'TL' ? 'TRY' : currency,
        }).format(price);
    };

    const formatDate = (date: string | null) => {
        if (!date) return '-';
        return new Date(date).toLocaleString('tr-TR');
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'synced':
                return (
                    <Badge variant="default" className="bg-green-500">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Senkronize Edildi
                    </Badge>
                );
            case 'failed':
                return (
                    <Badge variant="destructive">
                        <XCircle className="w-3 h-3 mr-1" />
                        Basarisiz
                    </Badge>
                );
            default:
                return (
                    <Badge variant="secondary">
                        <Clock className="w-3 h-3 mr-1" />
                        Bekliyor
                    </Badge>
                );
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    if (!product) {
        return (
            <div className="flex flex-col items-center justify-center h-64">
                <Package className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Urun bulunamadi</p>
                <Button variant="link" onClick={() => navigate('/bizimhesap-products')}>
                    Listeye don
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/bizimhesap-products')}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{product.name}</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline">{product.sku || 'SKU yok'}</Badge>
                            {getStatusBadge(product.sync_status)}
                            {!product.is_active && <Badge variant="secondary">Pasif</Badge>}
                            {!product.is_ecommerce && <Badge variant="secondary">E-ticaret Kapali</Badge>}
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={fetchProduct}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Yenile
                    </Button>
                    <Button onClick={handlePushToWooCommerce} disabled={pushing}>
                        {pushing ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Upload className="w-4 h-4 mr-2" />
                        )}
                        WooCommerce'e Gonder
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Main Info */}
                <div className="md:col-span-2 space-y-6">
                    {/* Pricing Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <DollarSign className="w-5 h-5" />
                                Fiyatlandirma
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <p className="text-sm text-muted-foreground">Satis Fiyati</p>
                                    <p className="text-2xl font-bold">{formatPrice(product.price, product.currency)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Alis Fiyati</p>
                                    <p className="text-xl font-semibold">{formatPrice(product.buying_price, product.currency)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Varyant Fiyati</p>
                                    <p className="text-xl font-semibold">{formatPrice(product.variant_price, product.currency)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">KDV Orani</p>
                                    <p className="text-xl font-semibold">%{product.tax}</p>
                                </div>
                            </div>
                            <Separator className="my-4" />
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <p className="text-sm text-muted-foreground">Para Birimi</p>
                                    <p className="font-medium">{product.currency}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Stok</p>
                                    <p className="font-medium">{product.stock} {product.unit || 'Adet'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Birim</p>
                                    <p className="font-medium">{product.unit || '-'}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Product Details Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Tag className="w-5 h-5" />
                                Urun Detaylari
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-muted-foreground">Urun Kodu</p>
                                    <p className="font-medium">{product.code || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Barkod</p>
                                    <p className="font-medium flex items-center gap-1">
                                        <Barcode className="w-4 h-4" />
                                        {product.barcode || '-'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Kategori</p>
                                    <p className="font-medium">{product.category || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Marka</p>
                                    <p className="font-medium">{product.brand || '-'}</p>
                                </div>
                            </div>

                            {(product.variant_name || product.variant) && (
                                <>
                                    <Separator />
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                                            <Layers className="w-4 h-4" />
                                            Varyant Bilgisi
                                        </p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-sm text-muted-foreground">Varyant Adi</p>
                                                <p className="font-medium">{product.variant_name || '-'}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground">Varyant Degeri</p>
                                                <p className="font-medium">{product.variant || '-'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* Descriptions Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="w-5 h-5" />
                                Aciklamalar
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {product.description && (
                                <div>
                                    <p className="text-sm text-muted-foreground mb-1">Aciklama</p>
                                    <p className="text-sm whitespace-pre-wrap">{product.description}</p>
                                </div>
                            )}
                            {product.ecommerce_description && (
                                <div>
                                    <p className="text-sm text-muted-foreground mb-1">E-ticaret Aciklamasi</p>
                                    <p className="text-sm whitespace-pre-wrap">{product.ecommerce_description}</p>
                                </div>
                            )}
                            {product.note && (
                                <div>
                                    <p className="text-sm text-muted-foreground mb-1">Not</p>
                                    <p className="text-sm whitespace-pre-wrap">{product.note}</p>
                                </div>
                            )}
                            {!product.description && !product.ecommerce_description && !product.note && (
                                <p className="text-muted-foreground text-sm">Aciklama bulunmuyor</p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Photo Card */}
                    {product.photo && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Image className="w-5 h-5" />
                                    Urun Gorseli
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <img
                                    src={product.photo}
                                    alt={product.name}
                                    className="w-full rounded-lg object-cover"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                />
                            </CardContent>
                        </Card>
                    )}

                    {/* Sync Status Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Senkronizasyon Durumu</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Durum</span>
                                {getStatusBadge(product.sync_status)}
                            </div>
                            <Separator />
                            <div>
                                <p className="text-sm text-muted-foreground">WooCommerce ID</p>
                                {product.wc_product_id ? (
                                    <p className="font-medium flex items-center gap-2">
                                        #{product.wc_product_id}
                                        <Link
                                            to={`/products/${product.wc_product_id}`}
                                            className="text-primary hover:underline"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                        </Link>
                                    </p>
                                ) : (
                                    <p className="text-muted-foreground">-</p>
                                )}
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Son Senkron</p>
                                <p className="font-medium">{formatDate(product.synced_at)}</p>
                            </div>
                            {product.sync_error && (
                                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                                    <p className="text-sm text-red-600 flex items-start gap-2">
                                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                        {product.sync_error}
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* BizimHesap Info Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>BizimHesap Bilgisi</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div>
                                <p className="text-sm text-muted-foreground">BizimHesap ID</p>
                                <p className="font-mono text-xs break-all">{product.bh_id}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Olusturulma</p>
                                <p className="font-medium">{formatDate(product.created_at)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Guncellenme</p>
                                <p className="font-medium">{formatDate(product.updated_at)}</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Raw Data Card (Collapsible) */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Ham Veri (API)</CardTitle>
                            <CardDescription>BizimHesap API'den gelen orijinal veri</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-64">
                                {JSON.stringify(product.raw_data, null, 2)}
                            </pre>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default BizimHesapProductDetailPage;
