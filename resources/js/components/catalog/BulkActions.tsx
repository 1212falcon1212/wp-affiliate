import React from 'react';
import { Button } from "@/components/ui/button";
import { RefreshCw, TrendingUp, EyeOff } from "lucide-react";

interface BulkActionsProps {
    selectedCount: number;
    onAction: (action: 'sync' | 'price' | 'hide') => void;
}

const BulkActions: React.FC<BulkActionsProps> = ({ selectedCount, onAction }) => {
    if (selectedCount === 0) return null;

    return (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-card text-card-foreground border rounded-full px-6 py-3 shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-5">
            <span className="text-sm font-semibold whitespace-nowrap">{selectedCount} Selected</span>
            <div className="h-6 w-px bg-border" />
            <Button size="sm" variant="ghost" className="h-8" onClick={() => onAction('sync')}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Sync Stock
            </Button>
            <Button size="sm" variant="ghost" className="h-8" onClick={() => onAction('price')}>
                <TrendingUp className="mr-2 h-4 w-4" />
                Update Price
            </Button>
            <Button size="sm" variant="ghost" className="h-8 text-destructive hover:text-destructive" onClick={() => onAction('hide')}>
                <EyeOff className="mr-2 h-4 w-4" />
                Hide
            </Button>
        </div>
    );
};

export default BulkActions;
