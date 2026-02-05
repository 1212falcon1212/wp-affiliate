import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    ArrowLeft,
    Loader2,
    User,
    Mail,
    Phone,
    MapPin,
    CreditCard,
    FileText,
    RefreshCw,
    Package,
    Truck
} from "lucide-react";

interface OrderItem {
    id: number;
    name: string;
    sku: string;
    image_url?: string;
    quantity: number;
    price: number;
    subtotal: number;
    total: number;
    product_id: number;
    variation_id: number | null;
}

interface Order {
    id: number;
    wc_id: number;
    order_number: string;
    status: string;
    currency: string;
    total: number;
    subtotal: number;
    total_tax: number;
    shipping_total: number;
    discount_total: number;
    customer_id: number | null;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    billing_address: {
        first_name?: string;
        last_name?: string;
        company?: string;
        address_1?: string;
        address_2?: string;
        city?: string;
        state?: string;
        postcode?: string;
        country?: string;
        email?: string;
        phone?: string;
    };
    shipping_address: {
        first_name?: string;
        last_name?: string;
        company?: string;
        address_1?: string;
        address_2?: string;
        city?: string;
        state?: string;
        postcode?: string;
        country?: string;
    };
    payment_method: string;
    payment_method_title: string;
    transaction_id: string | null;
    date_created: string;
    date_paid: string | null;
    date_completed: string | null;
    invoice_id: string | null;
    invoice_number: string | null;
    invoice_date: string | null;
    coupon_code: string | null;
    customer_note: string | null;
    invoice_url?: string;
    items: OrderItem[];
    raw_data?: any;
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

const OrderDetail = () => {
    const { id } = useParams<{ id: string }>();
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [creatingInvoice, setCreatingInvoice] = useState(false);

    const fetchOrder = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/orders/${id}`);
            if (response.ok) {
                const data = await response.json();
                setOrder(data.data);
            }
        } catch (error) {
            console.error('Sipariş yüklenirken hata:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrder();
    }, [id]);

    const updateStatus = async (newStatus: string) => {
        if (!order) return;
        setUpdating(true);
        try {
            const response = await fetch(`/api/orders/${id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
            if (response.ok) {
                const data = await response.json();
                setOrder(data.data);
                alert('Sipariş durumu güncellendi!');
            } else {
                alert('Durum güncellenirken hata oluştu.');
            }
        } catch (error) {
            console.error('Durum güncelleme hatası:', error);
            alert('Durum güncellenirken hata oluştu.');
        } finally {
            setUpdating(false);
        }
    };

    const createInvoice = async () => {
        if (!order) return;
        setCreatingInvoice(true);
        try {
            const response = await fetch(`/api/orders/${id}/invoice`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            if (response.ok) {
                const data = await response.json();
                setOrder(data.data);
                alert('Fatura oluşturuldu!');
            } else {
                const error = await response.json();
                alert(error.message || 'Fatura oluşturulurken hata oluştu.');
            }
        } catch (error) {
            console.error('Fatura oluşturma hatası:', error);
            alert('Fatura oluşturulurken hata oluştu.');
        } finally {
            setCreatingInvoice(false);
        }
    };

    const formatCurrency = (amount: number, currency: string = 'TRY') => {
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: currency,
        }).format(amount);
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatAddress = (address: any) => {
        if (!address) return '-';
        const parts = [
            address.address_1,
            address.address_2,
            address.city,
            address.state,
            address.postcode,
            address.country,
        ].filter(Boolean);
        return parts.join(', ') || '-';
    };

