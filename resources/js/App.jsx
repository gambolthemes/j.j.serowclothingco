import React from 'react';
import { Route, Routes, BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import ScrollToTop from './components/ScrollToTop';
import Header from './components/Header';
import Footer from './components/Footer';
import WhatsAppFloat from './components/WhatsAppFloat';
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
