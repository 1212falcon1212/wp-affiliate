import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Search, Eye, RefreshCw, Loader2, Download, FileText, ShoppingCart, TrendingUp, Clock, CheckCircle } from "lucide-react";

interface OrderItem {
    id: number;
    name: string;
    sku: string;
    quantity: number;
    price: number;
    total: number;
}

interface Order {
    id: number;
    wc_id: number;
    order_number: string;
    status: string;
    currency: string;
    total: number;
    subtotal: number;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    payment_method_title: string;
    date_created: string;
    invoice_id: string | null;
    items: OrderItem[];
}

interface Stats {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    cancelled: number;
    total_revenue: number;
    today_orders: number;
    today_revenue: number;
}

const statusConfig: { [key: string]: { label: string; color: string; bgColor: string } } = {
    'pending': { label: 'Beklemede', color: 'text-yellow-600', bgColor: 'bg-yellow-500/20' },
    'processing': { label: 'İşleniyor', color: 'text-blue-600', bgColor: 'bg-blue-500/20' },
    'on-hold': { label: 'Bekletiliyor', color: 'text-orange-600', bgColor: 'bg-orange-500/20' },
    'completed': { label: 'Tamamlandı', color: 'text-green-600', bgColor: 'bg-green-500/20' },
    'cancelled': { label: 'İptal', color: 'text-red-600', bgColor: 'bg-red-500/20' },
    'refunded': { label: 'İade', color: 'text-purple-600', bgColor: 'bg-purple-500/20' },
    'failed': { label: 'Başarısız', color: 'text-red-600', bgColor: 'bg-red-500/20' },
};

