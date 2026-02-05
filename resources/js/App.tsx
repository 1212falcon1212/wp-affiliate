import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Dashboard from '@/pages/Dashboard';
import Login from '@/pages/Login';

import Catalog from '@/pages/Catalog';
import ProductDetailPage from '@/pages/ProductDetail';
import ProductEditPage from '@/pages/ProductEdit';
import CreateProduct from '@/pages/CreateProduct';

import Orders from '@/pages/Orders';
import OrderDetail from '@/pages/OrderDetail';

import Affiliates from '@/pages/Affiliates';
import AffiliateDetail from '@/pages/AffiliateDetail';

import Invoices from '@/pages/Invoices';
import Payments from '@/pages/Payments';

import BizimHesapProducts from '@/pages/BizimHesapProducts';
import BizimHesapProductDetail from '@/pages/BizimHesapProductDetail';

import KozvitProducts from '@/pages/KozvitProducts';
import KozvitProductDetail from '@/pages/KozvitProductDetail';

import Settings from '@/pages/Settings';
import { Toaster } from '@/components/ui/toaster';

function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route
                        path="/"
                        element={
                            <ProtectedRoute>
                                <DashboardLayout />
                            </ProtectedRoute>
                        }
                    >
                        <Route index element={<Dashboard />} />
                        <Route path="products" element={<Catalog />} />
                        <Route path="products/create" element={<CreateProduct />} />
                        <Route path="products/:id" element={<ProductDetailPage />} />
                        <Route path="products/:id/edit" element={<ProductEditPage />} />
                        <Route path="orders" element={<Orders />} />
                        <Route path="orders/:id" element={<OrderDetail />} />
                        <Route path="affiliates" element={<Affiliates />} />
                        <Route path="affiliates/:id" element={<AffiliateDetail />} />
                        <Route path="invoices" element={<Invoices />} />
                        <Route path="payments" element={<Payments />} />
                        <Route path="bizimhesap-products" element={<BizimHesapProducts />} />
                        <Route path="bizimhesap-products/:id" element={<BizimHesapProductDetail />} />
                        <Route path="kozvit-products" element={<KozvitProducts />} />
                        <Route path="kozvit-products/:id" element={<KozvitProductDetail />} />
                        <Route path="settings" element={<Settings />} />
                    </Route>
                </Routes>
                <Toaster />
            </Router>
        </AuthProvider>
    );
}

export default App;
