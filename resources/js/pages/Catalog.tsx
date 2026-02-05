import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Filter, Package, Eye, Edit, RefreshCw, Loader2, Plus } from "lucide-react";
import FetchProductsButton from "@/components/catalog/FetchProductsButton";

interface Product {
    id: number;
    commerce_id: string;
    sku: string;
    name: string;
    price: number;
    stock: number;
    stock_status: string;
    status: string;
    type: string;
    sync_status: string;
    images: { src: string; is_featured: boolean }[];
    categories: { id: number; name: string }[];
}

interface Stats {
    total_products: number;
    published: number;
    in_stock: number;
    out_of_stock: number;
    low_stock: number;
    on_sale: number;
}

const Catalog = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<Stats | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchProducts = async (page = 1, search = "") => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                per_page: '20',
                ...(search && { search }),
            });

            const response = await fetch(`/api/products?${params}`);
            if (response.ok) {
                const data = await response.json();
                setProducts(data.data);
                setCurrentPage(data.meta?.current_page || 1);
                setTotalPages(data.meta?.last_page || 1);
            }
        } catch (error) {
            console.error('Ürünler yüklenirken hata:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await fetch('/api/products/stats');
            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (error) {
            console.error('İstatistikler yüklenirken hata:', error);
        }
    };

    useEffect(() => {
        fetchProducts();
        fetchStats();
    }, []);

    useEffect(() => {
        const debounce = setTimeout(() => {
            fetchProducts(1, searchTerm);
        }, 300);
        return () => clearTimeout(debounce);
    }, [searchTerm]);

    const getStockBadge = (product: Product) => {
        if (product.stock_status === 'outofstock') {
            return <Badge variant="destructive">Stokta Yok</Badge>;
        }
        if (product.stock < 10) {
            return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-600">Az Stok ({product.stock})</Badge>;
        }
        return <Badge variant="default" className="bg-green-500/20 text-green-600">Stokta ({product.stock})</Badge>;
    };

    return (
        <div className="space-y-6">
            {/* İstatistik Kartları */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                    <Card>
                        <CardContent className="p-4">
                            <p className="text-sm text-muted-foreground">Toplam Ürün</p>
                            <p className="text-2xl font-bold">{stats.total_products}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <p className="text-sm text-muted-foreground">Yayında</p>
                            <p className="text-2xl font-bold text-green-600">{stats.published}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <p className="text-sm text-muted-foreground">Stokta</p>
                            <p className="text-2xl font-bold">{stats.in_stock}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <p className="text-sm text-muted-foreground">Stok Tükendi</p>
                            <p className="text-2xl font-bold text-red-600">{stats.out_of_stock}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <p className="text-sm text-muted-foreground">Az Stok</p>
                            <p className="text-2xl font-bold text-yellow-600">{stats.low_stock}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <p className="text-sm text-muted-foreground">İndirimde</p>
                            <p className="text-2xl font-bold text-purple-600">{stats.on_sale}</p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Başlık */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                <h2 className="text-3xl font-bold tracking-tight">Ürünler</h2>
                <div className="flex gap-2 w-full sm:w-auto">
                    <Link to="/products/create">
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Yeni Urun
                        </Button>
                    </Link>
                    <FetchProductsButton />
                    <Button variant="outline" onClick={() => fetchProducts(currentPage, searchTerm)}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Yenile
                    </Button>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="SKU veya İsim ara..."
                            className="pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Ürün Tablosu */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className="text-left p-4 font-medium">Görsel</th>
                                <th className="text-left p-4 font-medium">Ürün Adı</th>
                                <th className="text-left p-4 font-medium">SKU</th>
                                <th className="text-left p-4 font-medium">Tür</th>
                                <th className="text-left p-4 font-medium">Fiyat</th>
                                <th className="text-left p-4 font-medium">Stok</th>
                                <th className="text-left p-4 font-medium">Kategoriler</th>
                                <th className="text-left p-4 font-medium">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map((product) => (
                                <tr key={product.id} className="border-t hover:bg-muted/30 transition-colors">
                                    <td className="p-4">
                                        <img
                                            src={product.images?.[0]?.src || 'https://via.placeholder.com/50'}
                                            alt={product.name}
                                            className="w-12 h-12 object-cover rounded"
                                        />
                                    </td>
                                    <td className="p-4">
                                        <Link to={`/products/${product.id}`} className="font-medium hover:text-primary">
                                            {product.name}
                                        </Link>
                                        <p className="text-sm text-muted-foreground">ID: {product.commerce_id}</p>
                                    </td>
                                    <td className="p-4 font-mono text-sm">{product.sku}</td>
                                    <td className="p-4">
                                        <Badge variant="outline">{product.type === 'simple' ? 'Basit' : product.type === 'variable' ? 'Varyasyonlu' : product.type}</Badge>
                                    </td>
                                    <td className="p-4 font-medium">₺{product.price}</td>
                                    <td className="p-4">{getStockBadge(product)}</td>
                                    <td className="p-4">
                                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                                            {product.categories?.slice(0, 2).map((cat) => (
                                                <Badge key={cat.id} variant="secondary" className="text-xs">
                                                    {cat.name}
                                                </Badge>
                                            ))}
                                            {product.categories?.length > 2 && (
                                                <Badge variant="secondary" className="text-xs">
                                                    +{product.categories.length - 2}
                                                </Badge>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex gap-2">
                                            <Link to={`/products/${product.id}`}>
                                                <Button variant="ghost" size="icon" title="Görüntüle">
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </Link>
                                            <Link to={`/products/${product.id}/edit`}>
                                                <Button variant="ghost" size="icon" title="Düzenle">
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                            </Link>
                                        </div>
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
                        onClick={() => fetchProducts(currentPage - 1, searchTerm)}
                    >
                        Önceki
                    </Button>
                    <span className="flex items-center px-4">
                        Sayfa {currentPage} / {totalPages}
                    </span>
                    <Button
                        variant="outline"
                        disabled={currentPage === totalPages}
                        onClick={() => fetchProducts(currentPage + 1, searchTerm)}
                    >
                        Sonraki
                    </Button>
                </div>
            )}
        </div>
    );
};

export default Catalog;
