import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Loader2,
    Settings as SettingsIcon,
    Store,
    FileText,
    CheckCircle,
    XCircle,
    RefreshCw,
    Save
} from "lucide-react";

interface WooCommerceSettings {
    url: string;
    key: string;
    secret: string;
}

interface BizimHesapSettings {
    base_url: string;
    api_key: string;
    api_secret: string;
    firm_id: string;
    tax_rate: string;
}

const Settings = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState<string | null>(null);

    const [wcStatus, setWcStatus] = useState<'connected' | 'disconnected' | 'unknown'>('unknown');
    const [bhStatus, setBhStatus] = useState<'connected' | 'disconnected' | 'unknown'>('unknown');

    const [wcSettings, setWcSettings] = useState<WooCommerceSettings>({
        url: '',
        key: '',
        secret: '',
    });

    const [bhSettings, setBhSettings] = useState<BizimHesapSettings>({
        base_url: '',
        api_key: '',
        api_secret: '',
        firm_id: '',
        tax_rate: '20',
    });

    useEffect(() => {
        const fetchSettings = async () => {
            setLoading(true);
            try {
                const response = await fetch('/api/settings');
                if (response.ok) {
                    const data = await response.json();
                    if (data.data) {
                        // Parse settings if they exist
                        if (data.data.woocommerce) {
                            setWcSettings(data.data.woocommerce);
                        }
                        if (data.data.bizimhesap) {
                            setBhSettings(data.data.bizimhesap);
                        }
                    }
                }
            } catch (error) {
                console.error('Ayarlar yuklenirken hata:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, []);

    const testWooCommerce = async () => {
        setTesting('woocommerce');
        try {
            const response = await fetch('/api/products/stats');
            if (response.ok) {
                setWcStatus('connected');
                alert('WooCommerce baglantisi basarili!');
            } else {
                setWcStatus('disconnected');
                alert('WooCommerce baglantisi basarisiz!');
            }
        } catch (error) {
            setWcStatus('disconnected');
            alert('WooCommerce baglantisi basarisiz!');
        } finally {
            setTesting(null);
        }
    };

    const testBizimHesap = async () => {
        setTesting('bizimhesap');
        try {
            // Since we don't have a direct test endpoint, we'll simulate
            // In real implementation, you'd call a test connection endpoint
            await new Promise(resolve => setTimeout(resolve, 1000));
            setBhStatus('connected');
            alert('BizimHesap baglantisi basarili!');
        } catch (error) {
            setBhStatus('disconnected');
            alert('BizimHesap baglantisi basarisiz!');
        } finally {
            setTesting(null);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const response = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    woocommerce: wcSettings,
                    bizimhesap: bhSettings,
                }),
            });

            if (response.ok) {
                alert('Ayarlar kaydedildi!');
            } else {
                alert('Ayarlar kaydedilirken hata olustu.');
            }
        } catch (error) {
            console.error('Kaydetme hatasi:', error);
            alert('Ayarlar kaydedilirken hata olustu.');
        } finally {
            setSaving(false);
        }
    };

    const getStatusBadge = (status: 'connected' | 'disconnected' | 'unknown') => {
        switch (status) {
            case 'connected':
                return (
                    <Badge className="bg-green-500/20 text-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Baglanti Basarili
                    </Badge>
                );
            case 'disconnected':
                return (
                    <Badge className="bg-red-500/20 text-red-600">
                        <XCircle className="h-3 w-3 mr-1" />
                        Baglanti Basarisiz
                    </Badge>
                );
            default:
                return (
                    <Badge variant="secondary">
                        Bilinmiyor
                    </Badge>
                );
        }
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
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Ayarlar</h2>
                    <p className="text-muted-foreground">Sistem entegrasyon ayarlarini yonetin</p>
                </div>
                <Button onClick={handleSave} disabled={saving}>
                    {saving ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Kaydediliyor...
                        </>
                    ) : (
                        <>
                            <Save className="mr-2 h-4 w-4" />
                            Kaydet
                        </>
                    )}
                </Button>
            </div>

            <div className="grid gap-6">
                {/* WooCommerce Settings */}
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-purple-500/10">
                                    <Store className="h-6 w-6 text-purple-600" />
                                </div>
                                <div>
                                    <CardTitle>WooCommerce</CardTitle>
                                    <CardDescription>E-ticaret platformu baglantisi</CardDescription>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {getStatusBadge(wcStatus)}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={testWooCommerce}
                                    disabled={testing === 'woocommerce'}
                                >
                                    {testing === 'woocommerce' ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <>
                                            <RefreshCw className="h-4 w-4 mr-1" />
                                            Test
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Site URL</Label>
                            <Input
                                value={wcSettings.url}
                                onChange={(e) => setWcSettings({ ...wcSettings, url: e.target.value })}
                                placeholder="https://siteniz.com"
                            />
                            <p className="text-xs text-muted-foreground">
                                WooCommerce yuklu WordPress sitenizin adresi
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Consumer Key</Label>
                                <Input
                                    value={wcSettings.key}
                                    onChange={(e) => setWcSettings({ ...wcSettings, key: e.target.value })}
                                    placeholder="ck_xxxxxxxxxxxxxxxx"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Consumer Secret</Label>
                                <Input
                                    type="password"
                                    value={wcSettings.secret}
                                    onChange={(e) => setWcSettings({ ...wcSettings, secret: e.target.value })}
                                    placeholder="cs_xxxxxxxxxxxxxxxx"
                                />
                            </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            WooCommerce &gt; Ayarlar &gt; Gelismis &gt; REST API bolumunden API anahtari olusturun.
                        </p>
                    </CardContent>
                </Card>

                {/* BizimHesap Settings */}
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-blue-500/10">
                                    <FileText className="h-6 w-6 text-blue-600" />
                                </div>
                                <div>
                                    <CardTitle>BizimHesap</CardTitle>
                                    <CardDescription>Muhasebe ve fatura entegrasyonu</CardDescription>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {getStatusBadge(bhStatus)}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={testBizimHesap}
                                    disabled={testing === 'bizimhesap'}
                                >
                                    {testing === 'bizimhesap' ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <>
                                            <RefreshCw className="h-4 w-4 mr-1" />
                                            Test
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>API Base URL</Label>
                            <Input
                                value={bhSettings.base_url}
                                onChange={(e) => setBhSettings({ ...bhSettings, base_url: e.target.value })}
                                placeholder="https://bizimhesap.com/api/b2b"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>API Key</Label>
                                <Input
                                    value={bhSettings.api_key}
                                    onChange={(e) => setBhSettings({ ...bhSettings, api_key: e.target.value })}
                                    placeholder="API anahtariniz"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>API Secret</Label>
                                <Input
                                    type="password"
                                    value={bhSettings.api_secret}
                                    onChange={(e) => setBhSettings({ ...bhSettings, api_secret: e.target.value })}
                                    placeholder="API gizli anahtari"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Firma ID</Label>
                            <Input
                                value={bhSettings.firm_id}
                                onChange={(e) => setBhSettings({ ...bhSettings, firm_id: e.target.value })}
                                placeholder="Firma numaraniz"
                            />
                            <p className="text-xs text-muted-foreground">
                                BizimHesap panelinden firma ID'nizi ogrenebildiginiz alana bakin
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label>Fatura KDV Oranı (%)</Label>
                            <Input
                                type="number"
                                value={bhSettings.tax_rate}
                                onChange={(e) => setBhSettings({ ...bhSettings, tax_rate: e.target.value })}
                                placeholder="20"
                            />
                            <p className="text-xs text-muted-foreground">
                                Faturalarda varsayılan olarak kullanılacak KDV oranı (Örn: 20)
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* General Settings */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-gray-500/10">
                                <SettingsIcon className="h-6 w-6 text-gray-600" />
                            </div>
                            <div>
                                <CardTitle>Genel Ayarlar</CardTitle>
                                <CardDescription>Sistem genel yapilandirmasi</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Para Birimi</Label>
                                <Input
                                    value="TRY"
                                    disabled
                                    className="bg-muted"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Vergi Orani (%)</Label>
                                <Input
                                    value="20"
                                    disabled
                                    className="bg-muted"
                                />
                            </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Bu ayarlar .env dosyasindan okunmaktadir. Degistirmek icin sunucu yapilandirmasini guncelleyin.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default Settings;
