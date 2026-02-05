import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    CreditCard,
    Plus,
    Loader2,
    RefreshCw,
    CheckCircle,
    Clock,
    DollarSign,
    Banknote,
    Play,
    User
} from "lucide-react";

interface Payment {
    id: number;
    affiliate_id: number;
    invoice_id: number | null;
    payment_number: string;
    amount: number;
    currency: string;
    payment_method: string;
    status: string;
    provider_transaction_id: string | null;
    processed_at: string | null;
    completed_at: string | null;
    created_at: string;
    affiliate: {
        id: number;
        name: string;
        email: string;
    };
}

interface Stats {
    pending_payment_amount: number;
    pending_payment_count: number;
    total_payments: number;
    pending_payments: number;
    processing_payments: number;
    completed_payments: number;
    total_paid_amount: number;
    this_month_paid: number;
    pending_by_affiliate: any[];
}

interface AffiliateInfo {
    affiliate: any;
    pending_amount: number;
    pending_count: number;
    referrals: any[];
}

const statusConfig: { [key: string]: { label: string; color: string; bgColor: string } } = {
    'pending': { label: 'Beklemede', color: 'text-yellow-600', bgColor: 'bg-yellow-500/20' },
    'processing': { label: 'Isleniyor', color: 'text-blue-600', bgColor: 'bg-blue-500/20' },
    'completed': { label: 'Tamamlandi', color: 'text-green-600', bgColor: 'bg-green-500/20' },
    'failed': { label: 'Basarisiz', color: 'text-red-600', bgColor: 'bg-red-500/20' },
    'cancelled': { label: 'Iptal', color: 'text-gray-600', bgColor: 'bg-gray-500/20' },
};

const paymentMethodLabels: { [key: string]: string } = {
    'bank_transfer': 'Banka Transferi',
    'paytr': 'PayTR',
    'paypal': 'PayPal',
    'manual': 'Manuel',
};

