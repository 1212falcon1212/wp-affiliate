import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import {
    ArrowLeft,
    Loader2,
    User,
    Mail,
    Phone,
    Building,
    RefreshCw,
    Ticket,
    Plus,
    Edit,
    Trash2,
    DollarSign,
    TrendingUp,
    ShoppingCart,
    Check,
    CreditCard,
    Calendar,
    Percent,
    Hash
} from "lucide-react";

interface Coupon {
    id: number;
    code: string;
    discount_type: string;
    amount: number;
    minimum_amount: number | null;
    maximum_amount: number | null;
    usage_limit: number | null;
    usage_count: number;
    status: string;
    date_expires: string | null;
    wc_coupon_id: number | null;
}

interface Referral {
    id: number;
    order_id: string;
    coupon_code: string;
    order_total: number;
    commission_rate: number;
    commission_amount: number;
    currency: string;
    status: string;
    created_at: string;
    paid_at: string | null;
    order?: {
        order_number: string;
        customer_name: string;
    };
}

interface Affiliate {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    company: string | null;
    referral_code: string;
    commission_rate: number;
    commission_type: string;
    payment_method: string;
    payment_details: any;
    total_earnings: number;
    pending_balance: number;
    paid_balance: number;
    total_orders: number;
    status: string;
    notes: string | null;
    last_activity_at: string | null;
    created_at: string;
    coupons: Coupon[];
    referrals: Referral[];
}

interface Earnings {
    total_earnings: number;
    pending_balance: number;
    paid_balance: number;
    total_orders: number;
    commission_rate: number;
    commission_type: string;
    recent_referrals: Referral[];
}

const statusConfig: { [key: string]: { label: string; color: string; bgColor: string } } = {
    'active': { label: 'Aktif', color: 'text-green-600', bgColor: 'bg-green-500/20' },
    'inactive': { label: 'Pasif', color: 'text-gray-600', bgColor: 'bg-gray-500/20' },
    'suspended': { label: 'Askida', color: 'text-red-600', bgColor: 'bg-red-500/20' },
};

const referralStatusConfig: { [key: string]: { label: string; color: string; bgColor: string } } = {
    'pending': { label: 'Beklemede', color: 'text-yellow-600', bgColor: 'bg-yellow-500/20' },
    'confirmed': { label: 'Onaylandi', color: 'text-blue-600', bgColor: 'bg-blue-500/20' },
    'paid': { label: 'Odendi', color: 'text-green-600', bgColor: 'bg-green-500/20' },
    'cancelled': { label: 'Iptal', color: 'text-red-600', bgColor: 'bg-red-500/20' },
};

