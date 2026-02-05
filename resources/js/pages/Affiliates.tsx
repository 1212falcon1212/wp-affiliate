import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Search, Eye, RefreshCw, Loader2, Plus, Users, DollarSign, Ticket, TrendingUp
} from "lucide-react";

interface Affiliate {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    company: string | null;
    commission_rate: number;
    commission_type: string;
    total_earnings: number;
    pending_balance: number;
    total_orders: number;
    status: string;
    referral_code: string;
    created_at: string;
}

interface Stats {
    total_affiliates: number;
    active_affiliates: number;
    total_coupons: number;
    active_coupons: number;
    total_referrals: number;
    pending_referrals: number;
    total_commissions: number;
    pending_commissions: number;
}

const statusConfig: { [key: string]: { label: string; color: string; bgColor: string } } = {
    'active': { label: 'Aktif', color: 'text-green-600', bgColor: 'bg-green-500/20' },
    'inactive': { label: 'Pasif', color: 'text-gray-600', bgColor: 'bg-gray-500/20' },
    'suspended': { label: 'Askida', color: 'text-red-600', bgColor: 'bg-red-500/20' },
};

const Affiliates = () => {
    const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<Stats | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [creating, setCreating] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        company: '',
        commission_rate: '10',
        commission_type: 'percentage',
        payment_method: 'bank_transfer',
        notes: '',
    });

    const fetchAffiliates = async (page = 1, search = "", status = "all") => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                per_page: '20',
                ...(search && { search }),
                ...(status !== 'all' && { status }),
            });

            const response = await fetch(`/api/affiliates?${params}`);
            if (response.ok) {
                const data = await response.json();
                setAffiliates(data.data);
                setCurrentPage(data.meta?.current_page || 1);
                setTotalPages(data.meta?.last_page || 1);
            }
        } catch (error) {
            console.error('Affiliates yuklenirken hata:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await fetch('/api/affiliates/stats');
            if (response.ok) {
                const data = await response.json();
                setStats(data.data);
            }
        } catch (error) {
            console.error('Istatistikler yuklenirken hata:', error);
        }
    };

    useEffect(() => {
        fetchAffiliates();
        fetchStats();
    }, []);

    useEffect(() => {
        const debounce = setTimeout(() => {
            fetchAffiliates(1, searchTerm, statusFilter);
        }, 300);
        return () => clearTimeout(debounce);
    }, [searchTerm, statusFilter]);

    const handleCreate = async () => {
        setCreating(true);
        try {
            const response = await fetch('/api/affiliates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    commission_rate: parseFloat(formData.commission_rate),
                }),
            });

            if (response.ok) {
                alert('Affiliate olusturuldu!');
                setShowCreateDialog(false);
                setFormData({
                    name: '',
                    email: '',
                    phone: '',
                    company: '',
                    commission_rate: '10',
                    commission_type: 'percentage',
                    payment_method: 'bank_transfer',
                    notes: '',
                });
                fetchAffiliates();
                fetchStats();
            } else {
                const error = await response.json();
                alert(error.message || 'Olusturma hatasi');
            }
        } catch (error) {
            console.error('Olusturma hatasi:', error);
            alert('Olusturma hatasi');
        } finally {
            setCreating(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const config = statusConfig[status] || { label: status, color: 'text-gray-600', bgColor: 'bg-gray-500/20' };
        return (
            <Badge variant="secondary" className={`${config.bgColor} ${config.color}`}>
                {config.label}
            </Badge>
        );
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY',
        }).format(amount);
    };

    return (
        <div className="space-y-6">
            {/* Istatistik Kartlari */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 rounded-full bg-blue-500/10">
                                <Users className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Toplam Ortak</p>
                                <p className="text-2xl font-bold">{stats.total_affiliates}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 rounded-full bg-green-500/10">
                                <Ticket className="h-6 w-6 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Aktif Kupon</p>
                                <p className="text-2xl font-bold">{stats.active_coupons}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 rounded-full bg-purple-500/10">
                                <TrendingUp className="h-6 w-6 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Toplam Komisyon</p>
                                <p className="text-2xl font-bold">{formatCurrency(stats.total_commissions)}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 rounded-full bg-yellow-500/10">
                                <DollarSign className="h-6 w-6 text-yellow-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Bekleyen</p>
                                <p className="text-2xl font-bold">{formatCurrency(stats.pending_commissions)}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Baslik ve Filtreler */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                <h2 className="text-3xl font-bold tracking-tight">Ortaklar</h2>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                Yeni Ortak
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>Yeni Ortak Olustur</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Ad Soyad *</Label>
                                    <Input
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Ortak adi"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>E-posta *</Label>
                                    <Input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="ornek@email.com"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Telefon</Label>
                                        <Input
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            placeholder="05xx xxx xx xx"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Sirket</Label>
                                        <Input
                                            value={formData.company}
                                            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                                            placeholder="Sirket adi"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Komisyon Orani *</Label>
                                        <Input
                                            type="number"
                                            value={formData.commission_rate}
                                            onChange={(e) => setFormData({ ...formData, commission_rate: e.target.value })}
                                            placeholder="10"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Komisyon Tipi *</Label>
                                        <Select
                                            value={formData.commission_type}
                                            onValueChange={(value) => setFormData({ ...formData, commission_type: value })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="percentage">Yuzde (%)</SelectItem>
                                                <SelectItem value="fixed">Sabit Tutar</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Odeme Yontemi *</Label>
                                    <Select
                                        value={formData.payment_method}
                                        onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="bank_transfer">Banka Transferi</SelectItem>
                                            <SelectItem value="paypal">PayPal</SelectItem>
                                            <SelectItem value="other">Diger</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Notlar</Label>
                                    <Textarea
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                        placeholder="Ek notlar..."
                                    />
                                </div>
                                <Button className="w-full" onClick={handleCreate} disabled={creating}>
                                    {creating ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Olusturuluyor...
                                        </>
                                    ) : (
                                        'Ortak Olustur'
                                    )}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                    <Button variant="outline" onClick={() => fetchAffiliates(currentPage, searchTerm, statusFilter)}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Yenile
                    </Button>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Durum" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tumu</SelectItem>
                            <SelectItem value="active">Aktif</SelectItem>
                            <SelectItem value="inactive">Pasif</SelectItem>
                            <SelectItem value="suspended">Askida</SelectItem>
                        </SelectContent>
                    </Select>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Isim veya e-posta ara..."
                            className="pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Affiliate Tablosu */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : affiliates.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <Users className="h-12 w-12 mb-4" />
                    <p className="text-lg">Henuz ortak bulunmuyor</p>
                    <p className="text-sm">Yeni ortak eklemek icin yukaridaki butonu kullanin</p>
                </div>
            ) : (
                <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className="text-left p-4 font-medium">Ortak</th>
                                <th className="text-left p-4 font-medium">Referans Kodu</th>
                                <th className="text-left p-4 font-medium">Komisyon</th>
                                <th className="text-left p-4 font-medium">Kazanc</th>
                                <th className="text-left p-4 font-medium">Siparis</th>
                                <th className="text-left p-4 font-medium">Durum</th>
                                <th className="text-left p-4 font-medium">Islemler</th>
                            </tr>
                        </thead>
                        <tbody>
                            {affiliates.map((affiliate) => (
                                <tr key={affiliate.id} className="border-t hover:bg-muted/30 transition-colors">
                                    <td className="p-4">
                                        <Link to={`/affiliates/${affiliate.id}`} className="font-medium hover:text-primary">
                                            {affiliate.name}
                                        </Link>
                                        <p className="text-sm text-muted-foreground">{affiliate.email}</p>
                                    </td>
                                    <td className="p-4">
                                        <code className="bg-muted px-2 py-1 rounded text-sm">{affiliate.referral_code}</code>
                                    </td>
                                    <td className="p-4">
                                        {affiliate.commission_type === 'percentage'
                                            ? `%${affiliate.commission_rate}`
                                            : formatCurrency(affiliate.commission_rate)}
                                    </td>
                                    <td className="p-4">
                                        <div>
                                            <p className="font-medium">{formatCurrency(affiliate.total_earnings)}</p>
                                            {affiliate.pending_balance > 0 && (
                                                <p className="text-sm text-yellow-600">
                                                    Bekleyen: {formatCurrency(affiliate.pending_balance)}
                                                </p>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4">{affiliate.total_orders}</td>
                                    <td className="p-4">{getStatusBadge(affiliate.status)}</td>
                                    <td className="p-4">
                                        <Link to={`/affiliates/${affiliate.id}`}>
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
                        onClick={() => fetchAffiliates(currentPage - 1, searchTerm, statusFilter)}
                    >
                        Onceki
                    </Button>
                    <span className="flex items-center px-4">
                        Sayfa {currentPage} / {totalPages}
                    </span>
                    <Button
                        variant="outline"
                        disabled={currentPage === totalPages}
                        onClick={() => fetchAffiliates(currentPage + 1, searchTerm, statusFilter)}
                    >
                        Sonraki
                    </Button>
                </div>
            )}
        </div>
    );
};

export default Affiliates;
