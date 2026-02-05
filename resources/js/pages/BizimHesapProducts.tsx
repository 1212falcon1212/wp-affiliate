import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Download,
    Upload,
    RefreshCw,
    Search,
    Package,
    CheckCircle,
    XCircle,
    Clock,
    Loader2,
    RotateCcw,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BizimHesapProduct {
    id: number;
    bh_id: string;
    name: string;
    sku: string | null;
    barcode: string | null;
    price: number;
    stock: number;
    category: string | null;
    wc_product_id: number | null;
    sync_status: 'pending' | 'synced' | 'failed';
    synced_at: string | null;
    sync_error: string | null;
    created_at: string;
}

interface Stats {
    total: number;
    pending: number;
    synced: number;
    failed: number;
    last_fetch: string | null;
    last_push: string | null;
}

interface SyncJob {
    id: number;
    type: 'fetch' | 'push';
    status: 'pending' | 'processing' | 'completed' | 'failed';
    total_items: number;
    processed_items: number;
    success_count: number;
    error_count: number;
    started_at: string;
    completed_at: string | null;
}

const BizimHesapProducts: React.FC = () => {
    const { toast } = useToast();
    const [products, setProducts] = useState<BizimHesapProduct[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [fetching, setFetching] = useState(false);
    const [pushing, setPushing] = useState(false);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [activeSyncJob, setActiveSyncJob] = useState<SyncJob | null>(null);

    const fetchProducts = async () => {
        try {
            const params = new URLSearchParams({
                page: currentPage.toString(),
                per_page: '20',
            });
            if (search) params.append('search', search);
            if (statusFilter !== 'all') params.append('sync_status', statusFilter);

            const response = await fetch(`/api/bizimhesap-products?${params}`);
            if (response.ok) {
                const data = await response.json();
                setProducts(data.data);
                setTotalPages(data.meta.last_page);
            }
        } catch (error) {
            console.error('Error fetching products:', error);
            toast({
                title: 'Hata',
                description: 'Urunler yuklenirken bir hata olustu',
                variant: 'destructive',
            });
        }
    };

    const fetchStats = async () => {
        try {
            const response = await fetch('/api/bizimhesap-products/stats');
            if (response.ok) {
                const data = await response.json();
                setStats(data.data);
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const loadData = async () => {
        setLoading(true);
        await Promise.all([fetchProducts(), fetchStats()]);
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, [currentPage, statusFilter]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (currentPage === 1) {
                fetchProducts();
            } else {
                setCurrentPage(1);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    // Poll for sync job status
    useEffect(() => {
        if (!activeSyncJob || activeSyncJob.status === 'completed' || activeSyncJob.status === 'failed') {
            return;
        }

        const interval = setInterval(async () => {
            try {
                const response = await fetch(`/api/bizimhesap-products/sync-jobs/${activeSyncJob.id}`);
                if (response.ok) {
                    const data = await response.json();
                    const job = data.data;
                    setActiveSyncJob(job);

                    if (job.status === 'completed' || job.status === 'failed') {
                        setPushing(false);
                        await loadData();
                        toast({
                            title: job.status === 'completed' ? 'Tamamlandi' : 'Hata',
                            description: job.status === 'completed'
                                ? `${job.success_count} urun basariyla gonderildi`
                                : `Islem basarisiz: ${job.error_count} hata`,
                            variant: job.status === 'completed' ? 'default' : 'destructive',
                        });
                    }
                }
            } catch (error) {
                console.error('Error polling sync job:', error);
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [activeSyncJob]);

    const handleFetchFromBizimHesap = async () => {
        setFetching(true);
        try {
            const response = await fetch('/api/bizimhesap-products/fetch', { method: 'POST' });
            const data = await response.json();

            if (response.ok) {
                toast({
                    title: 'Basarili',
                    description: data.message,
                });
                await loadData();
            } else {
                toast({
                    title: 'Hata',
                    description: data.message || 'Urunler cekilirken bir hata olustu',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            toast({
                title: 'Hata',
                description: 'Urunler cekilirken bir hata olustu',
                variant: 'destructive',
            });
        } finally {
            setFetching(false);
        }
    };

    const handlePushSelected = async () => {
        if (selectedIds.length === 0) {
            toast({
                title: 'Uyari',
                description: 'Lutfen gondermek istediginiz urunleri secin',
                variant: 'destructive',
            });
            return;
        }

        setPushing(true);
        try {
            const response = await fetch('/api/bizimhesap-products/push', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ product_ids: selectedIds }),
            });
            const data = await response.json();

            if (response.ok) {
                setActiveSyncJob(data.job);
                setSelectedIds([]);
                toast({
                    title: 'Kuyruga Alindi',
                    description: data.message,
                });
            } else {
                setPushing(false);
                toast({
                    title: 'Hata',
                    description: data.message || 'Urunler gonderilirken bir hata olustu',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            setPushing(false);
            toast({
                title: 'Hata',
                description: 'Urunler gonderilirken bir hata olustu',
                variant: 'destructive',
            });
        }
    };

    const handlePushAll = async () => {
        setPushing(true);
        try {
            const response = await fetch('/api/bizimhesap-products/push-all', { method: 'POST' });
            const data = await response.json();

            if (response.ok) {
                if (data.job) {
                    setActiveSyncJob(data.job);
                }
                toast({
                    title: 'Kuyruga Alindi',
                    description: data.message,
                });
                if (!data.job) {
                    setPushing(false);
                }
            } else {
                setPushing(false);
                toast({
                    title: 'Hata',
                    description: data.message || 'Urunler gonderilirken bir hata olustu',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            setPushing(false);
            toast({
                title: 'Hata',
                description: 'Urunler gonderilirken bir hata olustu',
                variant: 'destructive',
            });
        }
    };

    const handleResetFailed = async () => {
        try {
            const response = await fetch('/api/bizimhesap-products/reset-failed', { method: 'POST' });
            const data = await response.json();

            if (response.ok) {
                toast({
                    title: 'Basarili',
                    description: data.message,
                });
                await loadData();
            } else {
                toast({
                    title: 'Hata',
                    description: data.message || 'Sifirlama basarisiz',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            toast({
                title: 'Hata',
                description: 'Sifirlama basarisiz',
                variant: 'destructive',
            });
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === products.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(products.map((p) => p.id));
        }
    };

    const toggleSelect = (id: number) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter((i) => i !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'synced':
                return (
                    <Badge variant="default" className="bg-green-500">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Senkron
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

    const formatDate = (date: string | null) => {
        if (!date) return '-';
        return new Date(date).toLocaleString('tr-TR');
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY',
        }).format(price);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">BizimHesap Urunleri</h1>
                    <p className="text-muted-foreground">
                        BizimHesap'tan urun cekme ve WooCommerce'e gonderme
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={handleFetchFromBizimHesap}
                        disabled={fetching}
                        variant="outline"
                    >
                        {fetching ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Download className="w-4 h-4 mr-2" />
                        )}
                        BizimHesap'tan Cek
                    </Button>
                    <Button
                        onClick={handlePushAll}
                        disabled={pushing || !stats?.pending}
                    >
                        {pushing ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Upload className="w-4 h-4 mr-2" />
                        )}
                        Tumunu Gonder
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Toplam Urun</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.total || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Bekleyen</CardTitle>
                        <Clock className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.pending || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Senkron</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.synced || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Basarisiz</CardTitle>
                        <XCircle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.failed || 0}</div>
                        {(stats?.failed || 0) > 0 && (
                            <Button
                                variant="link"
                                size="sm"
                                className="p-0 h-auto text-xs"
                                onClick={handleResetFailed}
                            >
                                <RotateCcw className="w-3 h-3 mr-1" />
                                Sifirla
                            </Button>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Active Sync Job Progress */}
            {activeSyncJob && (activeSyncJob.status === 'processing' || activeSyncJob.status === 'pending') && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">Senkronizasyon Durumu</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-4">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <div className="flex-1">
                                <div className="flex justify-between text-sm mb-1">
                                    <span>
                                        {activeSyncJob.type === 'fetch' ? 'Cekilyor' : 'Gonderiliyor'}
                                    </span>
                                    <span>
                                        {activeSyncJob.processed_items} / {activeSyncJob.total_items}
                                    </span>
                                </div>
                                <div className="w-full bg-secondary rounded-full h-2">
                                    <div
                                        className="bg-primary h-2 rounded-full transition-all"
                                        style={{
                                            width: `${
                                                activeSyncJob.total_items > 0
                                                    ? (activeSyncJob.processed_items / activeSyncJob.total_items) * 100
                                                    : 0
                                            }%`,
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Filters and Actions */}
            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row gap-4 justify-between">
                        <div className="flex gap-2 flex-1">
                            <div className="relative flex-1 max-w-sm">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                                <Input
                                    placeholder="Urun ara..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-[150px]">
                                    <SelectValue placeholder="Durum" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tumu</SelectItem>
                                    <SelectItem value="pending">Bekleyen</SelectItem>
                                    <SelectItem value="synced">Senkron</SelectItem>
                                    <SelectItem value="failed">Basarisiz</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex gap-2">
                            {selectedIds.length > 0 && (
                                <Button onClick={handlePushSelected} disabled={pushing}>
                                    {pushing ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <Upload className="w-4 h-4 mr-2" />
                                    )}
                                    Secilenleri Gonder ({selectedIds.length})
                                </Button>
                            )}
                            <Button variant="outline" onClick={() => loadData()}>
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Yenile
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12">
                                    <Checkbox
                                        checked={selectedIds.length === products.length && products.length > 0}
                                        onCheckedChange={toggleSelectAll}
                                    />
                                </TableHead>
                                <TableHead>Urun Adi</TableHead>
                                <TableHead>SKU</TableHead>
                                <TableHead>Barkod</TableHead>
                                <TableHead className="text-right">Fiyat</TableHead>
                                <TableHead className="text-right">Stok</TableHead>
                                <TableHead>Durum</TableHead>
                                <TableHead>WC ID</TableHead>
                                <TableHead>Son Senkron</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {products.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center py-8">
                                        <Package className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                                        <p className="text-muted-foreground">Henuz urun yok</p>
                                        <Button
                                            variant="link"
                                            onClick={handleFetchFromBizimHesap}
                                            disabled={fetching}
                                        >
                                            BizimHesap'tan urun cekin
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                products.map((product) => (
                                    <TableRow key={product.id}>
                                        <TableCell>
                                            <Checkbox
                                                checked={selectedIds.includes(product.id)}
                                                onCheckedChange={() => toggleSelect(product.id)}
                                            />
                                        </TableCell>
                                        <TableCell className="font-medium max-w-[200px] truncate">
                                            <Link
                                                to={`/bizimhesap-products/${product.id}`}
                                                className="hover:text-primary hover:underline"
                                            >
                                                {product.name}
                                            </Link>
                                        </TableCell>
                                        <TableCell>{product.sku || '-'}</TableCell>
                                        <TableCell>{product.barcode || '-'}</TableCell>
                                        <TableCell className="text-right">
                                            {formatPrice(product.price)}
                                        </TableCell>
                                        <TableCell className="text-right">{product.stock}</TableCell>
                                        <TableCell>{getStatusBadge(product.sync_status)}</TableCell>
                                        <TableCell>
                                            {product.wc_product_id ? (
                                                <Badge variant="outline">#{product.wc_product_id}</Badge>
                                            ) : (
                                                '-'
                                            )}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {formatDate(product.synced_at)}
                                            {product.sync_error && (
                                                <p className="text-red-500 text-xs truncate max-w-[150px]" title={product.sync_error}>
                                                    {product.sync_error}
                                                </p>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4">
                            <p className="text-sm text-muted-foreground">
                                Sayfa {currentPage} / {totalPages}
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                >
                                    Onceki
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                >
                                    Sonraki
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default BizimHesapProducts;
