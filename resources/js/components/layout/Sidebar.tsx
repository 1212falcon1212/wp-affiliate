import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShoppingBag, ShoppingCart, Settings, Users, LogOut, Loader2, FileText, CreditCard, Database, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

const Sidebar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [loggingOut, setLoggingOut] = React.useState(false);

    const navItems = [
        { href: '/', label: 'Genel Bakis', icon: LayoutDashboard },
        { href: '/products', label: 'Urunler', icon: ShoppingBag },
        { href: '/bizimhesap-products', label: 'BizimHesap Urunler', icon: Database },
        { href: '/kozvit-products', label: 'Kozvit Urunler', icon: Package },
        { href: '/orders', label: 'Siparisler', icon: ShoppingCart },
        { href: '/affiliates', label: 'Ortaklar', icon: Users },
        { href: '/invoices', label: 'Faturalar', icon: FileText },
        { href: '/payments', label: 'Odemeler', icon: CreditCard },
        { href: '/settings', label: 'Ayarlar', icon: Settings },
    ];

    const handleLogout = async () => {
        setLoggingOut(true);
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error('Cikis hatasi:', error);
        } finally {
            setLoggingOut(false);
        }
    };

    return (
        <aside className="w-64 bg-card border-r flex flex-col h-full">
            <div className="p-6 border-b">
                <h2 className="text-2xl font-bold tracking-tight">Urun<span className="text-primary">Yonetici</span></h2>
            </div>
            <nav className="flex-1 p-4 space-y-2">
                {navItems.map((item) => (
                    <NavLink
                        key={item.href}
                        to={item.href}
                        className={({ isActive }) => cn(
                            "flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium",
                            isActive
                                ? "bg-primary text-primary-foreground"
                                : "hover:bg-muted text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <item.icon className="w-4 h-4" />
                        {item.label}
                    </NavLink>
                ))}
            </nav>
            <div className="p-4 border-t">
                {user && (
                    <div className="mb-3 px-3">
                        <p className="text-sm font-medium truncate">{user.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                )}
                <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
                    onClick={handleLogout}
                    disabled={loggingOut}
                >
                    {loggingOut ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <LogOut className="w-4 h-4" />
                    )}
                    {loggingOut ? 'Cikis yapiliyor...' : 'Cikis Yap'}
                </Button>
            </div>
        </aside>
    );
};

export default Sidebar;
