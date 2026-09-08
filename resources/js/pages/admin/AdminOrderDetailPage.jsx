import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { ArrowLeft, Check } from 'lucide-react';
import { ORDER_STATUSES, adminGetOrder, adminUpdateOrderStatus, formatDate } from '@/lib/api';
import { inr, ratioLabel } from '@/lib/pricing';
import { cardClass, fieldClass, labelClass, primaryButtonClass } from '@/components/account/ui';

const AdminOrderDetailPage = () => {
    const { code } = useParams();
    const [order, setOrder] = useState(null);
    const [error, setError] = useState('');
    const [status, setStatus] = useState('');
    const [notes, setNotes] = useState('');
    const [saved, setSaved] = useState(false);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        setOrder(null);
        setError('');
        adminGetOrder(code)
            .then((data) => {
                setOrder(data);
                setStatus(data.status);
                setNotes(data.notes ?? '');
            })
            .catch(() => setError('No order with that code.'));
    }, [code]);

    const save = async (e) => {
        e.preventDefault();
        setBusy(true);
        setSaved(false);
        try {
            const updated = await adminUpdateOrderStatus(code, { status, notes });
            setOrder((prev) => ({ ...prev, ...updated }));
            setSaved(true);
        } catch {
            setError('Could not save that change.');
        } finally {
            setBusy(false);
        }
    };

    const address = order?.shipping_address;

    return (
        <div>
            <Helmet>
                <title>{`Admin — Order ${code}`}</title>
            </Helmet>

            <Link
                to="/admin/orders"
                className="inline-flex items-center gap-1.5 font-label text-[10px] uppercase tracking-[0.14em] text-foreground/55 hover:text-foreground"
            >
                <ArrowLeft className="h-3 w-3" /> All orders
            </Link>

            {error && (
                <p className="mt-4 border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                </p>
            )}

            {!order && !error && (
                <p className="mt-6 font-label text-[11px] uppercase tracking-[0.16em] text-foreground/50">
                    Loading…
                </p>
            )}

            {order && (
                <>
                    <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
                        <div>
                            <h2 className="font-display text-4xl font-black tracking-tight">{order.code}</h2>
                            <p className="mt-2 font-label text-[10px] uppercase tracking-[0.16em] text-foreground/55">
                                {order.retailer?.company} • {order.retailer?.name} • {order.retailer?.email}
                            </p>
                            <p className="mt-1 font-label text-[10px] uppercase tracking-[0.16em] text-foreground/55">
                                Placed {formatDate(order.placed_at)} • {order.total_sets} sets •{' '}
                                {inr(order.total)}
                            </p>
                        </div>
                        <span className="border border-foreground px-3 py-2 font-label text-[10px] uppercase tracking-[0.12em]">
                            {order.status_label}
                        </span>
                    </div>

                    <form onSubmit={save} className={`${cardClass} mt-8`}>
                        <h3 className="font-label text-[11px] font-semibold uppercase tracking-[0.2em]">
                            Production stage
                        </h3>
                        <p className="mt-2 text-sm text-foreground/60">
                            Whatever you set here is what the retailer sees on /tracking.
                        </p>

                        <div className="mt-5 grid gap-4 sm:grid-cols-2">
                            <label className="block">
                                <span className={labelClass}>Stage</span>
                                <select
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                    className={fieldClass}
                                >
                                    {ORDER_STATUSES.map((s) => (
                                        <option key={s.value} value={s.value}>
                                            {s.label}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="block">
                                <span className={labelClass}>Internal note (optional)</span>
                                <input
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className={fieldClass}
                                    placeholder="Fabric delayed, split dispatch…"
                                />
                            </label>
                        </div>

                        <div className="mt-6 flex flex-wrap items-center gap-4">
                            <button type="submit" disabled={busy} className={primaryButtonClass}>
                                {busy ? 'Saving…' : 'Save stage'}
                            </button>
                            {saved && (
                                <p className="flex items-center gap-2 font-label text-[10px] uppercase tracking-[0.14em] text-foreground/60">
                                    <Check className="h-3.5 w-3.5" /> Saved
                                </p>
                            )}
                        </div>
                    </form>

                    <div className="mt-8 overflow-x-auto border-y border-foreground/60">
                        <table className="w-full min-w-[40rem] text-left">
                            <thead>
                                <tr className="border-b border-foreground/30 font-label text-[10px] uppercase tracking-[0.16em] text-foreground/55">
                                    <th className="py-3 pr-4 font-normal">Style</th>
                                    <th className="py-3 pr-4 font-normal">Colour</th>
                                    <th className="py-3 pr-4 font-normal">Ratio</th>
                                    <th className="py-3 pr-4 font-normal">Sets</th>
                                    <th className="py-3 pr-4 text-right font-normal">Per set</th>
                                    <th className="py-3 text-right font-normal">Line total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {order.items.map((item) => (
                                    <tr key={item.id} className="border-b border-foreground/20 last:border-b-0">
                                        <td className="py-4 pr-4">
                                            <p className="font-display text-base font-bold">{item.product_name}</p>
                                            {(item.private_label || item.sample) && (
                                                <p className="mt-1 font-label text-[10px] uppercase tracking-[0.12em] text-foreground/50">
                                                    {item.private_label ? 'private label' : ''}
                                                    {item.private_label && item.sample ? ' • ' : ''}
                                                    {item.sample ? '+sample set' : ''}
                                                </p>
                                            )}
                                        </td>
                                        <td className="py-4 pr-4 text-sm text-foreground/70">{item.color_name}</td>
                                        <td className="py-4 pr-4 font-label text-[11px] tracking-[0.08em] text-foreground/70">
                                            {ratioLabel(item.ratio)}
                                        </td>
                                        <td className="py-4 pr-4 text-sm text-foreground/70">{item.sets}</td>
                                        <td className="py-4 pr-4 text-right text-sm text-foreground/70">
                                            {inr(item.per_set_price)}
                                        </td>
                                        <td className="py-4 text-right font-display text-lg font-black">
                                            {inr(item.line_total)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-8 grid gap-6 lg:grid-cols-2">
                        <div className={cardClass}>
                            <h3 className="font-label text-[11px] font-semibold uppercase tracking-[0.2em]">
                                Ships to
                            </h3>
                            {address ? (
                                <address className="mt-3 not-italic text-sm leading-relaxed text-foreground/75">
                                    <span className="font-label text-[10px] uppercase tracking-[0.16em] text-foreground/55">
                                        {address.label}
                                    </span>
                                    <br />
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
                            ) : (
                                <p className="mt-3 text-sm text-foreground/60">
                                    The retailer had no address saved when they placed this. Confirm it on WhatsApp
                                    before dispatch.
                                </p>
                            )}
                        </div>

                        <div className={cardClass}>
                            <h3 className="font-label text-[11px] font-semibold uppercase tracking-[0.2em]">
                                Invoice
                            </h3>
                            <div className="mt-4 space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-foreground/70">Subtotal</span>
                                    <span className="font-label font-semibold">{inr(order.subtotal)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-foreground/70">GST (5%)</span>
                                    <span className="font-label font-semibold">{inr(order.gst)}</span>
                                </div>
                                <div className="flex justify-between border-t border-foreground/40 pt-3">
                                    <span className="font-medium">Total</span>
                                    <span className="font-display text-2xl font-black">{inr(order.total)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default AdminOrderDetailPage;
