import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Search,
    RefreshCw,
    Loader2,
    Upload,
    CheckCircle,
    XCircle,
    Clock,
    Package,
    ExternalLink,
    ChevronLeft,
    ChevronRight,
    Eye,
} from "lucide-react";

interface KozvitProduct {
    id: number;
    barcode: string;
    kozvit_sku: string;
    name: string;
    brand: string;
    price: string;
    currency: string;
    main_category: string;
    sub_category: string;
    description: string;
    image_url: string;
    source_url: string;
    rating: string;
    review_count: number;
    wc_product_id: number | null;
    sync_status: 'pending' | 'synced' | 'failed';
    sync_error: string | null;
    synced_at: string | null;
    created_at: string;
}

interface Stats {
    total: number;
    pending: number;
    synced: number;
    failed: number;
}

interface PushResult {
    success: boolean;
    message?: string;
    error?: string;
    wc_id?: number;
    action?: string;
}

const KozvitProducts = () => {
    const navigate = useNavigate();
    const [products, setProducts] = useState<KozvitProduct[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalProducts, setTotalProducts] = useState(0);

    // Push state
    const [pushing, setPushing] = useState<number | null>(null);
    const [pushingAll, setPushingAll] = useState(false);
    const [selectedProducts, setSelectedProducts] = useState<number[]>([]);

    // Detail dialog
    const [selectedProduct, setSelectedProduct] = useState<KozvitProduct | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);

    // Push result dialog
    const [pushResult, setPushResult] = useState<{open: boolean; results: any[]}>({
        open: false,
        results: []
    });

    useEffect(() => {
        fetchStats();
        fetchProducts();
    }, []);

    useEffect(() => {
        const debounce = setTimeout(() => {
            fetchProducts(1);
        }, 300);
        return () => clearTimeout(debounce);
    }, [searchTerm, statusFilter]);

    const fetchStats = async () => {
        try {
            const response = await fetch('/api/kozvit-products/stats');
            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (error) {
            console.error('Stats yuklenemedi:', error);
        }
    };

    const fetchProducts = async (page = currentPage) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                per_page: '20',
            });

            if (searchTerm) params.append('search', searchTerm);
            if (statusFilter !== 'all') params.append('status', statusFilter);

            const response = await fetch(`/api/kozvit-products?${params}`);
            if (response.ok) {
                const data = await response.json();
                setProducts(data.data);
                setCurrentPage(data.meta.current_page);
                setTotalPages(data.meta.last_page);
                setTotalProducts(data.meta.total);
            }
        } catch (error) {
            console.error('Urunler yuklenemedi:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePushSingle = async (productId: number) => {
        setPushing(productId);
        try {
            const response = await fetch(`/api/kozvit-products/${productId}/push`, {
                method: 'POST',
            });
            const data = await response.json();

            if (data.success) {
                fetchStats();
                fetchProducts();
            } else {
                alert(`Hata: ${data.error || 'Bilinmeyen hata'}`);
            }
        } catch (error) {
            console.error('Push hatasi:', error);
            alert('Push sirasinda hata olustu');
        } finally {
            setPushing(null);
        }
    };

    const handlePushSelected = async () => {
        if (selectedProducts.length === 0) {
            alert('Lutfen urun secin');
            return;
        }

        setPushingAll(true);
        try {
            const response = await fetch('/api/kozvit-products/push-batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: selectedProducts }),
            });
            const data = await response.json();

            setPushResult({
                open: true,
                results: data.details || [],
            });

            fetchStats();
            fetchProducts();
            setSelectedProducts([]);
        } catch (error) {
            console.error('Toplu push hatasi:', error);
            alert('Toplu push sirasinda hata olustu');
        } finally {
            setPushingAll(false);
        }
    };

    const handlePushAllPending = async () => {
        if (!confirm('Tum bekleyen urunleri (max 50) WooCommerce\'e gondermek istiyor musunuz?')) {
            return;
        }

        setPushingAll(true);
        try {
            const response = await fetch('/api/kozvit-products/push-all-pending?limit=50', {
                method: 'POST',
            });
            const data = await response.json();

            setPushResult({
                open: true,
                results: data.details || [],
            });

            fetchStats();
            fetchProducts();
        } catch (error) {
            console.error('Toplu push hatasi:', error);
            alert('Toplu push sirasinda hata olustu');
        } finally {
            setPushingAll(false);
        }
    };

    const handleResetFailed = async () => {
        if (!confirm('Basarisiz urunleri sifirlamak istiyor musunuz?')) {
            return;
        }

        try {
            const response = await fetch('/api/kozvit-products/reset-failed', {
                method: 'POST',
            });
            const data = await response.json();

            if (data.success) {
                alert(`${data.reset_count} urun sifirlandi`);
                fetchStats();
                fetchProducts();
            }
        } catch (error) {
            console.error('Reset hatasi:', error);
        }
    };

    const toggleSelectProduct = (productId: number) => {
        setSelectedProducts(prev =>
            prev.includes(productId)
                ? prev.filter(id => id !== productId)
                : [...prev, productId]
        );
    };

    const toggleSelectAll = () => {
        if (selectedProducts.length === products.length) {
            setSelectedProducts([]);
        } else {
            setSelectedProducts(products.map(p => p.id));
        }
    };

    const getStatusBadge = (status: string, error?: string | null) => {
        switch (status) {
            case 'synced':
                return <Badge className="bg-green-500/20 text-green-600"><CheckCircle className="w-3 h-3 mr-1" />Senkronize</Badge>;
            case 'failed':
                return <Badge variant="destructive" title={error || ''}><XCircle className="w-3 h-3 mr-1" />Basarisiz</Badge>;
            default:
                return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Bekliyor</Badge>;
        }
    };

    const formatPrice = (price: string, currency: string) => {
        const num = parseFloat(price);
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: currency || 'TRY',
        }).format(num);
    };

    return (
        <div className="space-y-6">
            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="p-4">
                            <p className="text-sm text-muted-foreground">Toplam Urun</p>
                            <p className="text-2xl font-bold">{stats.total}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <p className="text-sm text-muted-foreground">Bekleyen</p>
                            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <p className="text-sm text-muted-foreground">Senkronize</p>
                            <p className="text-2xl font-bold text-green-600">{stats.synced}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <p className="text-sm text-muted-foreground">Basarisiz</p>
                            <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Kozvit Urunleri</h2>
                    <p className="text-muted-foreground">
                        {totalProducts} urun listeleniyor
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    {selectedProducts.length > 0 && (
                        <Button
                            onClick={handlePushSelected}
                            disabled={pushingAll}
                        >
                            {pushingAll ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Upload className="mr-2 h-4 w-4" />
                            )}
                            Secilenleri Gonder ({selectedProducts.length})
                        </Button>
                    )}

                    <Button
                        variant="outline"
                        onClick={handlePushAllPending}
                        disabled={pushingAll || (stats?.pending === 0)}
                    >
                        {pushingAll ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Upload className="mr-2 h-4 w-4" />
                        )}
                        Tum Bekleyenleri Gonder
                    </Button>

                    {stats && stats.failed > 0 && (
                        <Button variant="outline" onClick={handleResetFailed}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Basarisizlari Sifirla
                        </Button>
                    )}

                    <Button variant="outline" onClick={() => { fetchStats(); fetchProducts(); }}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Yenile
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Barkod, isim veya marka ara..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Durum" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tum Durumlar</SelectItem>
                        <SelectItem value="pending">Bekleyen</SelectItem>
                        <SelectItem value="synced">Senkronize</SelectItem>
                        <SelectItem value="failed">Basarisiz</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Product Table */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className="p-4 w-12">
                                    <input
                                        type="checkbox"
                                        checked={selectedProducts.length === products.length && products.length > 0}
                                        onChange={toggleSelectAll}
                                    />
                                </th>
                                <th className="text-left p-4 font-medium w-16">Gorsel</th>
                                <th className="text-left p-4 font-medium">Urun</th>
                                <th className="text-left p-4 font-medium">Marka</th>
                                <th className="text-left p-4 font-medium">Kategori</th>
                                <th className="text-left p-4 font-medium">Fiyat</th>
                                <th className="text-left p-4 font-medium">Durum</th>
                                <th className="text-left p-4 font-medium">Islemler</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map((product) => (
                                <tr key={product.id} className="border-t hover:bg-muted/30 transition-colors">
                                    <td className="p-4">
                                        <input
                                            type="checkbox"
                                            checked={selectedProducts.includes(product.id)}
                                            onChange={() => toggleSelectProduct(product.id)}
                                        />
                                    </td>
                                    <td className="p-4">
                                        {product.image_url ? (
                                            <img
                                                src={product.image_url}
                                                alt={product.name}
                                                className="w-12 h-12 object-cover rounded"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                                                <Package className="w-6 h-6 text-muted-foreground" />
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <button
                                            className="font-medium hover:text-primary text-left"
                                            onClick={() => navigate(`/kozvit-products/${product.id}`)}
                                        >
                                            {product.name.length > 50 ? product.name.substring(0, 50) + '...' : product.name}
                                        </button>
                                        <p className="text-sm text-muted-foreground font-mono">{product.barcode}</p>
                                    </td>
                                    <td className="p-4">
                                        <Badge variant="outline">{product.brand || '-'}</Badge>
                                    </td>
                                    <td className="p-4">
                                        <div className="text-sm">
                                            <p>{product.main_category}</p>
                                            {product.sub_category && (
                                                <p className="text-muted-foreground">{product.sub_category}</p>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4 font-medium">
                                        {formatPrice(product.price, product.currency)}
                                    </td>
                                    <td className="p-4">
                                        {getStatusBadge(product.sync_status, product.sync_error)}
                                        {product.wc_product_id && (
                                            <p className="text-xs text-muted-foreground mt-1">
                                                WC #{product.wc_product_id}
                                            </p>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => navigate(`/kozvit-products/${product.id}`)}
                                                title="Detay"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            {product.sync_status !== 'synced' && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handlePushSingle(product.id)}
                                                    disabled={pushing === product.id}
                                                    title="WooCommerce'e Gonder"
                                                >
                                                    {pushing === product.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Upload className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            )}
                                            {product.source_url && (
                                                <a
                                                    href={product.source_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    <Button variant="ghost" size="sm" title="Kozvit'te Gor">
                                                        <ExternalLink className="h-4 w-4" />
                                                    </Button>
                                                </a>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === 1}
                        onClick={() => fetchProducts(currentPage - 1)}
                    >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Onceki
                    </Button>
                    <span className="text-sm text-muted-foreground">
                        Sayfa {currentPage} / {totalPages}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === totalPages}
                        onClick={() => fetchProducts(currentPage + 1)}
                    >
                        Sonraki
                        <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                </div>
            )}

            {/* Product Detail Dialog */}
            <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    {selectedProduct && (
                        <>
                            <DialogHeader>
                                <DialogTitle>{selectedProduct.name}</DialogTitle>
                                <DialogDescription>
                                    Barkod: {selectedProduct.barcode}
                                </DialogDescription>
                            </DialogHeader>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                {/* Image */}
                                {selectedProduct.image_url && (
                                    <div>
                                        <img
                                            src={selectedProduct.image_url}
                                            alt={selectedProduct.name}
                                            className="w-full rounded-lg"
                                        />
                                    </div>
                                )}

                                {/* Details */}
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Marka</p>
                                        <p className="font-medium">{selectedProduct.brand || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Fiyat</p>
                                        <p className="font-medium text-lg">
                                            {formatPrice(selectedProduct.price, selectedProduct.currency)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Kategori</p>
                                        <p>{selectedProduct.main_category}</p>
                                        {selectedProduct.sub_category && (
                                            <p className="text-muted-foreground">{selectedProduct.sub_category}</p>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Durum</p>
                                        <div className="flex items-center gap-2">
                                            {getStatusBadge(selectedProduct.sync_status, selectedProduct.sync_error)}
                                            {selectedProduct.wc_product_id && (
                                                <span className="text-sm">WC #{selectedProduct.wc_product_id}</span>
                                            )}
                                        </div>
                                    </div>
                                    {selectedProduct.sync_error && (
                                        <div>
                                            <p className="text-sm text-muted-foreground">Hata</p>
                                            <p className="text-red-600 text-sm">{selectedProduct.sync_error}</p>
                                        </div>
                                    )}
                                    {selectedProduct.rating && parseFloat(selectedProduct.rating) > 0 && (
                                        <div>
                                            <p className="text-sm text-muted-foreground">Puan</p>
                                            <p>{selectedProduct.rating} ({selectedProduct.review_count} degerlendirme)</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {selectedProduct.description && (
                                <div className="mt-4">
                                    <p className="text-sm text-muted-foreground mb-2">Aciklama</p>
                                    <p className="text-sm">{selectedProduct.description}</p>
                                </div>
                            )}

                            <div className="flex gap-2 mt-6">
                                {selectedProduct.sync_status !== 'synced' && (
                                    <Button onClick={() => { handlePushSingle(selectedProduct.id); setDetailOpen(false); }}>
                                        <Upload className="mr-2 h-4 w-4" />
                                        WooCommerce'e Gonder
                                    </Button>
                                )}
                                {selectedProduct.source_url && (
                                    <a href={selectedProduct.source_url} target="_blank" rel="noopener noreferrer">
                                        <Button variant="outline">
                                            <ExternalLink className="mr-2 h-4 w-4" />
                                            Kozvit'te Gor
                                        </Button>
                                    </a>
                                )}
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Push Results Dialog */}
            <Dialog open={pushResult.open} onOpenChange={(open) => setPushResult(prev => ({ ...prev, open }))}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Push Sonuclari</DialogTitle>
                        <DialogDescription>
                            {pushResult.results.filter(r => r.success).length} basarili,{' '}
                            {pushResult.results.filter(r => !r.success).length} basarisiz
                        </DialogDescription>
                    </DialogHeader>

                    <div className="max-h-64 overflow-y-auto space-y-2 mt-4">
                        {pushResult.results.map((result, index) => (
                            <div key={index} className={`p-2 rounded ${result.success ? 'bg-green-50' : 'bg-red-50'}`}>
                                <div className="flex items-center gap-2">
                                    {result.success ? (
                                        <CheckCircle className="w-4 h-4 text-green-600" />
                                    ) : (
                                        <XCircle className="w-4 h-4 text-red-600" />
                                    )}
                                    <span className="text-sm">
                                        ID: {result.id}
                                        {result.wc_id && ` → WC #${result.wc_id}`}
                                        {result.error && `: ${result.error}`}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <Button onClick={() => setPushResult({ open: false, results: [] })} className="mt-4">
                        Kapat
                    </Button>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default KozvitProducts;
