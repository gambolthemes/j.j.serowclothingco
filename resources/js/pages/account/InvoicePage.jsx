import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { ArrowLeft, Printer } from 'lucide-react';
import { LOGO_LOCKUP_URL } from '@/data/products';
import { formatDate, getOrder } from '@/lib/api';
import { COMPANY_EMAIL, COMPANY_LOCATION, GST_LABEL, inr, ratioLabel } from '@/lib/pricing';
import { useAuth } from '@/contexts/AuthContext';

/**
 * The GST invoice the rest of the site keeps promising. Built as a print
 * stylesheet rather than a generated PDF — the browser's own "Save as PDF"
 * gives the retailer a file without pulling a PDF library into the bundle.
 */
const InvoicePage = () => {
    const { code } = useParams();
    const { user } = useAuth();
    const [order, setOrder] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        getOrder(code)
            .then(setOrder)
            .catch(() => setError('That order is not on your account.'));
    }, [code]);

    const address = order?.shipping_address;

    return (
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-8 print:max-w-none print:px-0 print:py-0">
            <Helmet>
                <title>{`Invoice ${code} — J.J. Serow Clothing Co.`}</title>
                <meta name="robots" content="noindex" />
            </Helmet>

            <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
                <Link
                    to={`/account/orders/${code}`}
                    className="inline-flex items-center gap-1.5 font-label text-[10px] uppercase tracking-[0.14em] text-foreground/55 hover:text-foreground"
                >
                    <ArrowLeft className="h-3 w-3" /> Back to order
                </Link>
                <button
                    onClick={() => window.print()}
                    className="flex h-11 items-center gap-2 bg-foreground px-5 font-label text-[11px] font-semibold uppercase tracking-[0.16em] text-background"
                >
                    <Printer className="h-4 w-4" /> Print / Save as PDF
                </button>
            </div>

            {error && (
                <p className="mt-6 border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                </p>
            )}

            {!order && !error && (
                <p className="mt-6 font-label text-[11px] uppercase tracking-[0.16em] text-foreground/50">Loading…</p>
            )}

            {order && (
                <article className="mt-6 border border-foreground bg-card p-8 print:mt-0 print:border-0 print:bg-transparent print:p-0">
                    <header className="flex flex-wrap items-start justify-between gap-6 border-b border-foreground pb-6">
                        <div>
                            <img src={LOGO_LOCKUP_URL} alt="J.J. Serow Clothing Co." className="h-12 w-auto" />
                            <p className="mt-4 text-sm leading-relaxed text-foreground/75">
                                {COMPANY_LOCATION}
                                <br />
                                {COMPANY_EMAIL}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="font-label text-[10px] uppercase tracking-[0.25em] text-foreground/55">
                                Tax Invoice
                            </p>
                            <p className="mt-2 font-display text-3xl font-black">{order.code}</p>
                            <p className="mt-2 font-label text-[10px] uppercase tracking-[0.14em] text-foreground/55">
                                {formatDate(order.placed_at)}
                            </p>
                        </div>
                    </header>

                    <div className="grid gap-8 border-b border-foreground/40 py-6 sm:grid-cols-2">
                        <div>
                            <p className="font-label text-[10px] uppercase tracking-[0.2em] text-foreground/55">
                                Billed to
                            </p>
                            <p className="mt-2 font-display text-lg font-bold">{user?.company}</p>
                            <p className="text-sm text-foreground/75">
                                {user?.name}
                                <br />
                                {user?.email}
                            </p>
                        </div>
                        <div>
                            <p className="font-label text-[10px] uppercase tracking-[0.2em] text-foreground/55">
                                Shipped to
                            </p>
                            {address ? (
                                <address className="mt-2 not-italic text-sm leading-relaxed text-foreground/75">
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
                                <p className="mt-2 text-sm text-foreground/60">
                                    Confirmed on WhatsApp — no saved address on this order.
                                </p>
                            )}
                        </div>
                    </div>

                    <table className="mt-6 w-full text-left">
                        <thead>
                            <tr className="border-b border-foreground/40 font-label text-[10px] uppercase tracking-[0.16em] text-foreground/55">
                                <th className="py-3 pr-3 font-normal">Style</th>
                                <th className="py-3 pr-3 font-normal">Colour</th>
                                <th className="py-3 pr-3 font-normal">Ratio</th>
                                <th className="py-3 pr-3 text-right font-normal">Sets</th>
                                <th className="py-3 pr-3 text-right font-normal">Rate / set</th>
                                <th className="py-3 text-right font-normal">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {order.items.map((item) => (
                                <tr key={item.id} className="border-b border-foreground/20">
                                    <td className="py-3 pr-3 text-sm">
                                        {item.product_name}
                                        {(item.private_label || item.sample) && (
                                            <span className="block font-label text-[10px] uppercase tracking-[0.1em] text-foreground/50">
                                                {item.private_label ? 'private label' : ''}
                                                {item.private_label && item.sample ? ' • ' : ''}
                                                {item.sample ? '+sample set' : ''}
                                            </span>
                                        )}
                                    </td>
                                    <td className="py-3 pr-3 text-sm text-foreground/75">{item.color_name}</td>
                                    <td className="py-3 pr-3 font-label text-[11px] text-foreground/70">
                                        {ratioLabel(item.ratio)}
                                    </td>
                                    <td className="py-3 pr-3 text-right text-sm">{item.sets}</td>
                                    <td className="py-3 pr-3 text-right text-sm">{inr(item.per_set_price)}</td>
                                    <td className="py-3 text-right text-sm font-semibold">{inr(item.line_total)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="mt-6 flex justify-end">
                        <table className="w-full max-w-xs text-sm">
                            <tbody>
                                <tr>
                                    <td className="py-1 text-foreground/70">Subtotal</td>
                                    <td className="py-1 text-right">{inr(order.subtotal)}</td>
                                </tr>
                                <tr>
                                    <td className="py-1 text-foreground/70">{GST_LABEL}</td>
                                    <td className="py-1 text-right">{inr(order.gst)}</td>
                                </tr>
                                <tr className="border-t border-foreground">
                                    <td className="py-2 font-medium">Total</td>
                                    <td className="py-2 text-right font-display text-2xl font-black">
                                        {inr(order.total)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <footer className="mt-8 border-t border-foreground/40 pt-4 font-label text-[10px] uppercase tracking-[0.14em] text-foreground/55">
                        100% advance • Status: {order.status_label} • This is a computer-generated invoice
                    </footer>
                </article>
            )}
        </div>
    );
};

export default InvoicePage;
