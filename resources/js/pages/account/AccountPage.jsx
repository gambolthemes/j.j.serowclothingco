import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Check, Package, MapPin, FileText, Landmark } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { fieldErrors, generalError, listOrders, updateProfile } from '@/lib/api';
import { inr } from '@/lib/pricing';
import {
    cardClass,
    errorClass,
    fieldClass,
    labelClass,
    primaryButtonClass,
} from '@/components/account/ui';

const AccountPage = () => {
    const { user, setUser } = useAuth();
    const [form, setForm] = useState({ name: '', company: '', email: '' });
    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);
    const [orders, setOrders] = useState(null);

    useEffect(() => {
        if (user) setForm({ name: user.name, company: user.company ?? '', email: user.email });
    }, [user]);

    useEffect(() => {
        listOrders().then(setOrders).catch(() => setOrders([]));
    }, []);

    const onSubmit = async (e) => {
        e.preventDefault();
        setErrors({});
        setMessage('');
        setBusy(true);
        try {
            setUser(await updateProfile(form));
            setMessage('Business details saved.');
        } catch (err) {
            setErrors(fieldErrors(err));
            if (!Object.keys(fieldErrors(err)).length) {
                setMessage(generalError(err, 'Could not save your details.'));
            }
        } finally {
            setBusy(false);
        }
    };

    const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

    const spend = orders?.reduce((sum, o) => sum + o.total, 0) ?? 0;
    const sets = orders?.reduce((sum, o) => sum + o.total_sets, 0) ?? 0;

    return (
        <div>
            <Helmet>
                <title>My Account — J.J. Serow Clothing Co.</title>
                <meta
                    name="description"
                    content="Your retailer account: business details, bulk order history, shipping addresses and wholesale rate card access."
                />
            </Helmet>

            <div className="grid gap-4 sm:grid-cols-3">
                {[
                    { label: 'Orders placed', value: orders ? orders.length : '—' },
                    { label: 'Sets ordered', value: orders ? sets : '—' },
                    { label: 'Order value', value: orders ? inr(spend) : '—' },
                ].map((stat) => (
                    <div key={stat.label} className="border border-foreground/50 bg-card p-5">
                        <p className="font-label text-[10px] uppercase tracking-[0.16em] text-foreground/55">
                            {stat.label}
                        </p>
                        <p className="mt-2 font-display text-3xl font-black">{stat.value}</p>
                    </div>
                ))}
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                    { to: '/account/orders', label: 'Order history', icon: Package },
                    { to: '/account/addresses', label: 'Shipping addresses', icon: MapPin },
                    { to: '/account/payment', label: 'Payment details', icon: Landmark },
                    { to: '/rate-card', label: 'Wholesale rate card', icon: FileText },
                ].map((link) => (
                    <Link
                        key={link.to}
                        to={link.to}
                        className="flex items-center gap-3 border border-foreground/40 px-4 py-4 font-label text-[11px] uppercase tracking-[0.14em] transition-colors hover:bg-secondary"
                    >
                        <link.icon className="h-4 w-4" strokeWidth={2} />
                        {link.label}
                    </Link>
                ))}
            </div>

            <form onSubmit={onSubmit} className={`${cardClass} mt-8`}>
                <h2 className="font-label text-[11px] font-semibold uppercase tracking-[0.2em]">
                    Business details
                </h2>
                <p className="mt-2 text-sm text-foreground/60">
                    These appear on your GST invoice and on every WhatsApp order confirmation.
                </p>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <label className="block">
                        <span className={labelClass}>Your name</span>
                        <input required value={form.name} onChange={set('name')} className={fieldClass} />
                        {errors.name && <p className={errorClass}>{errors.name}</p>}
                    </label>
                    <label className="block">
                        <span className={labelClass}>Store / Company</span>
                        <input required value={form.company} onChange={set('company')} className={fieldClass} />
                        {errors.company && <p className={errorClass}>{errors.company}</p>}
                    </label>
                    <label className="block sm:col-span-2">
                        <span className={labelClass}>Email</span>
                        <input
                            type="email"
                            required
                            value={form.email}
                            onChange={set('email')}
                            className={fieldClass}
                        />
                        {errors.email && <p className={errorClass}>{errors.email}</p>}
                    </label>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-4">
                    <button type="submit" disabled={busy} className={primaryButtonClass}>
                        {busy ? 'Saving…' : 'Save details'}
                    </button>
                    {message && (
                        <p className="flex items-center gap-2 font-label text-[10px] uppercase tracking-[0.14em] text-foreground/60">
                            <Check className="h-3.5 w-3.5" /> {message}
                        </p>
                    )}
                </div>
            </form>
        </div>
    );
};

export default AccountPage;
