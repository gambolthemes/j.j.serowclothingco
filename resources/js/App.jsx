import React, { Suspense, lazy } from 'react';
import { Route, Routes, BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import Header from './components/Header';
import Footer from './components/Footer';
import WhatsAppFloat from './components/WhatsAppFloat';
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';
import CatalogPage from './pages/CatalogPage';
import ProductPage from './pages/ProductPage';
import CartPage from './pages/CartPage';
import TrackingPage from './pages/TrackingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import RateCardPage from './pages/RateCardPage';

/* The storefront is what a first-time visitor loads, so it stays in the main
   bundle. The account and admin screens only matter once someone is signed in,
   and the admin tree in particular is large — split both out so a retailer
   browsing the catalog never downloads the production desk. */
const AccountLayout = lazy(() => import('./components/account/AccountLayout'));
const AccountPage = lazy(() => import('./pages/account/AccountPage'));
const OrdersPage = lazy(() => import('./pages/account/OrdersPage'));
const OrderDetailPage = lazy(() => import('./pages/account/OrderDetailPage'));
const InvoicePage = lazy(() => import('./pages/account/InvoicePage'));
const AddressesPage = lazy(() => import('./pages/account/AddressesPage'));
const PaymentPage = lazy(() => import('./pages/account/PaymentPage'));
const PasswordPage = lazy(() => import('./pages/account/PasswordPage'));

const AdminLayout = lazy(() => import('./components/admin/AdminLayout'));
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'));
const AdminOrdersPage = lazy(() => import('./pages/admin/AdminOrdersPage'));
const AdminOrderDetailPage = lazy(() => import('./pages/admin/AdminOrderDetailPage'));
const AdminRetailersPage = lazy(() => import('./pages/admin/AdminRetailersPage'));
const AdminRetailerDetailPage = lazy(() => import('./pages/admin/AdminRetailerDetailPage'));
const AdminProductsPage = lazy(() => import('./pages/admin/AdminProductsPage'));
const AdminColorsPage = lazy(() => import('./pages/admin/AdminColorsPage'));
const AdminSettingsPage = lazy(() => import('./pages/admin/AdminSettingsPage'));

const RouteFallback = () => (
    <p className="mx-auto max-w-[90rem] px-4 py-24 font-label text-[11px] uppercase tracking-[0.16em] text-foreground/50 sm:px-8">
        Loading…
    </p>
);

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
                        <Suspense fallback={<RouteFallback />}>
                            <Routes>
                                <Route path="/" element={<HomePage />} />
                                <Route path="/catalog" element={<CatalogPage />} />
                                <Route path="/product/:id" element={<ProductPage />} />
                                <Route path="/cart" element={<CartPage />} />
                                <Route path="/tracking" element={<TrackingPage />} />
                                <Route path="/login" element={<LoginPage />} />
                                <Route path="/signup" element={<SignupPage />} />
                                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                                <Route path="/reset-password" element={<ResetPasswordPage />} />
                                <Route path="/rate-card" element={<RateCardPage />} />

                                {/* Outside the account layout: an invoice prints on its own. */}
                                <Route
                                    path="/account/orders/:code/invoice"
                                    element={
                                        <ProtectedRoute>
                                            <InvoicePage />
                                        </ProtectedRoute>
                                    }
                                />

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
                                    <Route path="payment" element={<PaymentPage />} />
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
                                    <Route path="retailers/:id" element={<AdminRetailerDetailPage />} />
                                    <Route path="products" element={<AdminProductsPage />} />
                                    <Route path="colors" element={<AdminColorsPage />} />
                                    <Route path="settings" element={<AdminSettingsPage />} />
                                </Route>

                                <Route path="*" element={<NotFoundPage />} />
                            </Routes>
                        </Suspense>
                    </main>
                    <Footer />
                    <WhatsAppFloat />
                </Router>
            </CartProvider>
        </AuthProvider>
    );
}

export default App;
