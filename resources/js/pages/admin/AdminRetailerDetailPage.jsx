import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { ArrowLeft, ArrowRight, ShieldCheck, ShieldOff } from 'lucide-react';
import { adminGetRetailer, adminSetRole, formatDate, generalError } from '@/lib/api';
import { inr } from '@/lib/pricing';
import { cardClass, ghostButtonClass } from '@/components/account/ui';

const AdminRetailerDetailPage = () => {
    const { id } = useParams();
    const [retailer, setRetailer] = useState(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        setRetailer(null);
        setError('');
        adminGetRetailer(id)
            .then(setRetailer)
            .catch(() => setError('No account with that id.'));
    }, [id]);

    const toggleRole = async () => {
        const next = !retailer.is_admin;
        if (
            !window.confirm(
                next
                    ? `Give ${retailer.name} staff access to the admin area?`
                    : `Remove ${retailer.name}'s staff access?`
            )
        ) {
            return;
        }

        setBusy(true);
        setError('');
        try {
            await adminSetRole(retailer.id, next);
            setRetailer((r) => ({ ...r, is_admin: next }));
        } catch (err) {
            setError(generalError(err, 'Could not change that account.'));
        } finally {
            setBusy(false);
        }
    };

    const spend = retailer?.orders.reduce((sum, o) => sum + o.total, 0) ?? 0;
    const sets = retailer?.orders.reduce((sum, o) => sum + o.total_sets, 0) ?? 0;

    return (
        <div>
            <Helmet>
                <title>{`Admin — ${retailer?.company ?? 'Retailer'}`}</title>
            </Helmet>

            <Link
                to="/admin/retailers"
                className="inline-flex items-center gap-1.5 font-label text-[10px] uppercase tracking-[0.14em] text-foreground/55 hover:text-foreground"
            >
                <ArrowLeft className="h-3 w-3" /> All retailers
            </Link>

            {error && (
                <p className="mt-4 border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                </p>
            )}

            {!retailer && !error && (
                <p className="mt-6 font-label text-[11px] uppercase tracking-[0.16em] text-foreground/50">Loading…</p>
            )}

            {retailer && (
                <>
                    <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
                        <div>
                            <h2 className="font-display text-4xl font-black tracking-tight">
                                {retailer.company || retailer.name}
                            </h2>
                            <p className="mt-2 font-label text-[10px] uppercase tracking-[0.16em] text-foreground/55">
                                {retailer.name} • {retailer.email} • joined {formatDate(retailer.joined_at)}
                            </p>
                        </div>
                        <button onClick={toggleRole} disabled={busy} className={ghostButtonClass}>
                            {retailer.is_admin ? (
                                <>
                                    <ShieldOff className="h-3.5 w-3.5" /> Revoke staff access
                                </>
                            ) : (
                                <>
                                    <ShieldCheck className="h-3.5 w-3.5" /> Make staff
                                </>
                            )}
                        </button>
                    </div>

                    <div className="mt-8 grid gap-4 sm:grid-cols-3">
                        {[
                            { label: 'Orders', value: retailer.orders.length },
                            { label: 'Sets ordered', value: sets },
                            { label: 'Order value', value: inr(spend) },
                        ].map((stat) => (
                            <div key={stat.label} className="border border-foreground/50 bg-card p-5">
                                <p className="font-label text-[10px] uppercase tracking-[0.16em] text-foreground/55">
                                    {stat.label}
                                </p>
                                <p className="mt-2 font-display text-3xl font-black">{stat.value}</p>
                            </div>
                        ))}
                    </div>

                    <h3 className="mt-10 font-label text-[11px] font-semibold uppercase tracking-[0.2em]">
                        Orders
                    </h3>
                    {retailer.orders.length === 0 ? (
                        <p className="mt-4 border border-foreground/40 p-8 text-center text-sm text-foreground/60">
                            This account has not ordered yet.
                        </p>
                    ) : (
                        <div className="mt-4 overflow-x-auto border-y border-foreground/60">
                            <table className="w-full min-w-[36rem] text-left">
                                <thead>
                                    <tr className="border-b border-foreground/30 font-label text-[10px] uppercase tracking-[0.16em] text-foreground/55">
                                        <th className="py-3 pr-4 font-normal">Order</th>
                                        <th className="py-3 pr-4 font-normal">Placed</th>
                                        <th className="py-3 pr-4 font-normal">Sets</th>
                                        <th className="py-3 pr-4 font-normal">Stage</th>
                                        <th className="py-3 pr-4 text-right font-normal">Total</th>
                                        <th className="py-3" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {retailer.orders.map((order) => (
                                        <tr key={order.code} className="border-b border-foreground/20 last:border-b-0">
                                            <td className="py-4 pr-4 font-label text-sm font-semibold tracking-[0.08em]">
                                                {order.code}
                                            </td>
                                            <td className="py-4 pr-4 text-sm text-foreground/70">
                                                {formatDate(order.placed_at)}
                                            </td>
                                            <td className="py-4 pr-4 text-sm text-foreground/70">{order.total_sets}</td>
                                            <td className="py-4 pr-4">
                                                <span className="border border-foreground/50 px-2 py-1 font-label text-[10px] uppercase tracking-[0.1em]">
                                                    {order.status_label}
                                                </span>
                                            </td>
                                            <td className="py-4 pr-4 text-right font-display text-lg font-black">
                                                {inr(order.total)}
                                            </td>
                                            <td className="py-4 text-right">
                                                <Link
                                                    to={`/admin/orders/${order.code}`}
                                                    className="inline-flex items-center gap-1 font-label text-[10px] uppercase tracking-[0.14em] underline underline-offset-4"
                                                >
                                                    Open <ArrowRight className="h-3 w-3" />
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <h3 className="mt-10 font-label text-[11px] font-semibold uppercase tracking-[0.2em]">
                        Billing &amp; payment
                    </h3>
                    {(() => {
                        const profile = retailer.payment_profile;
                        // Every field is optional, so a row is only worth
                        // drawing if the retailer actually filled it in.
                        const rows = profile
                            ? [
                                  ['Registered name', profile.legal_name],
                                  ['GSTIN', profile.gstin],
                                  ['PAN', profile.pan],
                                  ['Pays by', profile.method_label],
                                  ['UPI ID', profile.upi_id],
                                  ['Account name', profile.bank_account_name],
                                  ['Account number', profile.bank_account_number],
                                  ['IFSC', profile.bank_ifsc],
                                  ['Bank', profile.bank_name],
                              ].filter(([, value]) => value)
                            : [];

                        if (rows.length === 0) {
                            return (
                                <p className="mt-4 border border-foreground/40 p-8 text-center text-sm text-foreground/60">
                                    Nothing saved yet — ask for the GSTIN before raising an invoice.
                                </p>
                            );
                        }

                        return (
                            <div className={`${cardClass} mt-4`}>
                                <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
                                    {rows.map(([term, value]) => (
                                        <div key={term}>
                                            <dt className="font-label text-[10px] uppercase tracking-[0.14em] text-foreground/55">
                                                {term}
                                            </dt>
                                            <dd className="mt-1 break-all font-label font-semibold">{value}</dd>
                                        </div>
                                    ))}
                                </dl>
                            </div>
                        );
                    })()}

                    <h3 className="mt-10 font-label text-[11px] font-semibold uppercase tracking-[0.2em]">
                        Saved addresses
                    </h3>
                    {retailer.addresses.length === 0 ? (
                        <p className="mt-4 border border-foreground/40 p-8 text-center text-sm text-foreground/60">
                            No addresses saved — confirm dispatch details on WhatsApp.
                        </p>
                    ) : (
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            {retailer.addresses.map((address) => (
                                <div key={address.id} className={cardClass}>
                                    <div className="flex items-start justify-between gap-3">
                                        <p className="font-label text-[10px] uppercase tracking-[0.16em] text-foreground/55">
                                            {address.label}
                                        </p>
                                        {address.is_default && (
                                            <span className="bg-accent px-2 py-0.5 font-label text-[9px] uppercase tracking-[0.12em] text-accent-foreground">
                                                Default
                                            </span>
                                        )}
                                    </div>
                                    <address className="mt-3 not-italic text-sm leading-relaxed text-foreground/75">
                                        {address.contact_name} • {address.phone}
                                        <br />
                                        {address.line1}
                                        {address.line2 ? <>, {address.line2}</> : null}
                                        <br />
                                        {address.city}, {address.state} {address.pincode}
                                        {address.gstin ? (
                                            <>
                                                <br />
                                                GSTIN {address.gstin}
                                            </>
                                        ) : null}
                                    </address>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default AdminRetailerDetailPage;
