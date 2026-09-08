import React from 'react';
import { Route, Routes, BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import Header from './components/Header';
import Footer from './components/Footer';
import WhatsAppFloat from './components/WhatsAppFloat';
import AccountLayout from './components/account/AccountLayout';
import AccountPage from './pages/account/AccountPage';
import OrdersPage from './pages/account/OrdersPage';
import OrderDetailPage from './pages/account/OrderDetailPage';
import AddressesPage from './pages/account/AddressesPage';
import PasswordPage from './pages/account/PasswordPage';
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminOrdersPage from './pages/admin/AdminOrdersPage';
import AdminOrderDetailPage from './pages/admin/AdminOrderDetailPage';
import AdminRetailersPage from './pages/admin/AdminRetailersPage';
import HomePage from './pages/HomePage';
import CatalogPage from './pages/CatalogPage';
import ProductPage from './pages/ProductPage';
import CartPage from './pages/CartPage';
import TrackingPage from './pages/TrackingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import RateCardPage from './pages/RateCardPage';

function App() {
    return (
        <AuthProvider>
            <CartProvider>
                <Router>
                    <ScrollToTop />
                    <div aria-hidden className="paper-grain pointer-events-none fixed inset-0 z-[60]" />
                    <div aria-hidden className="pointer-events-none fixed inset-2 z-[70] border border-foreground/40 sm:inset-3" />
                    <Header />
                    <main>
                        <Routes>
                            <Route path="/" element={<HomePage />} />
                            <Route path="/catalog" element={<CatalogPage />} />
                            <Route path="/product/:id" element={<ProductPage />} />
                            <Route path="/cart" element={<CartPage />} />
                            <Route path="/tracking" element={<TrackingPage />} />
                            <Route path="/login" element={<LoginPage />} />
                            <Route path="/signup" element={<SignupPage />} />
                            <Route path="/rate-card" element={<RateCardPage />} />
                            <Route
                                path="/account"
                                element={
                                    <ProtectedRoute>
                                        <AccountLayout />
                                    </ProtectedRoute>
                                }
                            >
                                <Route index element={<AccountPage />} />
                                <Route path="orders" element={<OrdersPage />} />
                                <Route path="orders/:code" element={<OrderDetailPage />} />
                                <Route path="addresses" element={<AddressesPage />} />
                                <Route path="password" element={<PasswordPage />} />
                            </Route>
                            <Route
                                path="/admin"
                                element={
                                    <AdminRoute>
                                        <AdminLayout />
                                    </AdminRoute>
                                }
                            >
                                <Route index element={<AdminDashboardPage />} />
                                <Route path="orders" element={<AdminOrdersPage />} />
                                <Route path="orders/:code" element={<AdminOrderDetailPage />} />
                                <Route path="retailers" element={<AdminRetailersPage />} />
                            </Route>
                            <Route path="*" element={<HomePage />} />
                        </Routes>
                    </main>
                    <Footer />
                    <WhatsAppFloat />
                </Router>
            </CartProvider>
        </AuthProvider>
    );
}

export default App;
