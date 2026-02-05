import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
    FileText,
    ExternalLink,
    Image,
    AlertCircle,
    Save,
    X,
    Pencil,
    Star,
    MessageSquare,
    Link as LinkIcon,
    FolderTree,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface KozvitProductData {
    id: number;
    barcode: string;
    kozvit_sku: string | null;
    name: string;
    brand: string | null;
    price: number;
    currency: string;
    main_category: string | null;
    sub_category: string | null;
    description: string | null;
    image_url: string | null;
    source_url: string | null;
    rating: number;
    review_count: number;
    raw_data: Record<string, unknown>;
    wc_product_id: number | null;
    sync_status: 'pending' | 'synced' | 'failed';
    sync_error: string | null;
    synced_at: string | null;
    created_at: string;
    updated_at: string;
}

const KozvitProductDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [product, setProduct] = useState<KozvitProductData | null>(null);
    const [loading, setLoading] = useState(true);
    const [pushing, setPushing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // Edit form state
    const [editForm, setEditForm] = useState({
        name: '',
        brand: '',
        price: '',
        description: '',
        image_url: '',
    });

    const fetchProduct = async () => {
        try {
            const response = await fetch(`/api/kozvit-products/${id}`);
            if (response.ok) {
                const data = await response.json();
                setProduct(data.data);
                // Initialize edit form with current values
                setEditForm({
                    name: data.data.name || '',
                    brand: data.data.brand || '',
                    price: data.data.price?.toString() || '0',
                    description: data.data.description || '',
                    image_url: data.data.image_url || '',
                });
            } else if (response.status === 404) {
                toast({
                    title: 'Hata',
                    description: 'Urun bulunamadi',
                    variant: 'destructive',
                });
                navigate('/kozvit-products');
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
            const response = await fetch(`/api/kozvit-products/${product.id}/push`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            const data = await response.json();

            if (data.success) {
                toast({
                    title: 'Basarili',
                    description: `Urun WooCommerce'e gonderildi (${data.action === 'created' ? 'Yeni olusturuldu' : 'Guncellendi'})`,
                });
                fetchProduct();
            } else {
                toast({
                    title: 'Hata',
                    description: data.error || 'Urun gonderilirken bir hata olustu',
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

    const handleSave = async () => {
        if (!product) return;

        setSaving(true);
        try {
            const response = await fetch(`/api/kozvit-products/${product.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: editForm.name,
                    brand: editForm.brand || null,
                    price: parseFloat(editForm.price) || 0,
                    description: editForm.description || null,
                    image_url: editForm.image_url || null,
                }),
            });
            const data = await response.json();

            if (data.success) {
                toast({
                    title: 'Basarili',
                    description: 'Urun guncellendi',
                });
                setProduct(data.data);
                setIsEditing(false);
            } else {
                toast({
                    title: 'Hata',
                    description: 'Urun guncellenirken bir hata olustu',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            toast({
                title: 'Hata',
                description: 'Urun guncellenirken bir hata olustu',
                variant: 'destructive',
            });
        } finally {
            setSaving(false);
        }
    };

    const handleCancelEdit = () => {
        if (product) {
            setEditForm({
                name: product.name || '',
                brand: product.brand || '',
                price: product.price?.toString() || '0',
                description: product.description || '',
                image_url: product.image_url || '',
            });
        }
        setIsEditing(false);
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
                <Button variant="link" onClick={() => navigate('/kozvit-products')}>
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
                    <Button variant="ghost" size="icon" onClick={() => navigate('/kozvit-products')}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{product.name}</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline">{product.barcode}</Badge>
                            {getStatusBadge(product.sync_status)}
                            {product.brand && <Badge variant="secondary">{product.brand}</Badge>}
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={fetchProduct}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Yenile
                    </Button>
                    {!isEditing && (
                        <Button variant="outline" onClick={() => setIsEditing(true)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Duzenle
                        </Button>
                    )}
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
                    {/* Edit Form or Display */}
                    {isEditing ? (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Pencil className="w-5 h-5" />
                                    Urun Duzenleme
                                </CardTitle>
                                <CardDescription>
                                    Urun bilgilerini guncelleyin. Kaydettikten sonra senkronizasyon durumu "Bekliyor" olarak degisecektir.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Urun Adi *</Label>
                                    <Input
                                        id="name"
                                        value={editForm.name}
                                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                        placeholder="Urun adi"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="brand">Marka</Label>
                                        <Input
                                            id="brand"
                                            value={editForm.brand}
                                            onChange={(e) => setEditForm({ ...editForm, brand: e.target.value })}
                                            placeholder="Marka"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="price">Fiyat ({product.currency})</Label>
                                        <Input
                                            id="price"
                                            type="number"
                                            step="0.01"
                                            value={editForm.price}
                                            onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="image_url">Gorsel URL</Label>
                                    <Input
                                        id="image_url"
                                        value={editForm.image_url}
                                        onChange={(e) => setEditForm({ ...editForm, image_url: e.target.value })}
                                        placeholder="https://..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="description">Aciklama</Label>
                                    <Textarea
                                        id="description"
                                        value={editForm.description}
                                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                        placeholder="Urun aciklamasi..."
                                        rows={6}
                                    />
                                </div>
                                <div className="flex justify-end gap-2 pt-4">
                                    <Button variant="outline" onClick={handleCancelEdit} disabled={saving}>
                                        <X className="w-4 h-4 mr-2" />
                                        Iptal
                                    </Button>
                                    <Button onClick={handleSave} disabled={saving || !editForm.name.trim()}>
                                        {saving ? (
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        ) : (
                                            <Save className="w-4 h-4 mr-2" />
                                        )}
                                        Kaydet
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <>
                            {/* Pricing Card */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <DollarSign className="w-5 h-5" />
                                        Fiyatlandirma
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        <div>
                                            <p className="text-sm text-muted-foreground">Fiyat</p>
                                            <p className="text-2xl font-bold">{formatPrice(product.price, product.currency)}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Para Birimi</p>
                                            <p className="text-xl font-semibold">{product.currency}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Degerlendirme</p>
                                            <p className="text-xl font-semibold flex items-center gap-1">
                                                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                                {product.rating} / 5
                                            </p>
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
                                            <p className="text-sm text-muted-foreground">Barkod (SKU)</p>
                                            <p className="font-medium flex items-center gap-1">
                                                <Barcode className="w-4 h-4" />
                                                {product.barcode}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Kozvit SKU</p>
                                            <p className="font-medium">{product.kozvit_sku || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Marka</p>
                                            <p className="font-medium">{product.brand || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Yorum Sayisi</p>
                                            <p className="font-medium flex items-center gap-1">
                                                <MessageSquare className="w-4 h-4" />
                                                {product.review_count}
                                            </p>
                                        </div>
                                    </div>
                                    <Separator />
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                                            <FolderTree className="w-4 h-4" />
                                            Kategoriler
                                        </p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-sm text-muted-foreground">Ana Kategori</p>
                                                <p className="font-medium">{product.main_category || '-'}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground">Alt Kategori</p>
                                                <p className="font-medium">{product.sub_category || '-'}</p>
                                            </div>
                                        </div>
                                    </div>
                                    {product.source_url && (
                                        <>
                                            <Separator />
                                            <div>
                                                <p className="text-sm text-muted-foreground mb-1">Kaynak URL</p>
                                                <a
                                                    href={product.source_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-primary hover:underline flex items-center gap-1 text-sm"
                                                >
                                                    <LinkIcon className="w-4 h-4" />
                                                    {product.source_url}
                                                </a>
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Description Card */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <FileText className="w-5 h-5" />
                                        Aciklama
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {product.description ? (
                                        <p className="text-sm whitespace-pre-wrap">{product.description}</p>
                                    ) : (
                                        <p className="text-muted-foreground text-sm">Aciklama bulunmuyor</p>
                                    )}
                                </CardContent>
                            </Card>
                        </>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Photo Card */}
                    {product.image_url && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Image className="w-5 h-5" />
                                    Urun Gorseli
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <img
                                    src={product.image_url}
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
                                <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                                    <p className="text-sm text-red-600 dark:text-red-400 flex items-start gap-2">
                                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                        {product.sync_error}
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Kozvit Info Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Kozvit Bilgisi</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div>
                                <p className="text-sm text-muted-foreground">Veritabani ID</p>
                                <p className="font-mono text-sm">{product.id}</p>
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

                    {/* Raw Data Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Ham Veri (JSON)</CardTitle>
                            <CardDescription>Kozvit JSON'dan gelen orijinal veri</CardDescription>
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

export default KozvitProductDetail;
