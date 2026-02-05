import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
    FileText,
    Plus,
    Loader2,
    RefreshCw,
    Send,
    Eye,
    CheckCircle,
    XCircle,
    DollarSign,
    Clock,
    ExternalLink
} from "lucide-react";

interface Invoice {
    id: number;
    affiliate_id: number;
    invoice_number: string;
    amount: number;
    tax_amount: number;
    total_amount: number;
    currency: string;
    bizimhesap_id: string | null;
    bizimhesap_url: string | null;
    period_start: string;
    period_end: string;
    status: string;
    sent_at: string | null;
    paid_at: string | null;
    created_at: string;
    affiliate: {
        id: number;
        name: string;
        email: string;
    };
}

interface Stats {
    pending_invoice_amount: number;
    pending_invoice_count: number;
    total_invoices: number;
    draft_invoices: number;
    sent_invoices: number;
    paid_invoices: number;
    total_invoiced_amount: number;
    pending_by_affiliate: any[];
}

interface PendingReferral {
    id: number;
    order_id: string;
    commission_amount: number;
    created_at: string;
}

const statusConfig: { [key: string]: { label: string; color: string; bgColor: string } } = {
    'draft': { label: 'Taslak', color: 'text-gray-600', bgColor: 'bg-gray-500/20' },
    'sent': { label: 'Gonderildi', color: 'text-blue-600', bgColor: 'bg-blue-500/20' },
    'paid': { label: 'Odendi', color: 'text-green-600', bgColor: 'bg-green-500/20' },
    'cancelled': { label: 'Iptal', color: 'text-red-600', bgColor: 'bg-red-500/20' },
};

