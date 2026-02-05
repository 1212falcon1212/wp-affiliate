import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
    Plus,
    Trash2,
    Package,
    Layers,
    Save,
    Image as ImageIcon,
    AlertCircle
} from "lucide-react";

interface Category {
    id: number;
    name: string;
    parent: number;
}

interface Tag {
    id: number;
    name: string;
    slug: string;
}

interface Variation {
    attributes: { [key: string]: string };
    regular_price: string;
    sale_price: string;
    sku: string;
    stock_quantity: string;
    image: string;
}

interface AttributeConfig {
    name: string;
    values: string[];
}

const CreateProduct = () => {
    const navigate = useNavigate();
    const [productType, setProductType] = useState<'simple' | 'variable'>('simple');
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [tags, setTags] = useState<Tag[]>([]);
    const [loadingCategories, setLoadingCategories] = useState(true);
    const [loadingTags, setLoadingTags] = useState(true);

    // Simple product form
    const [simpleForm, setSimpleForm] = useState({
        name: '',
        sku: '',
        regular_price: '',
        sale_price: '',
        description: '',
        short_description: '',
        stock_quantity: '',
        status: 'draft',
        categories: [] as number[],
        tags: [] as number[],
        images: [''],
        weight: '',
        brand: '',
    });

    // Variable product form
    const [variableForm, setVariableForm] = useState({
        name: '',
        sku: '',
        description: '',
        short_description: '',
        status: 'draft',
        categories: [] as number[],
        tags: [] as number[],
        images: [''],
        brand: '',
    });

    // Attributes for variable product
    const [attributes, setAttributes] = useState<AttributeConfig[]>([
        { name: '', values: [''] }
    ]);

    // Variations
    const [variations, setVariations] = useState<Variation[]>([]);
    const [autoGenerateVariations, setAutoGenerateVariations] = useState(true);

    useEffect(() => {
        fetchCategories();
        fetchTags();
    }, []);

    // Auto-generate variations when attributes change
    useEffect(() => {
        if (autoGenerateVariations && productType === 'variable') {
            generateVariations();
        }
    }, [attributes, autoGenerateVariations, productType]);

    const fetchCategories = async () => {
        try {
            const response = await fetch('/api/products/wc/categories');
            if (response.ok) {
                const data = await response.json();
                setCategories(data.data || []);
            }
        } catch (error) {
            console.error('Kategoriler yuklenemedi:', error);
        } finally {
            setLoadingCategories(false);
        }
    };

    const fetchTags = async () => {
        try {
            const response = await fetch('/api/products/wc/tags');
            if (response.ok) {
                const data = await response.json();
                setTags(data.data || []);
            }
        } catch (error) {
            console.error('Etiketler yuklenemedi:', error);
        } finally {
            setLoadingTags(false);
        }
    };

    const generateVariations = () => {
        const validAttributes = attributes.filter(
            attr => attr.name.trim() && attr.values.some(v => v.trim())
        );

        if (validAttributes.length === 0) {
            setVariations([]);
            return;
        }

        // Generate all combinations
        const combinations = generateCombinations(validAttributes);

        // Create variation objects
        const newVariations: Variation[] = combinations.map(combo => ({
            attributes: combo,
            regular_price: '',
            sale_price: '',
            sku: '',
            stock_quantity: '',
            image: '',
        }));

        setVariations(newVariations);
    };

    const generateCombinations = (attrs: AttributeConfig[]): { [key: string]: string }[] => {
        if (attrs.length === 0) return [{}];

        const [first, ...rest] = attrs;
        const restCombinations = generateCombinations(rest);

        const combinations: { [key: string]: string }[] = [];

        for (const value of first.values.filter(v => v.trim())) {
            for (const combo of restCombinations) {
                combinations.push({
                    [first.name]: value,
                    ...combo,
                });
            }
        }

        return combinations;
    };

    const handleAddAttribute = () => {
        setAttributes([...attributes, { name: '', values: [''] }]);
    };

    const handleRemoveAttribute = (index: number) => {
        setAttributes(attributes.filter((_, i) => i !== index));
    };

    const handleAttributeNameChange = (index: number, name: string) => {
        const newAttributes = [...attributes];
        newAttributes[index].name = name;
        setAttributes(newAttributes);
    };

    const handleAttributeValueChange = (attrIndex: number, valueIndex: number, value: string) => {
        const newAttributes = [...attributes];
        newAttributes[attrIndex].values[valueIndex] = value;
        setAttributes(newAttributes);
    };

    const handleAddAttributeValue = (attrIndex: number) => {
        const newAttributes = [...attributes];
        newAttributes[attrIndex].values.push('');
        setAttributes(newAttributes);
    };

    const handleRemoveAttributeValue = (attrIndex: number, valueIndex: number) => {
        const newAttributes = [...attributes];
        newAttributes[attrIndex].values = newAttributes[attrIndex].values.filter((_, i) => i !== valueIndex);
        setAttributes(newAttributes);
    };

    const handleVariationChange = (index: number, field: keyof Variation, value: string | { [key: string]: string }) => {
        const newVariations = [...variations];
        if (field === 'attributes') {
            newVariations[index].attributes = value as { [key: string]: string };
        } else {
            newVariations[index][field] = value as string;
        }
        setVariations(newVariations);
    };

    const handleAddImage = (formType: 'simple' | 'variable') => {
        if (formType === 'simple') {
            setSimpleForm({ ...simpleForm, images: [...simpleForm.images, ''] });
        } else {
            setVariableForm({ ...variableForm, images: [...variableForm.images, ''] });
        }
    };

    const handleRemoveImage = (formType: 'simple' | 'variable', index: number) => {
        if (formType === 'simple') {
            setSimpleForm({
                ...simpleForm,
                images: simpleForm.images.filter((_, i) => i !== index)
            });
        } else {
            setVariableForm({
                ...variableForm,
                images: variableForm.images.filter((_, i) => i !== index)
            });
        }
    };

    const handleImageChange = (formType: 'simple' | 'variable', index: number, value: string) => {
        if (formType === 'simple') {
            const newImages = [...simpleForm.images];
            newImages[index] = value;
            setSimpleForm({ ...simpleForm, images: newImages });
        } else {
            const newImages = [...variableForm.images];
            newImages[index] = value;
            setVariableForm({ ...variableForm, images: newImages });
        }
    };

    const handleSubmit = async () => {
        setLoading(true);

        try {
            if (productType === 'simple') {
                await createSimpleProduct();
            } else {
                await createVariableProduct();
            }
        } catch (error) {
            console.error('Urun olusturma hatasi:', error);
            alert('Urun olusturulamadi');
        } finally {
            setLoading(false);
        }
    };

    const createSimpleProduct = async () => {
        const payload: any = {
            name: simpleForm.name,
            regular_price: parseFloat(simpleForm.regular_price) || 0,
            status: simpleForm.status,
        };

        if (simpleForm.sku) payload.sku = simpleForm.sku;
        if (simpleForm.sale_price) payload.sale_price = parseFloat(simpleForm.sale_price);
        if (simpleForm.description) payload.description = simpleForm.description;
        if (simpleForm.short_description) payload.short_description = simpleForm.short_description;
        if (simpleForm.stock_quantity) payload.stock_quantity = parseInt(simpleForm.stock_quantity);
        if (simpleForm.weight) payload.weight = simpleForm.weight;
        if (simpleForm.categories.length > 0) payload.categories = simpleForm.categories;
        if (simpleForm.tags.length > 0) payload.tags = simpleForm.tags;
        if (simpleForm.brand) payload.brand = simpleForm.brand;

        const images = simpleForm.images.filter(img => img.trim());
        if (images.length > 0) payload.images = images;

        const response = await fetch('/api/products/wc/simple', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (response.ok && data.success) {
            alert('Urun basariyla olusturuldu!');
            navigate('/products');
        } else {
            throw new Error(data.message || 'Urun olusturulamadi');
        }
    };

    const createVariableProduct = async () => {
        // Validate variations
        const validVariations = variations.filter(v =>
            v.regular_price && Object.keys(v.attributes).length > 0
        );

        if (validVariations.length === 0) {
            alert('En az bir gecerli varyasyon eklemelisiniz');
            return;
        }

        const payload: any = {
            name: variableForm.name,
            status: variableForm.status,
            variations: validVariations.map(v => ({
                attributes: v.attributes,
                regular_price: parseFloat(v.regular_price) || 0,
                sale_price: v.sale_price ? parseFloat(v.sale_price) : undefined,
                sku: v.sku || undefined,
                stock_quantity: v.stock_quantity ? parseInt(v.stock_quantity) : undefined,
                image: v.image || undefined,
            })),
        };

        if (variableForm.sku) payload.sku = variableForm.sku;
        if (variableForm.description) payload.description = variableForm.description;
        if (variableForm.short_description) payload.short_description = variableForm.short_description;
        if (variableForm.categories.length > 0) payload.categories = variableForm.categories;
        if (variableForm.tags.length > 0) payload.tags = variableForm.tags;
        if (variableForm.brand) payload.brand = variableForm.brand;

        const images = variableForm.images.filter(img => img.trim());
        if (images.length > 0) payload.images = images;

        const response = await fetch('/api/products/wc/variable', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (response.ok && data.success) {
            alert('Varyasyonlu urun basariyla olusturuldu!');
            navigate('/products');
        } else {
            throw new Error(data.message || 'Urun olusturulamadi');
        }
    };

    const applyPriceToAll = (field: 'regular_price' | 'sale_price' | 'stock_quantity', value: string) => {
        const newVariations = variations.map(v => ({
            ...v,
            [field]: value,
        }));
        setVariations(newVariations);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Yeni Urun Olustur</h2>
                    <p className="text-muted-foreground">WooCommerce'e yeni urun ekle</p>
                </div>
            </div>

            {/* Product Type Selection */}
            <Card>
                <CardHeader>
                    <CardTitle>Urun Tipi</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-4">
                        <Button
                            variant={productType === 'simple' ? 'default' : 'outline'}
                            className="flex-1 h-24 flex-col gap-2"
                            onClick={() => setProductType('simple')}
                        >
                            <Package className="h-8 w-8" />
                            <span>Basit Urun</span>
                        </Button>
                        <Button
                            variant={productType === 'variable' ? 'default' : 'outline'}
                            className="flex-1 h-24 flex-col gap-2"
                            onClick={() => setProductType('variable')}
                        >
                            <Layers className="h-8 w-8" />
                            <span>Varyasyonlu Urun</span>
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Simple Product Form */}
            {productType === 'simple' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Temel Bilgiler</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Urun Adi *</Label>
                                    <Input
                                        value={simpleForm.name}
                                        onChange={(e) => setSimpleForm({ ...simpleForm, name: e.target.value })}
                                        placeholder="Urun adi"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>SKU</Label>
                                        <Input
                                            value={simpleForm.sku}
                                            onChange={(e) => setSimpleForm({ ...simpleForm, sku: e.target.value })}
                                            placeholder="Stok kodu"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Durum</Label>
                                        <Select
                                            value={simpleForm.status}
                                            onValueChange={(v) => setSimpleForm({ ...simpleForm, status: v })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="draft">Taslak</SelectItem>
                                                <SelectItem value="publish">Yayinda</SelectItem>
                                                <SelectItem value="pending">Onay Bekliyor</SelectItem>
                                                <SelectItem value="private">Ozel</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Aciklama</Label>
                                    <Textarea
                                        value={simpleForm.description}
                                        onChange={(e) => setSimpleForm({ ...simpleForm, description: e.target.value })}
                                        placeholder="Urun aciklamasi"
                                        rows={4}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Kisa Aciklama</Label>
                                    <Textarea
                                        value={simpleForm.short_description}
                                        onChange={(e) => setSimpleForm({ ...simpleForm, short_description: e.target.value })}
                                        placeholder="Kisa aciklama"
                                        rows={2}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Fiyat ve Stok</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label>Normal Fiyat *</Label>
                                        <Input
                                            type="number"
                                            value={simpleForm.regular_price}
                                            onChange={(e) => setSimpleForm({ ...simpleForm, regular_price: e.target.value })}
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Indirimli Fiyat</Label>
                                        <Input
                                            type="number"
                                            value={simpleForm.sale_price}
                                            onChange={(e) => setSimpleForm({ ...simpleForm, sale_price: e.target.value })}
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Stok Adedi</Label>
                                        <Input
                                            type="number"
                                            value={simpleForm.stock_quantity}
                                            onChange={(e) => setSimpleForm({ ...simpleForm, stock_quantity: e.target.value })}
                                            placeholder="0"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Agirlik (kg)</Label>
                                    <Input
                                        value={simpleForm.weight}
                                        onChange={(e) => setSimpleForm({ ...simpleForm, weight: e.target.value })}
                                        placeholder="0.5"
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <span>Gorseller</span>
                                    <Button variant="outline" size="sm" onClick={() => handleAddImage('simple')}>
                                        <Plus className="h-4 w-4 mr-1" />
                                        Gorsel Ekle
                                    </Button>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {simpleForm.images.map((img, index) => (
                                    <div key={index} className="flex gap-2">
                                        <Input
                                            value={img}
                                            onChange={(e) => handleImageChange('simple', index, e.target.value)}
                                            placeholder="https://... gorsel URL'si"
                                        />
                                        {simpleForm.images.length > 1 && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleRemoveImage('simple', index)}
                                            >
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Kategoriler</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {loadingCategories ? (
                                    <div className="flex justify-center py-4">
                                        <Loader2 className="h-6 w-6 animate-spin" />
                                    </div>
                                ) : (
                                    <div className="space-y-2 max-h-64 overflow-y-auto">
                                        {categories.map((cat) => (
                                            <label key={cat.id} className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={simpleForm.categories.includes(cat.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSimpleForm({
                                                                ...simpleForm,
                                                                categories: [...simpleForm.categories, cat.id]
                                                            });
                                                        } else {
                                                            setSimpleForm({
                                                                ...simpleForm,
                                                                categories: simpleForm.categories.filter(id => id !== cat.id)
                                                            });
                                                        }
                                                    }}
                                                />
                                                <span className="text-sm">{cat.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Etiketler</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {loadingTags ? (
                                    <div className="flex justify-center py-4">
                                        <Loader2 className="h-6 w-6 animate-spin" />
                                    </div>
                                ) : (
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                        {tags.map((tag) => (
                                            <label key={tag.id} className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={simpleForm.tags.includes(tag.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSimpleForm({
                                                                ...simpleForm,
                                                                tags: [...simpleForm.tags, tag.id]
                                                            });
                                                        } else {
                                                            setSimpleForm({
                                                                ...simpleForm,
                                                                tags: simpleForm.tags.filter(id => id !== tag.id)
                                                            });
                                                        }
                                                    }}
                                                />
                                                <span className="text-sm">{tag.name}</span>
                                            </label>
                                        ))}
                                        {tags.length === 0 && (
                                            <p className="text-sm text-muted-foreground">Etiket bulunamadi</p>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Marka</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Input
                                    value={simpleForm.brand}
                                    onChange={(e) => setSimpleForm({ ...simpleForm, brand: e.target.value })}
                                    placeholder="Marka adi (opsiyonel)"
                                />
                            </CardContent>
                        </Card>

                        <Button
                            className="w-full"
                            size="lg"
                            onClick={handleSubmit}
                            disabled={loading || !simpleForm.name || !simpleForm.regular_price}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Olusturuluyor...
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    Urunu Olustur
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            )}

            {/* Variable Product Form */}
            {productType === 'variable' && (
                <Tabs defaultValue="general" className="space-y-6">
                    <TabsList>
                        <TabsTrigger value="general">Genel</TabsTrigger>
                        <TabsTrigger value="attributes">Ozellikler</TabsTrigger>
                        <TabsTrigger value="variations">Varyasyonlar ({variations.length})</TabsTrigger>
                    </TabsList>

                    <TabsContent value="general" className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 space-y-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Temel Bilgiler</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>Urun Adi *</Label>
                                            <Input
                                                value={variableForm.name}
                                                onChange={(e) => setVariableForm({ ...variableForm, name: e.target.value })}
                                                placeholder="Urun adi"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Ana SKU</Label>
                                                <Input
                                                    value={variableForm.sku}
                                                    onChange={(e) => setVariableForm({ ...variableForm, sku: e.target.value })}
                                                    placeholder="Ana stok kodu"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Durum</Label>
                                                <Select
                                                    value={variableForm.status}
                                                    onValueChange={(v) => setVariableForm({ ...variableForm, status: v })}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="draft">Taslak</SelectItem>
                                                        <SelectItem value="publish">Yayinda</SelectItem>
                                                        <SelectItem value="pending">Onay Bekliyor</SelectItem>
                                                        <SelectItem value="private">Ozel</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Aciklama</Label>
                                            <Textarea
                                                value={variableForm.description}
                                                onChange={(e) => setVariableForm({ ...variableForm, description: e.target.value })}
                                                placeholder="Urun aciklamasi"
                                                rows={4}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center justify-between">
                                            <span>Gorseller</span>
                                            <Button variant="outline" size="sm" onClick={() => handleAddImage('variable')}>
                                                <Plus className="h-4 w-4 mr-1" />
                                                Gorsel Ekle
                                            </Button>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {variableForm.images.map((img, index) => (
                                            <div key={index} className="flex gap-2">
                                                <Input
                                                    value={img}
                                                    onChange={(e) => handleImageChange('variable', index, e.target.value)}
                                                    placeholder="https://... gorsel URL'si"
                                                />
                                                {variableForm.images.length > 1 && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleRemoveImage('variable', index)}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-red-500" />
                                                    </Button>
                                                )}
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="space-y-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Kategoriler</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {loadingCategories ? (
                                            <div className="flex justify-center py-4">
                                                <Loader2 className="h-6 w-6 animate-spin" />
                                            </div>
                                        ) : (
                                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                                {categories.map((cat) => (
                                                    <label key={cat.id} className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={variableForm.categories.includes(cat.id)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setVariableForm({
                                                                        ...variableForm,
                                                                        categories: [...variableForm.categories, cat.id]
                                                                    });
                                                                } else {
                                                                    setVariableForm({
                                                                        ...variableForm,
                                                                        categories: variableForm.categories.filter(id => id !== cat.id)
                                                                    });
                                                                }
                                                            }}
                                                        />
                                                        <span className="text-sm">{cat.name}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>Etiketler</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {loadingTags ? (
                                            <div className="flex justify-center py-4">
                                                <Loader2 className="h-6 w-6 animate-spin" />
                                            </div>
                                        ) : (
                                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                                {tags.map((tag) => (
                                                    <label key={tag.id} className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={variableForm.tags.includes(tag.id)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setVariableForm({
                                                                        ...variableForm,
                                                                        tags: [...variableForm.tags, tag.id]
                                                                    });
                                                                } else {
                                                                    setVariableForm({
                                                                        ...variableForm,
                                                                        tags: variableForm.tags.filter(id => id !== tag.id)
                                                                    });
                                                                }
                                                            }}
                                                        />
                                                        <span className="text-sm">{tag.name}</span>
                                                    </label>
                                                ))}
                                                {tags.length === 0 && (
                                                    <p className="text-sm text-muted-foreground">Etiket bulunamadi</p>
                                                )}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>Marka</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <Input
                                            value={variableForm.brand}
                                            onChange={(e) => setVariableForm({ ...variableForm, brand: e.target.value })}
                                            placeholder="Marka adi (opsiyonel)"
                                        />
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="attributes" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <span>Ozellikler (Attributes)</span>
                                    <Button variant="outline" onClick={handleAddAttribute}>
                                        <Plus className="h-4 w-4 mr-1" />
                                        Ozellik Ekle
                                    </Button>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="autoGenerate"
                                        checked={autoGenerateVariations}
                                        onChange={(e) => setAutoGenerateVariations(e.target.checked)}
                                    />
                                    <label htmlFor="autoGenerate" className="text-sm">
                                        Varyasyonlari otomatik olustur
                                    </label>
                                </div>

                                {attributes.map((attr, attrIndex) => (
                                    <div key={attrIndex} className="border rounded-lg p-4 space-y-4">
                                        <div className="flex gap-4 items-start">
                                            <div className="flex-1 space-y-2">
                                                <Label>Ozellik Adi</Label>
                                                <Input
                                                    value={attr.name}
                                                    onChange={(e) => handleAttributeNameChange(attrIndex, e.target.value)}
                                                    placeholder="ornegin: Renk, Beden, vb."
                                                />
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="mt-8"
                                                onClick={() => handleRemoveAttribute(attrIndex)}
                                            >
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <Label>Degerler</Label>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleAddAttributeValue(attrIndex)}
                                                >
                                                    <Plus className="h-3 w-3 mr-1" />
                                                    Deger Ekle
                                                </Button>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {attr.values.map((value, valueIndex) => (
                                                    <div key={valueIndex} className="flex gap-1">
                                                        <Input
                                                            value={value}
                                                            onChange={(e) => handleAttributeValueChange(attrIndex, valueIndex, e.target.value)}
                                                            placeholder="Deger"
                                                            className="w-32"
                                                        />
                                                        {attr.values.length > 1 && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-10 w-10"
                                                                onClick={() => handleRemoveAttributeValue(attrIndex, valueIndex)}
                                                            >
                                                                <Trash2 className="h-3 w-3 text-red-500" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {attributes.length === 0 && (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                                        <p>Henuz ozellik eklenmedi. Ozellik ekleyerek varyasyonlar olusturabilirsiniz.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="variations" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <span>Varyasyonlar ({variations.length})</span>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={generateVariations}>
                                            Yeniden Olustur
                                        </Button>
                                    </div>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {variations.length > 0 && (
                                    <div className="mb-4 p-3 bg-muted rounded-lg">
                                        <p className="text-sm font-medium mb-2">Toplu Islem:</p>
                                        <div className="flex gap-4 flex-wrap">
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    type="number"
                                                    placeholder="Tum fiyatlar"
                                                    className="w-32"
                                                    onBlur={(e) => e.target.value && applyPriceToAll('regular_price', e.target.value)}
                                                />
                                                <span className="text-sm text-muted-foreground">Normal Fiyat</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    type="number"
                                                    placeholder="Tum stoklar"
                                                    className="w-32"
                                                    onBlur={(e) => e.target.value && applyPriceToAll('stock_quantity', e.target.value)}
                                                />
                                                <span className="text-sm text-muted-foreground">Stok</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {variations.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <Layers className="h-12 w-12 mx-auto mb-4" />
                                        <p>Henuz varyasyon yok.</p>
                                        <p className="text-sm">Ozellikler sekmesinden ozellik ekleyerek varyasyonlar olusturun.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {variations.map((variation, index) => (
                                            <div key={index} className="border rounded-lg p-4">
                                                <div className="flex items-center gap-2 mb-3">
                                                    {Object.entries(variation.attributes).map(([key, value]) => (
                                                        <Badge key={key} variant="secondary">
                                                            {key}: {value}
                                                        </Badge>
                                                    ))}
                                                </div>
                                                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                                    <div className="space-y-1">
                                                        <Label className="text-xs">Normal Fiyat *</Label>
                                                        <Input
                                                            type="number"
                                                            value={variation.regular_price}
                                                            onChange={(e) => handleVariationChange(index, 'regular_price', e.target.value)}
                                                            placeholder="0.00"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-xs">Indirimli Fiyat</Label>
                                                        <Input
                                                            type="number"
                                                            value={variation.sale_price}
                                                            onChange={(e) => handleVariationChange(index, 'sale_price', e.target.value)}
                                                            placeholder="0.00"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-xs">SKU</Label>
                                                        <Input
                                                            value={variation.sku}
                                                            onChange={(e) => handleVariationChange(index, 'sku', e.target.value)}
                                                            placeholder="Stok kodu"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-xs">Stok</Label>
                                                        <Input
                                                            type="number"
                                                            value={variation.stock_quantity}
                                                            onChange={(e) => handleVariationChange(index, 'stock_quantity', e.target.value)}
                                                            placeholder="0"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-xs">Gorsel URL</Label>
                                                        <Input
                                                            value={variation.image}
                                                            onChange={(e) => handleVariationChange(index, 'image', e.target.value)}
                                                            placeholder="https://..."
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Button
                            className="w-full"
                            size="lg"
                            onClick={handleSubmit}
                            disabled={loading || !variableForm.name || variations.length === 0}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Olusturuluyor...
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    Varyasyonlu Urunu Olustur
                                </>
                            )}
                        </Button>
                    </TabsContent>
                </Tabs>
            )}
        </div>
    );
};

export default CreateProduct;