    const getStatusBadge = (status: string) => {
        const config = statusConfig[status] || { label: status, color: 'text-gray-600', bgColor: 'bg-gray-500/20' };
        return (
            <Badge variant="secondary" className={`${config.bgColor} ${config.color} text-base px-3 py-1`}>
                {config.label}
            </Badge>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!order) {
        return (
            <div className="text-center py-12">
                <p className="text-lg text-muted-foreground">Sipariş bulunamadı</p>
                <Link to="/orders">
                    <Button variant="link">Siparişlere Dön</Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start">
                <div className="flex items-center gap-4">
                    <Link to="/orders">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">
                            Sipariş #{order.order_number}
                        </h2>
                        <p className="text-muted-foreground">
                            WC ID: {order.wc_id} | {formatDate(order.date_created)}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {getStatusBadge(order.status)}
                    <Select
                        value={order.status}
                        onValueChange={updateStatus}
                        disabled={updating}
                    >
                        <SelectTrigger className="w-[160px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="pending">Beklemede</SelectItem>
                            <SelectItem value="processing">İşleniyor</SelectItem>
                            <SelectItem value="on-hold">Bekletiliyor</SelectItem>
                            <SelectItem value="completed">Tamamlandı</SelectItem>
                            <SelectItem value="cancelled">İptal</SelectItem>
                            <SelectItem value="refunded">İade</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={fetchOrder}>
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Üst Kısım - Ürünler (Full Width) */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Sipariş Kalemleri
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-muted/50">
                                <tr>
                                    <th className="text-left p-3 font-medium w-16">Resim</th>
                                    <th className="text-left p-3 font-medium">Ürün</th>
                                    <th className="text-center p-3 font-medium">Adet</th>
                                    <th className="text-right p-3 font-medium">Birim Fiyat</th>
                                    <th className="text-right p-3 font-medium">Toplam</th>
                                </tr>
                            </thead>
                            <tbody>
                                {order.items.map((item) => (
                                    <tr key={item.id} className="border-t">
                                        <td className="p-3">
                                            {item.image_url ? (
                                                <img
                                                    src={item.image_url}
                                                    alt={item.name}
                                                    className="h-20 w-20 rounded object-contain border bg-white"
                                                />
                                            ) : (
                                                <div className="h-20 w-20 rounded bg-muted flex items-center justify-center border">
                                                    <Package className="h-8 w-8 text-muted-foreground" />
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-3">
                                            <p className="font-medium">{item.name}</p>
                                            {item.sku && (
                                                <p className="text-sm text-muted-foreground">
                                                    SKU: {item.sku}
                                                </p>
                                            )}
                                        </td>
                                        <td className="p-3 text-center">{item.quantity}</td>
                                        <td className="p-3 text-right">
                                            {formatCurrency(item.price, order.currency)}
                                        </td>
                                        <td className="p-3 text-right font-medium">
                                            {formatCurrency(item.total, order.currency)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-muted/30">
                                <tr className="border-t">
                                    <td colSpan={4} className="p-3 text-right">Ara Toplam:</td>
                                    <td className="p-3 text-right">{formatCurrency(order.subtotal, order.currency)}</td>
                                </tr>
                                {order.shipping_total > 0 && (
                                    <tr>
                                        <td colSpan={4} className="p-3 text-right">Kargo:</td>
                                        <td className="p-3 text-right">{formatCurrency(order.shipping_total, order.currency)}</td>
                                    </tr>
                                )}
                                {order.total_tax > 0 && (
                                    <tr>
                                        <td colSpan={4} className="p-3 text-right">Vergi:</td>
                                        <td className="p-3 text-right">{formatCurrency(order.total_tax, order.currency)}</td>
                                    </tr>
                                )}
                                {order.discount_total > 0 && (
                                    <tr>
                                        <td colSpan={4} className="p-3 text-right text-green-600">İndirim:</td>
                                        <td className="p-3 text-right text-green-600">-{formatCurrency(order.discount_total, order.currency)}</td>
                                    </tr>
                                )}
                                <tr className="border-t font-bold">
                                    <td colSpan={4} className="p-3 text-right">Genel Toplam:</td>
                                    <td className="p-3 text-right text-lg">{formatCurrency(order.total, order.currency)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Müşteri Notu */}
                    {order.customer_note && (
                        <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                            <h4 className="font-medium mb-1">Müşteri Notu:</h4>
                            <p className="text-muted-foreground">{order.customer_note}</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Alt Kısım - 3'lü Izgara (Grid) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* Müşteri Bilgileri */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5" />
                            Müşteri Bilgileri
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>{order.customer_name || 'Misafir'}</span>
                        </div>
                        {order.customer_email && (
                            <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <a href={`mailto:${order.customer_email}`} className="hover:text-primary">
                                    {order.customer_email}
                                </a>
                            </div>
                        )}
                        {order.customer_phone && (
                            <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <a href={`tel:${order.customer_phone}`} className="hover:text-primary">
                                    {order.customer_phone}
                                </a>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Fatura Adresi */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MapPin className="h-5 w-5" />
                            Fatura Adresi
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm">{formatAddress(order.billing_address)}</p>
                    </CardContent>
                </Card>

                {/* Teslimat Adresi */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MapPin className="h-5 w-5" />
                            Teslimat Adresi
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm">{formatAddress(order.shipping_address)}</p>
                    </CardContent>
                </Card>

                {/* Ödeme Bilgileri */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5" />
                            Ödeme Bilgileri
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Yöntem:</span>
                            <span>{order.payment_method_title || '-'}</span>
                        </div>
                        {order.transaction_id && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">İşlem ID:</span>
                                <span className="font-mono text-sm">{order.transaction_id}</span>
                            </div>
                        )}
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Ödeme Tarihi:</span>
                            <span>{formatDate(order.date_paid)}</span>
                        </div>
                        {order.coupon_code && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Kupon:</span>
                                <Badge variant="secondary">{order.coupon_code}</Badge>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Kargo Bilgileri (YENİ) */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Truck className="h-5 w-5" />
                            Kargo Detayları
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Kargo Ücreti (Vergili):</span>
                            <span>{formatCurrency(Number(order.raw_data?.shipping_total || 0) + Number(order.raw_data?.shipping_tax || 0), order.currency)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Kargo Vergisi:</span>
                            <span>{formatCurrency(Number(order.raw_data?.shipping_tax || 0), order.currency)}</span>
                        </div>
                        {order.raw_data?.shipping_lines && order.raw_data.shipping_lines.length > 0 && (
                            <div className="pt-2 border-t mt-2">
                                <span className="text-muted-foreground text-sm block mb-1">Kargo Metodu:</span>
                                {order.raw_data.shipping_lines.map((line: any, idx: number) => (
                                    <div key={idx} className="text-sm font-medium">
                                        {line.method_title || 'Standart Kargo'}
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Fatura */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Fatura
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {order.invoice_id ? (
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Fatura ID:</span>
                                    <span className="font-mono">{order.invoice_id}</span>
                                </div>
                                {order.invoice_number && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Fatura No:</span>
                                        <span>{order.invoice_number}</span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Tarih:</span>
                                    <span>{formatDate(order.invoice_date)}</span>
                                </div>
                                <Badge variant="secondary" className="bg-green-500/20 text-green-600 w-full justify-center">
                                    Fatura Kesildi
                                </Badge>
                                {order.invoice_url && (
                                    <Button
                                        variant="outline"
                                        className="w-full mt-2"
                                        onClick={() => window.open(order.invoice_url, '_blank')}
                                    >
                                        <FileText className="mr-2 h-4 w-4" />
                                        Fatura Göster
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <p className="text-sm text-muted-foreground text-center">
                                    Bu sipariş için henüz fatura kesilmedi
                                </p>
                                <Button
                                    className="w-full"
                                    onClick={createInvoice}
                                    disabled={creatingInvoice}
                                >
                                    {creatingInvoice ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Oluşturuluyor...
                                        </>
                                    ) : (
                                        <>
                                            <FileText className="mr-2 h-4 w-4" />
                                            Fatura Oluştur
                                        </>
                                    )}
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>


        </div>
    );
};

export default OrderDetail;