const AffiliateDetail = () => {
    const { id } = useParams<{ id: string }>();
    const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
    const [earnings, setEarnings] = useState<Earnings | null>(null);
    const [referrals, setReferrals] = useState<Referral[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [activeTab, setActiveTab] = useState("overview");

    // Dialog states
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [showCouponDialog, setShowCouponDialog] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
    const [savingCoupon, setSavingCoupon] = useState(false);

    // Referral states
    const [selectedReferrals, setSelectedReferrals] = useState<number[]>([]);
    const [confirmingReferral, setConfirmingReferral] = useState<number | null>(null);
    const [markingAsPaid, setMarkingAsPaid] = useState(false);

    // Edit form
    const [editForm, setEditForm] = useState({
        name: '',
        email: '',
        phone: '',
        company: '',
        commission_rate: '',
        commission_type: 'percentage',
        payment_method: 'bank_transfer',
        status: 'active',
        notes: '',
    });

    // Coupon form
    const [couponForm, setCouponForm] = useState({
        code: '',
        discount_type: 'percent',
        amount: '',
        minimum_amount: '',
        maximum_amount: '',
        usage_limit: '',
        usage_limit_per_user: '',
        date_expires: '',
        individual_use: false,
        exclude_sale_items: false,
    });

    const fetchAffiliate = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/affiliates/${id}`);
            if (response.ok) {
                const data = await response.json();
                setAffiliate(data.data);
                setEditForm({
                    name: data.data.name || '',
                    email: data.data.email || '',
                    phone: data.data.phone || '',
                    company: data.data.company || '',
                    commission_rate: data.data.commission_rate?.toString() || '',
                    commission_type: data.data.commission_type || 'percentage',
                    payment_method: data.data.payment_method || 'bank_transfer',
                    status: data.data.status || 'active',
                    notes: data.data.notes || '',
                });
            }
        } catch (error) {
            console.error('Affiliate yuklenirken hata:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchEarnings = async () => {
        try {
            const response = await fetch(`/api/affiliates/${id}/earnings`);
            if (response.ok) {
                const data = await response.json();
                setEarnings(data.data);
            }
        } catch (error) {
            console.error('Kazanc yuklenirken hata:', error);
        }
    };

    const fetchReferrals = async () => {
        try {
            const response = await fetch(`/api/affiliates/${id}/referrals?per_page=50`);
            if (response.ok) {
                const data = await response.json();
                setReferrals(data.data);
            }
        } catch (error) {
            console.error('Referrallar yuklenirken hata:', error);
        }
    };

    useEffect(() => {
        fetchAffiliate();
        fetchEarnings();
        fetchReferrals();
    }, [id]);

    const handleUpdate = async () => {
        setUpdating(true);
        try {
            const response = await fetch(`/api/affiliates/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...editForm,
                    commission_rate: parseFloat(editForm.commission_rate),
                }),
            });

            if (response.ok) {
                alert('Affiliate guncellendi!');
                setShowEditDialog(false);
                fetchAffiliate();
            } else {
                const error = await response.json();
                alert(error.message || 'Guncelleme hatasi');
            }
        } catch (error) {
            console.error('Guncelleme hatasi:', error);
            alert('Guncelleme hatasi');
        } finally {
            setUpdating(false);
        }
    };

    const handleCreateCoupon = async () => {
        setSavingCoupon(true);
        try {
            const payload: any = {
                code: couponForm.code,
                discount_type: couponForm.discount_type,
                amount: parseFloat(couponForm.amount),
            };
            if (couponForm.minimum_amount) payload.minimum_amount = parseFloat(couponForm.minimum_amount);
            if (couponForm.maximum_amount) payload.maximum_amount = parseFloat(couponForm.maximum_amount);
            if (couponForm.usage_limit) payload.usage_limit = parseInt(couponForm.usage_limit);
            if (couponForm.usage_limit_per_user) payload.usage_limit_per_user = parseInt(couponForm.usage_limit_per_user);
            if (couponForm.date_expires) payload.date_expires = couponForm.date_expires;
            payload.individual_use = couponForm.individual_use;
            payload.exclude_sale_items = couponForm.exclude_sale_items;

            const response = await fetch(`/api/affiliates/${id}/coupons`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                alert('Kupon olusturuldu!');
                setShowCouponDialog(false);
                resetCouponForm();
                fetchAffiliate();
            } else {
                const error = await response.json();
                alert(error.message || 'Kupon olusturma hatasi');
            }
        } catch (error) {
            console.error('Kupon olusturma hatasi:', error);
            alert('Kupon olusturma hatasi');
        } finally {
            setSavingCoupon(false);
        }
    };

    const handleUpdateCoupon = async () => {
        if (!editingCoupon) return;
        setSavingCoupon(true);
        try {
            const payload: any = {
                discount_type: couponForm.discount_type,
                amount: parseFloat(couponForm.amount),
            };
            if (couponForm.minimum_amount) payload.minimum_amount = parseFloat(couponForm.minimum_amount);
            if (couponForm.maximum_amount) payload.maximum_amount = parseFloat(couponForm.maximum_amount);
            if (couponForm.usage_limit) payload.usage_limit = parseInt(couponForm.usage_limit);
            if (couponForm.date_expires) payload.date_expires = couponForm.date_expires;

            const response = await fetch(`/api/affiliates/${id}/coupons/${editingCoupon.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                alert('Kupon guncellendi!');
                setShowCouponDialog(false);
                setEditingCoupon(null);
                resetCouponForm();
                fetchAffiliate();
            } else {
                const error = await response.json();
                alert(error.message || 'Kupon guncelleme hatasi');
            }
        } catch (error) {
            console.error('Kupon guncelleme hatasi:', error);
            alert('Kupon guncelleme hatasi');
        } finally {
            setSavingCoupon(false);
        }
    };

    const handleDeleteCoupon = async (couponId: number) => {
        if (!confirm('Bu kuponu silmek istediginize emin misiniz?')) return;

        try {
            const response = await fetch(`/api/affiliates/${id}/coupons/${couponId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                alert('Kupon silindi!');
                fetchAffiliate();
            } else {
                alert('Silme hatasi');
            }
        } catch (error) {
            console.error('Silme hatasi:', error);
            alert('Silme hatasi');
        }
    };

    const handleConfirmReferral = async (referralId: number) => {
        setConfirmingReferral(referralId);
        try {
            const response = await fetch(`/api/affiliates/${id}/referrals/${referralId}/confirm`, {
                method: 'POST',
            });

            if (response.ok) {
                alert('Referral onaylandi!');
                fetchReferrals();
                fetchEarnings();
            } else {
                alert('Onaylama hatasi');
            }
        } catch (error) {
            console.error('Onaylama hatasi:', error);
            alert('Onaylama hatasi');
        } finally {
            setConfirmingReferral(null);
        }
    };

    const handleMarkAsPaid = async () => {
        if (selectedReferrals.length === 0) {
            alert('Lutfen odeme yapilacak referrallari secin');
            return;
        }

        setMarkingAsPaid(true);
        try {
            const response = await fetch(`/api/affiliates/${id}/mark-as-paid`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ referral_ids: selectedReferrals }),
            });

            if (response.ok) {
                alert('Secili referrallar odendi olarak isaretlendi!');
                setSelectedReferrals([]);
                fetchReferrals();
                fetchEarnings();
                fetchAffiliate();
            } else {
                alert('Islem hatasi');
            }
        } catch (error) {
            console.error('Odeme hatasi:', error);
            alert('Islem hatasi');
        } finally {
            setMarkingAsPaid(false);
        }
    };

    const resetCouponForm = () => {
        setCouponForm({
            code: '',
            discount_type: 'percent',
            amount: '',
            minimum_amount: '',
            maximum_amount: '',
            usage_limit: '',
            usage_limit_per_user: '',
            date_expires: '',
            individual_use: false,
            exclude_sale_items: false,
        });
    };

    const openEditCouponDialog = (coupon: Coupon) => {
        setEditingCoupon(coupon);
        setCouponForm({
            code: coupon.code,
            discount_type: coupon.discount_type,
            amount: coupon.amount.toString(),
            minimum_amount: coupon.minimum_amount?.toString() || '',
            maximum_amount: coupon.maximum_amount?.toString() || '',
            usage_limit: coupon.usage_limit?.toString() || '',
            usage_limit_per_user: '',
            date_expires: coupon.date_expires || '',
            individual_use: false,
            exclude_sale_items: false,
        });
        setShowCouponDialog(true);
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
        });
    };

    const getStatusBadge = (status: string, config: any) => {
        const statusInfo = config[status] || { label: status, color: 'text-gray-600', bgColor: 'bg-gray-500/20' };
        return (
            <Badge variant="secondary" className={`${statusInfo.bgColor} ${statusInfo.color}`}>
                {statusInfo.label}
            </Badge>
        );
    };

    const getDiscountLabel = (type: string, amount: number) => {
        switch (type) {
            case 'percent': return `%${amount}`;
            case 'fixed_cart': return `${formatCurrency(amount)} (Sepet)`;
            case 'fixed_product': return `${formatCurrency(amount)} (Urun)`;
            default: return amount.toString();
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!affiliate) {
        return (
            <div className="text-center py-12">
                <p className="text-lg text-muted-foreground">Affiliate bulunamadi</p>
                <Link to="/affiliates">
                    <Button variant="link">Ortaklara Don</Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start">
                <div className="flex items-center gap-4">
                    <Link to="/affiliates">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">{affiliate.name}</h2>
                        <p className="text-muted-foreground">
                            Referans Kodu: <code className="bg-muted px-2 py-0.5 rounded">{affiliate.referral_code}</code>
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {getStatusBadge(affiliate.status, statusConfig)}
                    <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                        <DialogTrigger asChild>
                            <Button variant="outline">
                                <Edit className="mr-2 h-4 w-4" />
                                Duzenle
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>Affiliate Duzenle</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Ad Soyad</Label>
                                    <Input
                                        value={editForm.name}
                                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>E-posta</Label>
                                    <Input
                                        type="email"
                                        value={editForm.email}
                                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Telefon</Label>
                                        <Input
                                            value={editForm.phone}
                                            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Sirket</Label>
                                        <Input
                                            value={editForm.company}
                                            onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Komisyon Orani</Label>
                                        <Input
                                            type="number"
                                            value={editForm.commission_rate}
                                            onChange={(e) => setEditForm({ ...editForm, commission_rate: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Komisyon Tipi</Label>
                                        <Select
                                            value={editForm.commission_type}
                                            onValueChange={(value) => setEditForm({ ...editForm, commission_type: value })}
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
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Odeme Yontemi</Label>
                                        <Select
                                            value={editForm.payment_method}
                                            onValueChange={(value) => setEditForm({ ...editForm, payment_method: value })}
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
                                        <Label>Durum</Label>
                                        <Select
                                            value={editForm.status}
                                            onValueChange={(value) => setEditForm({ ...editForm, status: value })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="active">Aktif</SelectItem>
                                                <SelectItem value="inactive">Pasif</SelectItem>
                                                <SelectItem value="suspended">Askida</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Notlar</Label>
                                    <Textarea
                                        value={editForm.notes}
                                        onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                                    />
                                </div>
                                <Button className="w-full" onClick={handleUpdate} disabled={updating}>
                                    {updating ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Kaydediliyor...
                                        </>
                                    ) : (
                                        'Kaydet'
                                    )}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                    <Button variant="outline" onClick={() => { fetchAffiliate(); fetchEarnings(); fetchReferrals(); }}>
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 rounded-full bg-green-500/10">
                            <TrendingUp className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Toplam Kazanc</p>
                            <p className="text-2xl font-bold">{formatCurrency(affiliate.total_earnings)}</p>
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
                            <p className="text-2xl font-bold">{formatCurrency(affiliate.pending_balance)}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 rounded-full bg-blue-500/10">
                            <CreditCard className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Odenen</p>
                            <p className="text-2xl font-bold">{formatCurrency(affiliate.paid_balance)}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 rounded-full bg-purple-500/10">
                            <ShoppingCart className="h-6 w-6 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Siparis</p>
                            <p className="text-2xl font-bold">{affiliate.total_orders}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="overview">Genel Bilgi</TabsTrigger>
                    <TabsTrigger value="coupons">Kuponlar ({affiliate.coupons?.length || 0})</TabsTrigger>
                    <TabsTrigger value="referrals">Referrallar ({referrals.length})</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <User className="h-5 w-5" />
                                    Iletisim Bilgileri
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                    <a href={`mailto:${affiliate.email}`} className="hover:text-primary">
                                        {affiliate.email}
                                    </a>
                                </div>
                                {affiliate.phone && (
                                    <div className="flex items-center gap-3">
                                        <Phone className="h-4 w-4 text-muted-foreground" />
                                        <a href={`tel:${affiliate.phone}`} className="hover:text-primary">
                                            {affiliate.phone}
                                        </a>
                                    </div>
                                )}
                                {affiliate.company && (
                                    <div className="flex items-center gap-3">
                                        <Building className="h-4 w-4 text-muted-foreground" />
                                        <span>{affiliate.company}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-3">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <span>Kayit: {formatDate(affiliate.created_at)}</span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Percent className="h-5 w-5" />
                                    Komisyon Ayarlari
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">Komisyon Orani:</span>
                                    <span className="font-medium">
                                        {affiliate.commission_type === 'percentage'
                                            ? `%${affiliate.commission_rate}`
                                            : formatCurrency(affiliate.commission_rate)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">Komisyon Tipi:</span>
                                    <Badge variant="secondary">
                                        {affiliate.commission_type === 'percentage' ? 'Yuzde' : 'Sabit'}
                                    </Badge>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">Odeme Yontemi:</span>
                                    <span className="font-medium">
                                        {affiliate.payment_method === 'bank_transfer' ? 'Banka Transferi' :
                                            affiliate.payment_method === 'paypal' ? 'PayPal' : 'Diger'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">Son Aktivite:</span>
                                    <span>{formatDate(affiliate.last_activity_at)}</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {affiliate.notes && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Notlar</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground whitespace-pre-wrap">{affiliate.notes}</p>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* Coupons Tab */}
                <TabsContent value="coupons" className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold">Kuponlar</h3>
                        <Dialog open={showCouponDialog} onOpenChange={(open) => {
                            setShowCouponDialog(open);
                            if (!open) {
                                setEditingCoupon(null);
                                resetCouponForm();
                            }
                        }}>
                            <DialogTrigger asChild>
                                <Button>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Yeni Kupon
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                                <DialogHeader>
                                    <DialogTitle>
                                        {editingCoupon ? 'Kupon Duzenle' : 'Yeni Kupon Olustur'}
                                    </DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label>Kupon Kodu *</Label>
                                        <Input
                                            value={couponForm.code}
                                            onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                                            placeholder="ORNEK2024"
                                            disabled={!!editingCoupon}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Indirim Tipi *</Label>
                                            <Select
                                                value={couponForm.discount_type}
                                                onValueChange={(value) => setCouponForm({ ...couponForm, discount_type: value })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="percent">Yuzde (%)</SelectItem>
                                                    <SelectItem value="fixed_cart">Sabit (Sepet)</SelectItem>
                                                    <SelectItem value="fixed_product">Sabit (Urun)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Indirim Tutari *</Label>
                                            <Input
                                                type="number"
                                                value={couponForm.amount}
                                                onChange={(e) => setCouponForm({ ...couponForm, amount: e.target.value })}
                                                placeholder="10"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Min. Sepet Tutari</Label>
                                            <Input
                                                type="number"
                                                value={couponForm.minimum_amount}
                                                onChange={(e) => setCouponForm({ ...couponForm, minimum_amount: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Max. Indirim</Label>
                                            <Input
                                                type="number"
                                                value={couponForm.maximum_amount}
                                                onChange={(e) => setCouponForm({ ...couponForm, maximum_amount: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Kullanim Limiti</Label>
                                            <Input
                                                type="number"
                                                value={couponForm.usage_limit}
                                                onChange={(e) => setCouponForm({ ...couponForm, usage_limit: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Son Kullanim</Label>
                                            <Input
                                                type="date"
                                                value={couponForm.date_expires}
                                                onChange={(e) => setCouponForm({ ...couponForm, date_expires: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <Button
                                        className="w-full"
                                        onClick={editingCoupon ? handleUpdateCoupon : handleCreateCoupon}
                                        disabled={savingCoupon}
                                    >
                                        {savingCoupon ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Kaydediliyor...
                                            </>
                                        ) : editingCoupon ? 'Guncelle' : 'Olustur'}
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>

                    {affiliate.coupons?.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <Ticket className="h-12 w-12 mb-4" />
                            <p>Henuz kupon bulunmuyor</p>
                        </div>
                    ) : (
                        <div className="border rounded-lg overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-muted/50">
                                    <tr>
                                        <th className="text-left p-4 font-medium">Kod</th>
                                        <th className="text-left p-4 font-medium">Indirim</th>
                                        <th className="text-left p-4 font-medium">Kullanim</th>
                                        <th className="text-left p-4 font-medium">Son Tarih</th>
                                        <th className="text-left p-4 font-medium">Durum</th>
                                        <th className="text-left p-4 font-medium">Islemler</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {affiliate.coupons?.map((coupon) => (
                                        <tr key={coupon.id} className="border-t hover:bg-muted/30">
                                            <td className="p-4">
                                                <code className="bg-muted px-2 py-1 rounded">{coupon.code}</code>
                                            </td>
                                            <td className="p-4">{getDiscountLabel(coupon.discount_type, coupon.amount)}</td>
                                            <td className="p-4">
                                                {coupon.usage_count} / {coupon.usage_limit || '∞'}
                                            </td>
                                            <td className="p-4">{formatDate(coupon.date_expires)}</td>
                                            <td className="p-4">
                                                <Badge variant="secondary" className={
                                                    coupon.status === 'active'
                                                        ? 'bg-green-500/20 text-green-600'
                                                        : 'bg-gray-500/20 text-gray-600'
                                                }>
                                                    {coupon.status === 'active' ? 'Aktif' : 'Pasif'}
                                                </Badge>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => openEditCouponDialog(coupon)}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDeleteCoupon(coupon.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-red-500" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </TabsContent>

                {/* Referrals Tab */}
                <TabsContent value="referrals" className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold">Referrallar</h3>
                        {selectedReferrals.length > 0 && (
                            <Button onClick={handleMarkAsPaid} disabled={markingAsPaid}>
                                {markingAsPaid ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Isleniyor...
                                    </>
                                ) : (
                                    <>
                                        <CreditCard className="mr-2 h-4 w-4" />
                                        Secilenleri Ode ({selectedReferrals.length})
                                    </>
                                )}
                            </Button>
                        )}
                    </div>

                    {referrals.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <ShoppingCart className="h-12 w-12 mb-4" />
                            <p>Henuz referral bulunmuyor</p>
                        </div>
                    ) : (
                        <div className="border rounded-lg overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-muted/50">
                                    <tr>
                                        <th className="p-4 w-12">
                                            <input
                                                type="checkbox"
                                                checked={selectedReferrals.length === referrals.filter(r => r.status === 'confirmed').length}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedReferrals(referrals.filter(r => r.status === 'confirmed').map(r => r.id));
                                                    } else {
                                                        setSelectedReferrals([]);
                                                    }
                                                }}
                                            />
                                        </th>
                                        <th className="text-left p-4 font-medium">Siparis</th>
                                        <th className="text-left p-4 font-medium">Kupon</th>
                                        <th className="text-left p-4 font-medium">Siparis Toplami</th>
                                        <th className="text-left p-4 font-medium">Komisyon</th>
                                        <th className="text-left p-4 font-medium">Tarih</th>
                                        <th className="text-left p-4 font-medium">Durum</th>
                                        <th className="text-left p-4 font-medium">Islem</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {referrals.map((referral) => (
                                        <tr key={referral.id} className="border-t hover:bg-muted/30">
                                            <td className="p-4">
                                                {referral.status === 'confirmed' && (
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedReferrals.includes(referral.id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedReferrals([...selectedReferrals, referral.id]);
                                                            } else {
                                                                setSelectedReferrals(selectedReferrals.filter(id => id !== referral.id));
                                                            }
                                                        }}
                                                    />
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <div>
                                                    <p className="font-medium">#{referral.order_id}</p>
                                                    {referral.order?.customer_name && (
                                                        <p className="text-sm text-muted-foreground">{referral.order.customer_name}</p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <code className="bg-muted px-2 py-0.5 rounded text-sm">{referral.coupon_code}</code>
                                            </td>
                                            <td className="p-4">{formatCurrency(referral.order_total, referral.currency)}</td>
                                            <td className="p-4">
                                                <div>
                                                    <p className="font-medium text-green-600">
                                                        {formatCurrency(referral.commission_amount, referral.currency)}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">%{referral.commission_rate}</p>
                                                </div>
                                            </td>
                                            <td className="p-4">{formatDate(referral.created_at)}</td>
                                            <td className="p-4">{getStatusBadge(referral.status, referralStatusConfig)}</td>
                                            <td className="p-4">
                                                {referral.status === 'pending' && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleConfirmReferral(referral.id)}
                                                        disabled={confirmingReferral === referral.id}
                                                    >
                                                        {confirmingReferral === referral.id ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <>
                                                                <Check className="mr-1 h-4 w-4" />
                                                                Onayla
                                                            </>
                                                        )}
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default AffiliateDetail;
