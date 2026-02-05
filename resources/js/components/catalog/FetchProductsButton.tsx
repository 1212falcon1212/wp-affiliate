import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { DownloadCloud, Loader2 } from "lucide-react";

const FetchProductsButton = () => {
    const [loading, setLoading] = useState(false);

    const handleFetch = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/products/fetch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                }
            });

            if (response.ok) {
                alert("Ürün senkronizasyonu başlatıldı!");
            } else {
                alert("Senkronizasyon başlatılamadı.");
            }
        } catch (error) {
            console.error("Hata:", error);
            alert("Senkronizasyon tetiklenirken hata oluştu.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button onClick={handleFetch} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DownloadCloud className="mr-2 h-4 w-4" />}
            Ürünleri Çek
        </Button>
    );
};

export default FetchProductsButton;