const Invoices = () => {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>("all");

    // Create invoice dialog
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [selectedAffiliate, setSelectedAffiliate] = useState<any>(null);
    const [affiliateReferrals, setAffiliateReferrals] = useState<PendingReferral[]>([]);
    const [selectedReferrals, setSelectedReferrals] = useState<number[]>([]);
    const [creating, setCreating] = useState(false);

    // Actions
    const [sendingId, setSendingId] = useState<number | null>(null);

    const fetchInvoices = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (statusFilter !== 'all') params.append('status', statusFilter);

            const response = await fetch(`/api/affiliate-invoices?${params}`);
            if (response.ok) {
                const data = await response.json();
                setInvoices(data.data);
            }
        } catch (error) {
            console.error('Faturalar yuklenirken hata:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await fetch('/api/affiliate-invoices/stats');
            if (response.ok) {
                const data = await response.json();
                setStats(data.data);
            }
        } catch (error) {
            console.error('Istatistikler yuklenirken hata:', error);
        }
    };

    useEffect(() => {
        fetchInvoices();
        fetchStats();
    }, [statusFilter]);

    const handleSelectAffiliate = async (affiliate: any) => {
        setSelectedAffiliate(affiliate);
        setSelectedReferrals([]);

        // Fetch confirmed referrals for this affiliate
        try {
            const response = await fetch(`/api/affiliates/${affiliate.affiliate_id}/referrals?status=confirmed`);
            if (response.ok) {
                const data = await response.json();
                // Filter only confirmed ones without invoice
                const pending = data.data.filter((r: any) => r.status === 'confirmed');
                setAffiliateReferrals(pending);
            }
        } catch (error) {
            console.error('Referrallar yuklenirken hata:', error);
        }
    };

    const handleCreateInvoice = async () => {
        if (!selectedAffiliate || selectedReferrals.length === 0) {
            alert('Lutfen referral secin');
            return;
        }

        setCreating(true);
        try {
            const response = await fetch('/api/affiliate-invoices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    affiliate_id: selectedAffiliate.affiliate_id,
                    referral_ids: selectedReferrals,
                }),
            });

            if (response.ok) {
                alert('Fatura taslagi olusturuldu!');
                setShowCreateDialog(false);
                setSelectedAffiliate(null);
                setSelectedReferrals([]);
                fetchInvoices();
                fetchStats();
            } else {
                const error = await response.json();
                alert(error.message || 'Fatura olusturulamadi');
            }
        } catch (error) {
            console.error('Fatura olusturma hatasi:', error);
            alert('Fatura olusturulamadi');
        } finally {
            setCreating(false);
        }
    };

    const handleSendToBizimHesap = async (invoiceId: number) => {
        setSendingId(invoiceId);
        try {
            const response = await fetch(`/api/affiliate-invoices/${invoiceId}/send-to-bizimhesap`, {
                method: 'POST',
            });

            if (response.ok) {
                alert('Fatura BizimHesap\'a gonderildi!');
                fetchInvoices();
                fetchStats();
            } else {
                const error = await response.json();
                alert(error.message || 'Gonderme hatasi');
            }
        } catch (error) {
            console.error('Gonderme hatasi:', error);
            alert('Gonderme hatasi');
        } finally {
            setSendingId(null);
        }
    };

    const handleMarkAsPaid = async (invoiceId: number) => {
        try {
            const response = await fetch(`/api/affiliate-invoices/${invoiceId}/mark-as-paid`, {
                method: 'POST',
            });

            if (response.ok) {
                alert('Fatura odendi olarak isaretlendi!');
                fetchInvoices();
                fetchStats();
            }
        } catch (error) {
            console.error('Islem hatasi:', error);
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
        return new Date(dateString).toLocaleDateString('tr-TR');
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
                                <p className="text-sm text-muted-foreground">Kesilecek Fatura</p>
                                <p className="text-2xl font-bold text-yellow-600">
                                    {formatCurrency(stats.pending_invoice_amount)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {stats.pending_invoice_count} referral
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 rounded-full bg-gray-500/10">
                                <FileText className="h-6 w-6 text-gray-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Taslak</p>
                                <p className="text-2xl font-bold">{stats.draft_invoices}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 rounded-full bg-blue-500/10">
                                <Send className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Gonderildi</p>
                                <p className="text-2xl font-bold">{stats.sent_invoices}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 rounded-full bg-green-500/10">
                                <CheckCircle className="h-6 w-6 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Odendi</p>
                                <p className="text-2xl font-bold">{stats.paid_invoices}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                <h2 className="text-3xl font-bold tracking-tight">Faturalar</h2>
                <div className="flex flex-wrap gap-2">
                    <Button onClick={() => setShowCreateDialog(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Fatura Olustur
                    </Button>
                    <Button variant="outline" onClick={() => { fetchInvoices(); fetchStats(); }}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Yenile
                    </Button>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Durum" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tumu</SelectItem>
                            <SelectItem value="draft">Taslak</SelectItem>
                            <SelectItem value="sent">Gonderildi</SelectItem>
                            <SelectItem value="paid">Odendi</SelectItem>
                            <SelectItem value="cancelled">Iptal</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Pending by Affiliate */}
            {stats && stats.pending_by_affiliate.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Kesilecek Faturalar (Affiliate Bazli)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {stats.pending_by_affiliate.map((item: any) => (
                                <div key={item.affiliate_id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                                    <div>
                                        <p className="font-medium">{item.affiliate?.name || 'Affiliate #' + item.affiliate_id}</p>
                                        <p className="text-sm text-muted-foreground">{item.referral_count} referral</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-yellow-600">{formatCurrency(item.total_amount)}</p>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                                handleSelectAffiliate(item);
                                                setShowCreateDialog(true);
                                            }}
                                        >
                                            Fatura Kes
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Invoices Table */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : invoices.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <FileText className="h-12 w-12 mb-4" />
                    <p className="text-lg">Henuz fatura bulunmuyor</p>
                </div>
            ) : (
                <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className="text-left p-4 font-medium">Fatura No</th>
                                <th className="text-left p-4 font-medium">Affiliate</th>
                                <th className="text-left p-4 font-medium">Tutar</th>
                                <th className="text-left p-4 font-medium">Donem</th>
                                <th className="text-left p-4 font-medium">Durum</th>
                                <th className="text-left p-4 font-medium">BizimHesap</th>
                                <th className="text-left p-4 font-medium">Islemler</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoices.map((invoice) => (
                                <tr key={invoice.id} className="border-t hover:bg-muted/30">
                                    <td className="p-4">
                                        <code className="bg-muted px-2 py-1 rounded">{invoice.invoice_number}</code>
                                    </td>
                                    <td className="p-4">
                                        <Link to={`/affiliates/${invoice.affiliate_id}`} className="hover:text-primary">
                                            {invoice.affiliate?.name}
                                        </Link>
                                    </td>
                                    <td className="p-4">
                                        <div>
                                            <p className="font-medium">{formatCurrency(invoice.total_amount)}</p>
                                            <p className="text-xs text-muted-foreground">
                                                +{formatCurrency(invoice.tax_amount)} KDV
                                            </p>
                                        </div>
                                    </td>
                                    <td className="p-4 text-sm">
                                        {formatDate(invoice.period_start)} - {formatDate(invoice.period_end)}
                                    </td>
                                    <td className="p-4">{getStatusBadge(invoice.status)}</td>
                                    <td className="p-4">
                                        {invoice.bizimhesap_url ? (
                                            <a
                                                href={invoice.bizimhesap_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:underline flex items-center gap-1"
                                            >
                                                <ExternalLink className="h-3 w-3" />
                                                Goruntule
                                            </a>
                                        ) : (
                                            <span className="text-muted-foreground">-</span>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex gap-1">
                                            {invoice.status === 'draft' && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleSendToBizimHesap(invoice.id)}
                                                    disabled={sendingId === invoice.id}
                                                >
                                                    {sendingId === invoice.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <>
                                                            <Send className="h-4 w-4 mr-1" />
                                                            Gonder
                                                        </>
                                                    )}
                                                </Button>
                                            )}
                                            {invoice.status === 'sent' && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleMarkAsPaid(invoice.id)}
                                                >
                                                    <CheckCircle className="h-4 w-4 mr-1" />
                                                    Odendi
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

            {/* Create Invoice Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Fatura Olustur</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        {selectedAffiliate ? (
                            <>
                                <div className="p-3 bg-muted rounded-lg">
                                    <p className="font-medium">{selectedAffiliate.affiliate?.name || selectedAffiliate.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {affiliateReferrals.length} onaylı referral
                                    </p>
                                </div>

                                {affiliateReferrals.length > 0 ? (
                                    <div className="space-y-2 max-h-64 overflow-y-auto">
                                        <div className="flex items-center gap-2 mb-2">
                                            <input
                                                type="checkbox"
                                                checked={selectedReferrals.length === affiliateReferrals.length}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedReferrals(affiliateReferrals.map(r => r.id));
                                                    } else {
                                                        setSelectedReferrals([]);
                                                    }
                                                }}
                                            />
                                            <span className="text-sm font-medium">Tumunu Sec</span>
                                        </div>
                                        {affiliateReferrals.map((referral) => (
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
                                                    <p className="text-xs text-muted-foreground">
                                                        {formatDate(referral.created_at)}
                                                    </p>
                                                </div>
                                                <p className="font-medium text-green-600">
                                                    {formatCurrency(referral.commission_amount)}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-center text-muted-foreground py-4">
                                        Onaylanmis referral bulunamadi
                                    </p>
                                )}

                                {selectedReferrals.length > 0 && (
                                    <div className="p-3 bg-green-500/10 rounded-lg">
                                        <p className="text-sm text-muted-foreground">Toplam Fatura Tutari</p>
                                        <p className="text-2xl font-bold text-green-600">
                                            {formatCurrency(
                                                affiliateReferrals
                                                    .filter(r => selectedReferrals.includes(r.id))
                                                    .reduce((sum, r) => sum + r.commission_amount, 0)
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
                                            setAffiliateReferrals([]);
                                            setSelectedReferrals([]);
                                        }}
                                    >
                                        Geri
                                    </Button>
                                    <Button
                                        className="flex-1"
                                        onClick={handleCreateInvoice}
                                        disabled={creating || selectedReferrals.length === 0}
                                    >
                                        {creating ? (
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        ) : null}
                                        Fatura Olustur
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <div className="space-y-2">
                                <p className="text-sm text-muted-foreground mb-4">
                                    Fatura kesilecek affiliate'i secin:
                                </p>
                                {stats?.pending_by_affiliate.map((item: any) => (
                                    <Button
                                        key={item.affiliate_id}
                                        variant="outline"
                                        className="w-full justify-between"
                                        onClick={() => handleSelectAffiliate(item)}
                                    >
                                        <span>{item.affiliate?.name || 'Affiliate #' + item.affiliate_id}</span>
                                        <span className="text-green-600">{formatCurrency(item.total_amount)}</span>
                                    </Button>
                                ))}
                                {(!stats?.pending_by_affiliate || stats.pending_by_affiliate.length === 0) && (
                                    <p className="text-center text-muted-foreground py-4">
                                        Fatura kesilecek affiliate bulunamadi
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Invoices;
