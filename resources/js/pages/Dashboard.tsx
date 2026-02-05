import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, ShoppingCart, Package, Users, TrendingUp, Clock, Loader2 } from "lucide-react";

interface OrderStats {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    cancelled: number;
    total_revenue: number;
    today_orders: number;
    today_revenue: number;
}

interface ProductStats {
    total_products: number;
    published: number;
    in_stock: number;
    out_of_stock: number;
    low_stock: number;
    on_sale: number;
}

interface AffiliateStats {
    total_affiliates: number;
    active_affiliates: number;
    total_coupons: number;
    active_coupons: number;
    total_referrals: number;
    pending_referrals: number;
    total_commissions: number;
    pending_commissions: number;
    paid_commissions: number;
}

const Dashboard = () => {
    const [orderStats, setOrderStats] = useState<OrderStats | null>(null);
    const [productStats, setProductStats] = useState<ProductStats | null>(null);
    const [affiliateStats, setAffiliateStats] = useState<AffiliateStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);
            try {
                const [orderRes, productRes, affiliateRes] = await Promise.all([
                    fetch('/api/orders/stats'),
                    fetch('/api/products/stats'),
                    fetch('/api/affiliates/stats'),
                ]);

                if (orderRes.ok) {
                    const data = await orderRes.json();
                    setOrderStats(data.data);
                }

                if (productRes.ok) {
                    const data = await productRes.json();
                    setProductStats(data);
                }

                if (affiliateRes.ok) {
                    const data = await affiliateRes.json();
                    setAffiliateStats(data.data);
                }
            } catch (error) {
                console.error('Dashboard verileri yuklenirken hata:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY',
        }).format(amount || 0);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold tracking-tight">Genel Bakis</h2>
                <div className="flex gap-2">
                    <Link to="/orders">
                        <Button variant="outline">Siparisler</Button>
                    </Link>
                    <Link to="/products">
                        <Button variant="outline">Urunler</Button>
                    </Link>
                    <Link to="/affiliates">
                        <Button variant="outline">Ortaklar</Button>
                    </Link>
                </div>
            </div>

            {/* Ana Metrikler */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Toplam Gelir</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(orderStats?.total_revenue || 0)}</div>
                        <p className="text-xs text-muted-foreground">Tamamlanan siparislerden</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Toplam Siparis</CardTitle>
                        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{orderStats?.total || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            Bugun: {orderStats?.today_orders || 0} siparis
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Toplam Urun</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{productStats?.total_products || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            {productStats?.published || 0} yayinda
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Ortaklar</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{affiliateStats?.active_affiliates || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            {formatCurrency(affiliateStats?.pending_commissions || 0)} bekleyen
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Siparis Durumlari */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5" />
                            Siparis Durumlari
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                    <span>Beklemede</span>
                                </div>
                                <span className="font-bold">{orderStats?.pending || 0}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                    <span>Isleniyor</span>
                                </div>
                                <span className="font-bold">{orderStats?.processing || 0}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                    <span>Tamamlandi</span>
                                </div>
                                <span className="font-bold">{orderStats?.completed || 0}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                    <span>Iptal</span>
                                </div>
                                <span className="font-bold">{orderStats?.cancelled || 0}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5" />
                            Stok Durumu
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                    <span>Stokta</span>
                                </div>
                                <span className="font-bold">{productStats?.in_stock || 0}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                    <span>Az Stok</span>
                                </div>
                                <span className="font-bold">{productStats?.low_stock || 0}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                    <span>Stok Tukendi</span>
                                </div>
                                <span className="font-bold">{productStats?.out_of_stock || 0}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                                    <span>Indirimde</span>
                                </div>
                                <span className="font-bold">{productStats?.on_sale || 0}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Bugunun Ozeti */}
            {orderStats && orderStats.today_orders > 0 && (
                <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold">Bugunun Ozeti</h3>
                                <p className="text-muted-foreground">
                                    Bugun {orderStats.today_orders} siparis alindi
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-bold">{formatCurrency(orderStats.today_revenue)}</p>
                                <p className="text-sm text-muted-foreground">Bugunun geliri</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default Dashboard;
