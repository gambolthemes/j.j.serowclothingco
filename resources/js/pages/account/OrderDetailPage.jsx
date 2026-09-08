import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { ArrowLeft, FileText, XCircle } from 'lucide-react';
import { cancelOrder, formatDate, generalError, getOrder } from '@/lib/api';
import { GST_LABEL, LEAD_LABEL, inr, ratioLabel } from '@/lib/pricing';
import { cardClass } from '@/components/account/ui';
import PayNow from '@/components/account/PayNow';

const OrderDetailPage = () => {
    const { code } = useParams();
    const [order, setOrder] = useState(null);
    const [error, setError] = useState('');
    const [cancelling, setCancelling] = useState(false);

    // Also used after a payment settles: the status, the history and whether
    // the pay buttons still apply all change together, and only the server
    // knows which of them did.
    const refresh = useCallback(
        () =>
            getOrder(code)
                .then(setOrder)
                .catch(() => setError('That order is not on your account.')),
        [code]
    );

    useEffect(() => {
        setOrder(null);
        setError('');
        refresh();
    }, [refresh]);

    const cancel = async () => {
        if (!window.confirm(`Cancel order ${code}? This cannot be undone here.`)) return;

        setCancelling(true);
        setError('');
        try {
            await cancelOrder(code);
            // Refetched because cancelling also flips can_cancel and adds a
            // history row that the cancel response does not carry.
            await refresh();
        } catch (err) {
            setError(generalError(err, 'Could not cancel that order.'));
        } finally {
            setCancelling(false);
        }
    };

    const address = order?.shipping_address;

    return (
        <div>
            <Helmet>
                <title>{`Order ${code} — J.J. Serow Clothing Co.`}</title>
                <meta name="description" content={`Line items, totals and production status for bulk order ${code}.`} />
            </Helmet>

            <Link
                to="/account/orders"
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
                                Placed {formatDate(order.placed_at)} • {order.total_sets} sets
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="border border-foreground px-3 py-2 font-label text-[10px] uppercase tracking-[0.12em]">
                                {order.status_label}
                            </span>
                            <Link
                                to={`/tracking?code=${order.code}`}
                                className="font-label text-[10px] uppercase tracking-[0.14em] underline underline-offset-4"
                            >
                                Track
                            </Link>
                            <Link
                                to={`/account/orders/${order.code}/invoice`}
                                className="flex items-center gap-1.5 font-label text-[10px] uppercase tracking-[0.14em] underline underline-offset-4"
                            >
                                <FileText className="h-3 w-3" /> Invoice
                            </Link>
                            {order.can_cancel && (
                                <button
                                    onClick={cancel}
                                    disabled={cancelling}
                                    className="flex items-center gap-1.5 font-label text-[10px] uppercase tracking-[0.14em] text-foreground/55 underline underline-offset-4 hover:text-destructive disabled:opacity-50"
                                >
                                    <XCircle className="h-3 w-3" /> {cancelling ? 'Cancelling…' : 'Cancel order'}
                                </button>
                            )}
                        </div>
                    </div>

                    <PayNow order={order} onPaid={refresh} />

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
                                    No address was saved on this order. Add one under{' '}
                                    <Link to="/account/addresses" className="underline underline-offset-4">
                                        Addresses
                                    </Link>{' '}
                                    so future orders carry it.
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
                                    <span className="text-foreground/70">{GST_LABEL}</span>
                                    <span className="font-label font-semibold">{inr(order.gst)}</span>
                                </div>
                                <div className="flex justify-between border-t border-foreground/40 pt-3">
                                    <span className="font-medium">Total</span>
                                    <span className="font-display text-2xl font-black">{inr(order.total)}</span>
                                </div>
                            </div>
                            <p className="mt-3 font-label text-[10px] uppercase tracking-[0.14em] text-foreground/50">
                                100% advance • {LEAD_LABEL} estimate
                            </p>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default OrderDetailPage;