const Orders = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [stats, setStats] = useState<Stats | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchOrders = async (page = 1, search = "", status = "all") => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                per_page: '20',
                ...(search && { search }),
                ...(status !== 'all' && { status }),
            });

            const response = await fetch(`/api/orders?${params}`);
            if (response.ok) {
                const data = await response.json();
                setOrders(data.data);
                setCurrentPage(data.meta?.current_page || 1);
                setTotalPages(data.meta?.last_page || 1);
            }
        } catch (error) {
            console.error('Siparişler yüklenirken hata:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await fetch('/api/orders/stats');
            if (response.ok) {
                const data = await response.json();
                setStats(data.data);
            }
        } catch (error) {
            console.error('İstatistikler yüklenirken hata:', error);
        }
    };

    const syncOrders = async () => {
        setSyncing(true);
        try {
            const response = await fetch('/api/orders/fetch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            if (response.ok) {
                const data = await response.json();
                alert(`Senkronizasyon tamamlandı! ${data.stats.synced} sipariş senkronize edildi.`);
                fetchOrders(1, searchTerm, statusFilter);
                fetchStats();
            }
        } catch (error) {
            console.error('Senkronizasyon hatası:', error);
            alert('Senkronizasyon sırasında bir hata oluştu.');
        } finally {
            setSyncing(false);
        }
    };

    useEffect(() => {
        fetchOrders();
        fetchStats();
    }, []);

    useEffect(() => {
        const debounce = setTimeout(() => {
            fetchOrders(1, searchTerm, statusFilter);
        }, 300);
        return () => clearTimeout(debounce);
    }, [searchTerm, statusFilter]);

    const getStatusBadge = (status: string) => {
        const config = statusConfig[status] || { label: status, color: 'text-gray-600', bgColor: 'bg-gray-500/20' };
        return (
            <Badge variant="secondary" className={`${config.bgColor} ${config.color}`}>
                {config.label}
            </Badge>
        );
    };

    const formatCurrency = (amount: number, currency: string = 'TRY') => {
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: currency,
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="space-y-6">
            {/* İstatistik Kartları */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 rounded-full bg-blue-500/10">
                                <ShoppingCart className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Toplam Sipariş</p>
                                <p className="text-2xl font-bold">{stats.total}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 rounded-full bg-green-500/10">
                                <TrendingUp className="h-6 w-6 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Toplam Gelir</p>
                                <p className="text-2xl font-bold">{formatCurrency(stats.total_revenue)}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 rounded-full bg-yellow-500/10">
                                <Clock className="h-6 w-6 text-yellow-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">İşleniyor</p>
                                <p className="text-2xl font-bold">{stats.processing}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 rounded-full bg-emerald-500/10">
                                <CheckCircle className="h-6 w-6 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Tamamlanan</p>
                                <p className="text-2xl font-bold">{stats.completed}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Başlık ve Filtreler */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                <h2 className="text-3xl font-bold tracking-tight">Siparişler</h2>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    <Button onClick={syncOrders} disabled={syncing}>
                        {syncing ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Senkronize Ediliyor...
                            </>
                        ) : (
                            <>
                                <Download className="mr-2 h-4 w-4" />
                                Siparişleri Çek
                            </>
                        )}
                    </Button>
                    <Button variant="outline" onClick={() => fetchOrders(currentPage, searchTerm, statusFilter)}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Yenile
                    </Button>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Durum" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tümü</SelectItem>
                            <SelectItem value="pending">Beklemede</SelectItem>
                            <SelectItem value="processing">İşleniyor</SelectItem>
                            <SelectItem value="completed">Tamamlandı</SelectItem>
                            <SelectItem value="cancelled">İptal</SelectItem>
                        </SelectContent>
                    </Select>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Sipariş no veya müşteri..."
                            className="pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Sipariş Tablosu */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <ShoppingCart className="h-12 w-12 mb-4" />
                    <p className="text-lg">Henüz sipariş bulunmuyor</p>
                    <p className="text-sm">WooCommerce'den siparişleri çekmek için yukarıdaki butonu kullanın</p>
                </div>
            ) : (
                <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className="text-left p-4 font-medium">Sipariş</th>
                                <th className="text-left p-4 font-medium">Müşteri</th>
                                <th className="text-left p-4 font-medium">Durum</th>
                                <th className="text-left p-4 font-medium">Ödeme</th>
                                <th className="text-left p-4 font-medium">Tutar</th>
                                <th className="text-left p-4 font-medium">Tarih</th>
                                <th className="text-left p-4 font-medium">Fatura</th>
                                <th className="text-left p-4 font-medium">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map((order) => (
                                <tr key={order.id} className="border-t hover:bg-muted/30 transition-colors">
                                    <td className="p-4">
                                        <Link to={`/orders/${order.id}`} className="font-medium hover:text-primary">
                                            #{order.order_number}
                                        </Link>
                                        <p className="text-sm text-muted-foreground">
                                            {order.items?.length || 0} ürün
                                        </p>
                                    </td>
                                    <td className="p-4">
                                        <p className="font-medium">{order.customer_name || 'Misafir'}</p>
                                        <p className="text-sm text-muted-foreground">{order.customer_email}</p>
                                    </td>
                                    <td className="p-4">{getStatusBadge(order.status)}</td>
                                    <td className="p-4 text-sm">{order.payment_method_title || '-'}</td>
                                    <td className="p-4 font-medium">{formatCurrency(order.total, order.currency)}</td>
                                    <td className="p-4 text-sm text-muted-foreground">
                                        {order.date_created ? formatDate(order.date_created) : '-'}
                                    </td>
                                    <td className="p-4">
                                        {order.invoice_id ? (
                                            <Badge variant="secondary" className="bg-green-500/20 text-green-600">
                                                <FileText className="h-3 w-3 mr-1" />
                                                Kesildi
                                            </Badge>
                                        ) : (
                                            <Badge variant="secondary" className="bg-gray-500/20 text-gray-600">
                                                Bekliyor
                                            </Badge>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <Link to={`/orders/${order.id}`}>
                                            <Button variant="ghost" size="icon" title="Detay">
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Sayfalama */}
            {totalPages > 1 && (
                <div className="flex justify-center gap-2">
                    <Button
                        variant="outline"
                        disabled={currentPage === 1}
                        onClick={() => fetchOrders(currentPage - 1, searchTerm, statusFilter)}
                    >
                        Önceki
                    </Button>
                    <span className="flex items-center px-4">
                        Sayfa {currentPage} / {totalPages}
                    </span>
                    <Button
                        variant="outline"
                        disabled={currentPage === totalPages}
                        onClick={() => fetchOrders(currentPage + 1, searchTerm, statusFilter)}
                    >
                        Sonraki
                    </Button>
                </div>
            )}
        </div>
    );
};

export default Orders;
