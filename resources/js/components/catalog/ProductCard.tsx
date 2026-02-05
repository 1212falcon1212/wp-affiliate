import React from 'react';
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, AlertTriangle, Edit } from "lucide-react";

interface ProductCardProps {
    product: {
        id: string;
        name: string;
        sku: string;
        image?: string;
        erp_price: number;
        wc_price: number;
        stock: number;
        sync_status: 'synced' | 'error' | 'pending';
    };
    onSelect?: (id: string, selected: boolean) => void;
    onEdit?: (id: string) => void;
    isSelected?: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onSelect, onEdit, isSelected }) => {

    // Determine stock badge color
    let stockVariant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" = "default";
    if (product.stock > 20) stockVariant = "success";
    else if (product.stock > 5) stockVariant = "warning";
    else stockVariant = "destructive";

    return (
        <Card className="w-full relative group hover:shadow-lg transition-all">
            <CardHeader className="p-4 flex flex-row justify-between items-center space-y-0">
                <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => onSelect && onSelect(product.id, checked === true)}
                />
                <Badge variant={stockVariant}>{product.stock} Units</Badge>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-2">
                <div className="aspect-square bg-muted rounded-md flex items-center justify-center overflow-hidden">
                    {/* Placeholder or real image */}
                    {product.image ? (
                        <img src={product.image} alt={product.name} className="object-cover w-full h-full" />
                    ) : (
                        <span className="text-muted-foreground text-xs">No Image</span>
                    )}
                </div>
                <div>
                    <h3 className="font-semibold truncate" title={product.name}>{product.name}</h3>
                    <p className="text-sm text-muted-foreground font-mono">{product.sku}</p>
                </div>
                <div className="flex justify-between items-end">
                    <div className="text-sm">
                        <p className="text-muted-foreground text-xs">ERP: ${product.erp_price}</p>
                        <p className="font-bold">WC: ${product.wc_price}</p>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="p-4 border-t flex justify-between items-center bg-muted/20">
                <div className="flex items-center gap-1.5" title={`Status: ${product.sync_status}`}>
                    {product.sync_status === 'synced' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                    {product.sync_status === 'error' && <XCircle className="w-4 h-4 text-destructive" />}
                    {product.sync_status === 'pending' && <AlertTriangle className="w-4 h-4 text-yellow-500" />}
                    <span className="text-xs Capitalize ml-1">{product.sync_status}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => onEdit && onEdit(product.id)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                </Button>
            </CardFooter>
        </Card>
    );
};

export default ProductCard;
