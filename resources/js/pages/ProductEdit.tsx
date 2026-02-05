import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, Package, DollarSign, Info, Layers, Trash2, Plus, RefreshCw } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface ProductData {
    id: number;
    commerce_id: string;
    sku: string;
    name: string;
    slug: string;
    permalink: string;
    type: string;
    status: string;
    featured: boolean;
    description: string;
    short_description: string;
    price: number;
    regular_price: number;
    sale_price: number | null;
    on_sale: boolean;
    manage_stock: boolean;
    stock: number;
    stock_status: string;
    catalog_visibility: string;
    weight: string | null;
    categories: { id: number; name: string }[];
    brands: { id: number; name: string }[];
    images: { id: number; src: string; is_featured: boolean }[];
    variations: {
        id: number;
        wc_id: number;
        sku: string;
        price: number;
        regular_price: number;
        sale_price: number | null;
        stock_quantity: number;
        stock_status: string;
        attributes: { name: string; option: string }[];
    }[];
}

interface WCAttribute {
    id: number;
    name: string;
    slug: string;
}

interface WCAttributeTerm {
    id: number;
    name: string;
    slug: string;
}

const ProductEditPage = () => {
    const { id } = useParams<{ id: string }>();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [converting, setConverting] = useState(false);
    const [product, setProduct] = useState<ProductData | null>(null);
    const [activeTab, setActiveTab] = useState('general');

    // Attributes state
    const [attributes, setAttributes] = useState<WCAttribute[]>([]);
    const [attributeTerms, setAttributeTerms] = useState<{ [key: number]: WCAttributeTerm[] }>({});
    const [loadingTerms, setLoadingTerms] = useState<number | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        sku: '',
        description: '',
        short_description: '',
        regular_price: '',
        sale_price: '',
        stock: '',
        stock_status: 'instock',
        manage_stock: false,
        status: 'publish',
        featured: false,
        catalog_visibility: 'visible',
        weight: '',
    });

    // Variation being edited
    const [editingVariation, setEditingVariation] = useState<number | null>(null);
    const [variationForm, setVariationForm] = useState({
        regular_price: '',
        sale_price: '',
        stock_quantity: '',
        stock_status: 'instock',
        sku: '',
    });

    // New variation form
    const [showNewVariationForm, setShowNewVariationForm] = useState(false);
    const [newVariation, setNewVariation] = useState({
        sku: '',
        regular_price: '',
        sale_price: '',
        stock_quantity: '0',
        attributes: [] as { id: number; name: string; option: string }[],
    });

    useEffect(() => {
        fetchProduct();
        fetchAttributes();
    }, [id]);

    const fetchProduct = async () => {
        try {
            const response = await fetch(`/api/products/${id}`);
            if (response.ok) {
                const data = await response.json();
                const p = data.data;
                setProduct(p);
                setFormData({
                    name: p.name || '',
                    sku: p.sku || '',
                    description: p.description || '',
                    short_description: p.short_description || '',
                    regular_price: p.regular_price?.toString() || '',
                    sale_price: p.sale_price?.toString() || '',
                    stock: p.stock?.toString() || '0',
                    stock_status: p.stock_status || 'instock',
                    manage_stock: p.manage_stock || false,
                    status: p.status || 'publish',
                    featured: p.featured || false,
                    catalog_visibility: p.catalog_visibility || 'visible',
                    weight: p.weight || '',
                });
            }
        } catch (error) {
            console.error('Ürün yüklenirken hata:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAttributes = async () => {
        try {
            const response = await fetch('/api/products/attributes');
            if (response.ok) {
                const data = await response.json();
                setAttributes(data.data || []);
            }
        } catch (error) {
            console.error('Özellikler yüklenirken hata:', error);
        }
    };

    const fetchAttributeTerms = async (attributeId: number) => {
        if (attributeTerms[attributeId]) return; // Already loaded

        setLoadingTerms(attributeId);
        try {
            const response = await fetch(`/api/products/attributes/${attributeId}/terms`);
            if (response.ok) {
                const data = await response.json();
                setAttributeTerms(prev => ({ ...prev, [attributeId]: data.data || [] }));
            }
        } catch (error) {
            console.error('Özellik terimleri yüklenirken hata:', error);
        } finally {
            setLoadingTerms(null);
        }
    };

    const handleInputChange = (field: string, value: string | boolean) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const response = await fetch(`/api/products/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    name: formData.name,
                    sku: formData.sku,
                    description: formData.description,
                    short_description: formData.short_description,
                    regular_price: parseFloat(formData.regular_price) || 0,
                    sale_price: formData.sale_price ? parseFloat(formData.sale_price) : null,
                    stock: parseInt(formData.stock) || 0,
                    stock_status: formData.stock_status,
                    manage_stock: formData.manage_stock,
                    status: formData.status,
                    featured: formData.featured,
                    catalog_visibility: formData.catalog_visibility,
                    weight: formData.weight,
                }),
            });

            if (response.ok) {
                alert('Ürün başarıyla güncellendi!');
                fetchProduct();
            } else {
                const error = await response.json();
                alert('Hata: ' + (error.message || 'Güncelleme başarısız'));
            }
        } catch (error) {
            console.error('Kaydetme hatası:', error);
            alert('Bir hata oluştu');
        } finally {
            setSaving(false);
        }
    };

    const handleConvertToVariable = async () => {
        if (!confirm('Bu ürünü değişken ürüne dönüştürmek istiyor musunuz?')) return;

        setConverting(true);
        try {
            const response = await fetch(`/api/products/${id}/convert-to-variable`, {
                method: 'POST',
                headers: { 'Accept': 'application/json' },
            });

            if (response.ok) {
                alert('Ürün değişken türüne dönüştürüldü!');
                fetchProduct();
            } else {
                const error = await response.json();
                alert('Hata: ' + (error.message || 'Dönüştürme başarısız'));
            }
        } catch (error) {
            console.error('Dönüştürme hatası:', error);
        } finally {
            setConverting(false);
        }
    };

    const handleVariationEdit = (variation: any) => {
        setEditingVariation(variation.id);
        setVariationForm({
            regular_price: variation.regular_price?.toString() || '',
            sale_price: variation.sale_price?.toString() || '',
            stock_quantity: variation.stock_quantity?.toString() || '0',
            stock_status: variation.stock_status || 'instock',
            sku: variation.sku || '',
        });
    };

    const handleVariationSave = async (variationId: number) => {
        try {
            const response = await fetch(`/api/products/${id}/variations/${variationId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    regular_price: parseFloat(variationForm.regular_price) || 0,
                    sale_price: variationForm.sale_price ? parseFloat(variationForm.sale_price) : null,
                    stock_quantity: parseInt(variationForm.stock_quantity) || 0,
                    stock_status: variationForm.stock_status,
                    sku: variationForm.sku,
                }),
            });

            if (response.ok) {
                alert('Varyasyon güncellendi!');
                setEditingVariation(null);
                fetchProduct();
            } else {
                const error = await response.json();
                alert('Hata: ' + (error.message || 'Güncelleme başarısız'));
            }
        } catch (error) {
            console.error('Varyasyon kaydetme hatası:', error);
        }
    };

    const handleVariationDelete = async (variationId: number) => {
        if (!confirm('Bu varyasyonu silmek istediğinize emin misiniz?')) return;

        try {
            const response = await fetch(`/api/products/${id}/variations/${variationId}`, {
                method: 'DELETE',
                headers: { 'Accept': 'application/json' },
            });

            if (response.ok) {
                alert('Varyasyon silindi!');
                fetchProduct();
            } else {
                const error = await response.json();
                alert('Hata: ' + (error.message || 'Silme başarısız'));
            }
        } catch (error) {
            console.error('Varyasyon silme hatası:', error);
        }
    };

    const handleAddAttribute = () => {
        if (attributes.length === 0) return;
        const attr = attributes[0];
        setNewVariation(prev => ({
            ...prev,
            attributes: [...prev.attributes, { id: attr.id, name: attr.name, option: '' }],
        }));
        fetchAttributeTerms(attr.id);
    };

    const handleAttributeChange = (index: number, attributeId: number) => {
        const attr = attributes.find(a => a.id === attributeId);
        if (!attr) return;

        setNewVariation(prev => {
            const updated = [...prev.attributes];
            updated[index] = { id: attr.id, name: attr.name, option: '' };
            return { ...prev, attributes: updated };
        });
        fetchAttributeTerms(attributeId);
    };

    const handleAttributeOptionChange = (index: number, option: string) => {
        setNewVariation(prev => {
            const updated = [...prev.attributes];
            updated[index] = { ...updated[index], option };
            return { ...prev, attributes: updated };
        });
    };

    const handleRemoveAttribute = (index: number) => {
        setNewVariation(prev => ({
            ...prev,
            attributes: prev.attributes.filter((_, i) => i !== index),
        }));
    };

    const handleCreateVariation = async () => {
        if (newVariation.attributes.length === 0) {
            alert('En az bir özellik seçmelisiniz');
            return;
        }
        if (newVariation.attributes.some(a => !a.option)) {
            alert('Tüm özelliklerin değerleri seçilmeli');
            return;
        }

        try {
            const response = await fetch(`/api/products/${id}/variations`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    sku: newVariation.sku,
                    regular_price: parseFloat(newVariation.regular_price) || 0,
                    sale_price: newVariation.sale_price ? parseFloat(newVariation.sale_price) : null,
                    stock_quantity: parseInt(newVariation.stock_quantity) || 0,
                    manage_stock: true,
                    attributes: newVariation.attributes.map(a => ({
                        name: a.name,
                        option: a.option,
                    })),
                }),
            });

            if (response.ok) {
                alert('Varyasyon oluşturuldu!');
                setShowNewVariationForm(false);
                setNewVariation({
                    sku: '',
                    regular_price: '',
                    sale_price: '',
                    stock_quantity: '0',
                    attributes: [],
                });
                fetchProduct();
            } else {
                const error = await response.json();
                alert('Hata: ' + (error.message || 'Varyasyon oluşturulamadı'));
            }
        } catch (error) {
            console.error('Varyasyon oluşturma hatası:', error);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!product) {
        return (
            <div className="text-center py-12">
                <h2 className="text-2xl font-bold">Ürün bulunamadı</h2>
                <Link to="/products" className="text-primary hover:underline mt-4 inline-block">
                    Ürünlere Dön
                </Link>
            </div>
        );
    }

    const tabs = [
        { id: 'general', label: 'Genel', icon: Info },
        { id: 'pricing', label: 'Fiyat', icon: DollarSign },
        { id: 'inventory', label: 'Stok', icon: Package },
        { id: 'variations', label: 'Varyasyonlar', icon: Layers },
    ];

    return (
        <div className="space-y-6">
            {/* Başlık */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link to={`/products/${id}`}>
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">Ürün Düzenle</h1>
                        <p className="text-muted-foreground">ID: {product.commerce_id} | SKU: {product.sku}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Badge variant={product.status === 'publish' ? 'default' : 'secondary'}>
                        {product.status === 'publish' ? 'Yayında' : product.status}
                    </Badge>
                    <Badge variant="outline">
                        {product.type === 'simple' ? 'Basit' : 'Varyasyonlu'}
                    </Badge>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Kaydet
                    </Button>
                </div>
            </div>

            {/* Ürün Görseli ve Özet */}
            <div className="flex gap-6">
                {product.images?.[0] && (
                    <img
                        src={product.images[0].src}
                        alt={product.name}
                        className="w-32 h-32 object-cover rounded-lg border"
                    />
                )}
                <div className="flex-1">
                    <h2 className="text-xl font-semibold">{product.name}</h2>
                    <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                        <span>Fiyat: ₺{product.price}</span>
                        <span>Stok: {product.stock}</span>
                        <span>Tür: {product.type === 'simple' ? 'Basit' : 'Varyasyonlu'}</span>
                    </div>
                </div>
            </div>

            {/* Sekmeler */}
            <div className="border-b">
                <nav className="flex gap-4">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${activeTab === tab.id
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            <tab.icon className="h-4 w-4" />
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Sekme İçerikleri */}
            <div className="mt-6">
                {activeTab === 'general' && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Genel Bilgiler</CardTitle>
                            <CardDescription>Ürün adı, açıklama ve durumu</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Ürün Adı</Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('name', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="sku">SKU</Label>
                                    <Input
                                        id="sku"
                                        value={formData.sku}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('sku', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="short_description">Kısa Açıklama</Label>
                                <Textarea
                                    id="short_description"
                                    value={formData.short_description.replace(/<[^>]*>/g, '')}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange('short_description', e.target.value)}
                                    rows={2}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Tam Açıklama</Label>
                                <Textarea
                                    id="description"
                                    value={formData.description.replace(/<[^>]*>/g, '')}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange('description', e.target.value)}
                                    rows={4}
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="status">Durum</Label>
                                    <Select value={formData.status} onValueChange={(v: string) => handleInputChange('status', v)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="publish">Yayında</SelectItem>
                                            <SelectItem value="draft">Taslak</SelectItem>
                                            <SelectItem value="private">Özel</SelectItem>
                                            <SelectItem value="pending">Beklemede</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="visibility">Görünürlük</Label>
                                    <Select value={formData.catalog_visibility} onValueChange={(v: string) => handleInputChange('catalog_visibility', v)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="visible">Görünür</SelectItem>
                                            <SelectItem value="catalog">Sadece Katalog</SelectItem>
                                            <SelectItem value="search">Sadece Arama</SelectItem>
                                            <SelectItem value="hidden">Gizli</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="weight">Ağırlık (kg)</Label>
                                    <Input
                                        id="weight"
                                        value={formData.weight}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('weight', e.target.value)}
                                        placeholder="0.5"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="featured"
                                    checked={formData.featured}
                                    onCheckedChange={(v: boolean) => handleInputChange('featured', v)}
                                />
                                <Label htmlFor="featured">Öne Çıkan Ürün</Label>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {activeTab === 'pricing' && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Fiyatlandırma</CardTitle>
                            <CardDescription>Normal ve indirimli fiyat ayarları</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="regular_price">Normal Fiyat (₺)</Label>
                                    <Input
                                        id="regular_price"
                                        type="number"
                                        step="0.01"
                                        value={formData.regular_price}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('regular_price', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="sale_price">İndirimli Fiyat (₺)</Label>
                                    <Input
                                        id="sale_price"
                                        type="number"
                                        step="0.01"
                                        value={formData.sale_price}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('sale_price', e.target.value)}
                                        placeholder="Boş bırakın = indirim yok"
                                    />
                                </div>
                            </div>
                            {formData.sale_price && parseFloat(formData.sale_price) < parseFloat(formData.regular_price) && (
                                <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                                    <p className="text-green-700 dark:text-green-300">
                                        İndirim aktif: %{Math.round((1 - parseFloat(formData.sale_price) / parseFloat(formData.regular_price)) * 100)} indirim
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {activeTab === 'inventory' && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Stok Yönetimi</CardTitle>
                            <CardDescription>Stok miktarı ve durumu</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="manage_stock"
                                    checked={formData.manage_stock}
                                    onCheckedChange={(v: boolean) => handleInputChange('manage_stock', v)}
                                />
                                <Label htmlFor="manage_stock">Stok Takibi Yap</Label>
                            </div>

                            {formData.manage_stock && (
                                <div className="space-y-2">
                                    <Label htmlFor="stock">Stok Miktarı</Label>
                                    <Input
                                        id="stock"
                                        type="number"
                                        value={formData.stock}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('stock', e.target.value)}
                                    />
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="stock_status">Stok Durumu</Label>
                                <Select value={formData.stock_status} onValueChange={(v: string) => handleInputChange('stock_status', v)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="instock">Stokta</SelectItem>
                                        <SelectItem value="outofstock">Stok Yok</SelectItem>
                                        <SelectItem value="onbackorder">Ön Sipariş</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {activeTab === 'variations' && (
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle>Varyasyonlar ({product.variations?.length ?? 0})</CardTitle>
                                    <CardDescription>Ürün varyasyonlarını yönetin</CardDescription>
                                </div>
                                {product.type === 'variable' && (
                                    <Button onClick={() => setShowNewVariationForm(true)}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Yeni Varyasyon
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            {product.type !== 'variable' ? (
                                <div className="space-y-4">
                                    <p className="text-muted-foreground">Bu basit bir üründür. Varyasyon eklemek için önce değişken ürüne dönüştürün.</p>
                                    <Button onClick={handleConvertToVariable} disabled={converting}>
                                        {converting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                                        Varyasyonlu Ürüne Dönüştür
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Yeni Varyasyon Formu */}
                                    {showNewVariationForm && (
                                        <div className="border border-primary rounded-lg p-4 bg-primary/5">
                                            <div className="flex justify-between items-center mb-4">
                                                <h4 className="font-medium">Yeni Varyasyon Ekle</h4>
                                                <Button size="sm" variant="ghost" onClick={() => setShowNewVariationForm(false)}>
                                                    İptal
                                                </Button>
                                            </div>

                                            {/* Özellikler */}
                                            <div className="space-y-3 mb-4">
                                                <div className="flex justify-between items-center">
                                                    <Label>Özellikler</Label>
                                                    <Button size="sm" variant="outline" onClick={handleAddAttribute}>
                                                        <Plus className="mr-1 h-3 w-3" />
                                                        Özellik Ekle
                                                    </Button>
                                                </div>
                                                {newVariation.attributes.map((attr, index) => (
                                                    <div key={index} className="flex gap-2 items-end">
                                                        <div className="flex-1 space-y-1">
                                                            <Label className="text-xs">Özellik</Label>
                                                            <Select
                                                                value={attr.id.toString()}
                                                                onValueChange={(v: string) => handleAttributeChange(index, parseInt(v))}
                                                            >
                                                                <SelectTrigger>
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {attributes.map(a => (
                                                                        <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div className="flex-1 space-y-1">
                                                            <Label className="text-xs">Değer</Label>
                                                            {loadingTerms === attr.id ? (
                                                                <div className="h-10 flex items-center">
                                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                                </div>
                                                            ) : (
                                                                <Select
                                                                    value={attr.option}
                                                                    onValueChange={(v: string) => handleAttributeOptionChange(index, v)}
                                                                >
                                                                    <SelectTrigger>
                                                                        <SelectValue placeholder="Seçin..." />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {(attributeTerms[attr.id] || []).map(term => (
                                                                            <SelectItem key={term.id} value={term.name}>{term.name}</SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            )}
                                                        </div>
                                                        <Button size="icon" variant="ghost" onClick={() => handleRemoveAttribute(index)}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ))}
                                                {newVariation.attributes.length === 0 && (
                                                    <p className="text-sm text-muted-foreground">Henüz özellik eklenmedi</p>
                                                )}
                                            </div>

                                            {/* Fiyat ve Stok */}
                                            <div className="grid grid-cols-4 gap-4 mb-4">
                                                <div className="space-y-1">
                                                    <Label className="text-xs">SKU</Label>
                                                    <Input
                                                        value={newVariation.sku}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewVariation(prev => ({ ...prev, sku: e.target.value }))}
                                                        placeholder="Opsiyonel"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-xs">Normal Fiyat (₺)</Label>
                                                    <Input
                                                        type="number"
                                                        value={newVariation.regular_price}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewVariation(prev => ({ ...prev, regular_price: e.target.value }))}
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-xs">İndirimli Fiyat (₺)</Label>
                                                    <Input
                                                        type="number"
                                                        value={newVariation.sale_price}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewVariation(prev => ({ ...prev, sale_price: e.target.value }))}
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-xs">Stok</Label>
                                                    <Input
                                                        type="number"
                                                        value={newVariation.stock_quantity}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewVariation(prev => ({ ...prev, stock_quantity: e.target.value }))}
                                                    />
                                                </div>
                                            </div>

                                            <Button onClick={handleCreateVariation}>
                                                Varyasyon Oluştur
                                            </Button>
                                        </div>
                                    )}

                                    {/* Mevcut Varyasyonlar */}
                                    {(product.variations?.length ?? 0) === 0 ? (
                                        <p className="text-muted-foreground">Henüz varyasyon eklenmemiş.</p>
                                    ) : (
                                        product.variations?.map((variation) => (
                                            <div key={variation.id} className="border rounded-lg p-4">
                                                {editingVariation === variation.id ? (
                                                    // Düzenleme Modu
                                                    <div className="space-y-4">
                                                        <div className="flex justify-between items-center">
                                                            <span className="font-medium">
                                                                {variation.attributes?.map((a) => `${a.name}: ${a.option}`).join(', ')}
                                                            </span>
                                                            <div className="flex gap-2">
                                                                <Button size="sm" onClick={() => handleVariationSave(variation.id)}>
                                                                    Kaydet
                                                                </Button>
                                                                <Button size="sm" variant="outline" onClick={() => setEditingVariation(null)}>
                                                                    İptal
                                                                </Button>
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-4 gap-4">
                                                            <div className="space-y-1">
                                                                <Label className="text-xs">SKU</Label>
                                                                <Input
                                                                    value={variationForm.sku}
                                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVariationForm(prev => ({ ...prev, sku: e.target.value }))}
                                                                />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <Label className="text-xs">Normal Fiyat</Label>
                                                                <Input
                                                                    type="number"
                                                                    value={variationForm.regular_price}
                                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVariationForm(prev => ({ ...prev, regular_price: e.target.value }))}
                                                                />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <Label className="text-xs">İndirimli Fiyat</Label>
                                                                <Input
                                                                    type="number"
                                                                    value={variationForm.sale_price}
                                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVariationForm(prev => ({ ...prev, sale_price: e.target.value }))}
                                                                />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <Label className="text-xs">Stok</Label>
                                                                <Input
                                                                    type="number"
                                                                    value={variationForm.stock_quantity}
                                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVariationForm(prev => ({ ...prev, stock_quantity: e.target.value }))}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    // Görüntüleme Modu
                                                    <div className="flex justify-between items-center">
                                                        <div className="flex-1">
                                                            <div className="font-medium">
                                                                {variation.attributes?.map((a) => (
                                                                    <Badge key={a.name} variant="outline" className="mr-1">
                                                                        {a.name}: {a.option}
                                                                    </Badge>
                                                                ))}
                                                            </div>
                                                            <div className="text-sm text-muted-foreground mt-1">
                                                                SKU: {variation.sku || '-'} |
                                                                Fiyat: ₺{variation.regular_price}
                                                                {variation.sale_price && <span className="text-green-600"> → ₺{variation.sale_price}</span>} |
                                                                Stok: {variation.stock_quantity ?? 'N/A'}
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <Button size="sm" variant="outline" onClick={() => handleVariationEdit(variation)}>
                                                                Düzenle
                                                            </Button>
                                                            <Button size="sm" variant="destructive" onClick={() => handleVariationDelete(variation.id)}>
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
};

export default ProductEditPage;