const Payments = () => {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>("all");

    // Create payment dialog
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [selectedAffiliate, setSelectedAffiliate] = useState<AffiliateInfo | null>(null);
    const [selectedReferrals, setSelectedReferrals] = useState<number[]>([]);
    const [paymentMethod, setPaymentMethod] = useState<string>('bank_transfer');
    const [creating, setCreating] = useState(false);
    const [loadingAffiliate, setLoadingAffiliate] = useState(false);

    // Complete payment dialog
    const [showCompleteDialog, setShowCompleteDialog] = useState(false);
    const [completingPayment, setCompletingPayment] = useState<Payment | null>(null);
    const [transactionId, setTransactionId] = useState('');
    const [completing, setCompleting] = useState(false);

    const fetchPayments = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (statusFilter !== 'all') params.append('status', statusFilter);

            const response = await fetch(`/api/affiliate-payments?${params}`);
            if (response.ok) {
                const data = await response.json();
                setPayments(data.data);
            }
        } catch (error) {
            console.error('Odemeler yuklenirken hata:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await fetch('/api/affiliate-payments/stats');
            if (response.ok) {
                const data = await response.json();
                setStats(data.data);
            }
        } catch (error) {
            console.error('Istatistikler yuklenirken hata:', error);
        }
    };

    useEffect(() => {
        fetchPayments();
        fetchStats();
    }, [statusFilter]);

    const handleSelectAffiliate = async (affiliateId: number) => {
        setLoadingAffiliate(true);
        try {
            const response = await fetch(`/api/affiliate-payments/affiliate/${affiliateId}/info`);
            if (response.ok) {
                const data = await response.json();
                setSelectedAffiliate(data.data);
                setSelectedReferrals(data.data.referrals.map((r: any) => r.id));
                setPaymentMethod(data.data.affiliate.payment_method || 'bank_transfer');
            }
        } catch (error) {
            console.error('Affiliate bilgisi yuklenirken hata:', error);
        } finally {
            setLoadingAffiliate(false);
        }
    };

    const handleCreatePayment = async () => {
        if (!selectedAffiliate || selectedReferrals.length === 0) {
            alert('Lutfen referral secin');
            return;
        }

        setCreating(true);
        try {
            const response = await fetch('/api/affiliate-payments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    affiliate_id: selectedAffiliate.affiliate.id,
                    referral_ids: selectedReferrals,
                    payment_method: paymentMethod,
                }),
            });

            if (response.ok) {
                alert('Odeme kaydi olusturuldu!');
                setShowCreateDialog(false);
                setSelectedAffiliate(null);
                setSelectedReferrals([]);
                fetchPayments();
                fetchStats();
            } else {
                const error = await response.json();
                alert(error.message || 'Odeme olusturulamadi');
            }
        } catch (error) {
            console.error('Odeme olusturma hatasi:', error);
            alert('Odeme olusturulamadi');
        } finally {
            setCreating(false);
        }
    };

    const handleProcessPayment = async (paymentId: number) => {
        try {
            const response = await fetch(`/api/affiliate-payments/${paymentId}/process`, {
                method: 'POST',
            });

            if (response.ok) {
                alert('Odeme isleme alindi!');
                fetchPayments();
                fetchStats();
            }
        } catch (error) {
            console.error('Islem hatasi:', error);
        }
    };

    const handleCompletePayment = async () => {
        if (!completingPayment) return;

        setCompleting(true);
        try {
            const response = await fetch(`/api/affiliate-payments/${completingPayment.id}/complete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider_transaction_id: transactionId || null,
                }),
            });

            if (response.ok) {
                alert('Odeme tamamlandi!');
                setShowCompleteDialog(false);
                setCompletingPayment(null);
                setTransactionId('');
                fetchPayments();
                fetchStats();
            } else {
                const error = await response.json();
                alert(error.message || 'Islem hatasi');
            }
        } catch (error) {
            console.error('Tamamlama hatasi:', error);
            alert('Islem hatasi');
        } finally {
            setCompleting(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY',
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

    const getStatusBadge = (status: string) => {
        const config = statusConfig[status] || { label: status, color: 'text-gray-600', bgColor: 'bg-gray-500/20' };
        return (
            <Badge variant="secondary" className={`${config.bgColor} ${config.color}`}>
                {config.label}
            </Badge>
        );
    };

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="border-yellow-500/50 bg-yellow-500/5">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 rounded-full bg-yellow-500/10">
                                <Clock className="h-6 w-6 text-yellow-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Odenmesi Gereken</p>
                                <p className="text-2xl font-bold text-yellow-600">
                                    {formatCurrency(stats.pending_payment_amount)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {stats.pending_payment_count} referral
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 rounded-full bg-blue-500/10">
                                <Banknote className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Isleniyor</p>
                                <p className="text-2xl font-bold">{stats.processing_payments}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 rounded-full bg-green-500/10">
                                <CheckCircle className="h-6 w-6 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Tamamlandi</p>
                                <p className="text-2xl font-bold">{stats.completed_payments}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 rounded-full bg-purple-500/10">
                                <DollarSign className="h-6 w-6 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Bu Ay Odenen</p>
                                <p className="text-2xl font-bold">{formatCurrency(stats.this_month_paid)}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                <h2 className="text-3xl font-bold tracking-tight">Odemeler</h2>
                <div className="flex flex-wrap gap-2">
                    <Button onClick={() => setShowCreateDialog(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Odeme Olustur
                    </Button>
                    <Button variant="outline" onClick={() => { fetchPayments(); fetchStats(); }}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Yenile
                    </Button>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Durum" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tumu</SelectItem>
                            <SelectItem value="pending">Beklemede</SelectItem>
                            <SelectItem value="processing">Isleniyor</SelectItem>
                            <SelectItem value="completed">Tamamlandi</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Pending by Affiliate */}
            {stats && stats.pending_by_affiliate.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Odeme Bekleyenler (Affiliate Bazli)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {stats.pending_by_affiliate.map((affiliate: any) => (
                                <div key={affiliate.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <User className="h-5 w-5 text-muted-foreground" />
                                        <div>
                                            <p className="font-medium">{affiliate.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {affiliate.pending_count} referral - {paymentMethodLabels[affiliate.payment_method] || affiliate.payment_method}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-yellow-600">{formatCurrency(affiliate.pending_amount || 0)}</p>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                                handleSelectAffiliate(affiliate.id);
                                                setShowCreateDialog(true);
                                            }}
                                        >
                                            Ode
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Payments Table */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : payments.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <CreditCard className="h-12 w-12 mb-4" />
                    <p className="text-lg">Henuz odeme bulunmuyor</p>
                </div>
            ) : (
                <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className="text-left p-4 font-medium">Odeme No</th>
                                <th className="text-left p-4 font-medium">Affiliate</th>
                                <th className="text-left p-4 font-medium">Tutar</th>
                                <th className="text-left p-4 font-medium">Yontem</th>
                                <th className="text-left p-4 font-medium">Durum</th>
                                <th className="text-left p-4 font-medium">Tarih</th>
                                <th className="text-left p-4 font-medium">Islemler</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payments.map((payment) => (
                                <tr key={payment.id} className="border-t hover:bg-muted/30">
                                    <td className="p-4">
                                        <code className="bg-muted px-2 py-1 rounded">{payment.payment_number}</code>
                                    </td>
                                    <td className="p-4">
                                        <Link to={`/affiliates/${payment.affiliate_id}`} className="hover:text-primary">
                                            {payment.affiliate?.name}
                                        </Link>
                                    </td>
                                    <td className="p-4 font-medium">{formatCurrency(payment.amount)}</td>
                                    <td className="p-4 text-sm">
                                        {paymentMethodLabels[payment.payment_method] || payment.payment_method}
                                    </td>
                                    <td className="p-4">{getStatusBadge(payment.status)}</td>
                                    <td className="p-4 text-sm">
                                        {payment.completed_at
                                            ? formatDate(payment.completed_at)
                                            : formatDate(payment.created_at)}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex gap-1">
                                            {payment.status === 'pending' && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleProcessPayment(payment.id)}
                                                >
                                                    <Play className="h-4 w-4 mr-1" />
                                                    Basla
                                                </Button>
                                            )}
                                            {(payment.status === 'pending' || payment.status === 'processing') && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        setCompletingPayment(payment);
                                                        setShowCompleteDialog(true);
                                                    }}
                                                >
                                                    <CheckCircle className="h-4 w-4 mr-1" />
                                                    Tamamla
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create Payment Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Odeme Olustur</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        {loadingAffiliate ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : selectedAffiliate ? (
                            <>
                                <div className="p-3 bg-muted rounded-lg">
                                    <p className="font-medium">{selectedAffiliate.affiliate.name}</p>
                                    <p className="text-sm text-muted-foreground">{selectedAffiliate.affiliate.email}</p>
                                </div>

                                <div className="space-y-2">
                                    <Label>Odeme Yontemi</Label>
                                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="bank_transfer">Banka Transferi</SelectItem>
                                            <SelectItem value="paytr">PayTR</SelectItem>
                                            <SelectItem value="paypal">PayPal</SelectItem>
                                            <SelectItem value="manual">Manuel</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {selectedAffiliate.referrals.length > 0 ? (
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                        <Label>Odenecek Referrallar</Label>
                                        {selectedAffiliate.referrals.map((referral: any) => (
                                            <div key={referral.id} className="flex items-center gap-3 p-2 border rounded">
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
                                                <div className="flex-1">
                                                    <p className="text-sm">Siparis #{referral.order_id}</p>
                                                </div>
                                                <p className="font-medium text-green-600">
                                                    {formatCurrency(referral.commission_amount)}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-center text-muted-foreground py-4">
                                        Odenecek referral bulunamadi
                                    </p>
                                )}

                                {selectedReferrals.length > 0 && (
                                    <div className="p-3 bg-green-500/10 rounded-lg">
                                        <p className="text-sm text-muted-foreground">Toplam Odeme</p>
                                        <p className="text-2xl font-bold text-green-600">
                                            {formatCurrency(
                                                selectedAffiliate.referrals
                                                    .filter((r: any) => selectedReferrals.includes(r.id))
                                                    .reduce((sum: number, r: any) => sum + parseFloat(r.commission_amount), 0)
                                            )}
                                        </p>
                                    </div>
                                )}

                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        className="flex-1"
                                        onClick={() => {
                                            setSelectedAffiliate(null);
                                            setSelectedReferrals([]);
                                        }}
                                    >
                                        Geri
                                    </Button>
                                    <Button
                                        className="flex-1"
                                        onClick={handleCreatePayment}
                                        disabled={creating || selectedReferrals.length === 0}
                                    >
                                        {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                        Odeme Olustur
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <div className="space-y-2">
                                <p className="text-sm text-muted-foreground mb-4">
                                    Odeme yapilacak affiliate'i secin:
                                </p>
                                {stats?.pending_by_affiliate.map((affiliate: any) => (
                                    <Button
                                        key={affiliate.id}
                                        variant="outline"
                                        className="w-full justify-between"
                                        onClick={() => handleSelectAffiliate(affiliate.id)}
                                    >
                                        <span>{affiliate.name}</span>
                                        <span className="text-green-600">{formatCurrency(affiliate.pending_amount || 0)}</span>
                                    </Button>
                                ))}
                                {(!stats?.pending_by_affiliate || stats.pending_by_affiliate.length === 0) && (
                                    <p className="text-center text-muted-foreground py-4">
                                        Odeme bekleyen affiliate bulunamadi
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Complete Payment Dialog */}
            <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Odemeyi Tamamla</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        {completingPayment && (
                            <>
                                <div className="p-3 bg-muted rounded-lg">
                                    <p className="font-medium">{completingPayment.affiliate?.name}</p>
                                    <p className="text-2xl font-bold text-green-600">
                                        {formatCurrency(completingPayment.amount)}
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label>Islem/Referans No (opsiyonel)</Label>
                                    <Input
                                        value={transactionId}
                                        onChange={(e) => setTransactionId(e.target.value)}
                                        placeholder="Banka dekont no, PayTR islem no vb."
                                    />
                                </div>

                                <Button
                                    className="w-full"
                                    onClick={handleCompletePayment}
                                    disabled={completing}
                                >
                                    {completing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                    Odemeyi Tamamla
                                </Button>
                            </>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Payments;
