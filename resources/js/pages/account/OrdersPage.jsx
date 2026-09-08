import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { ArrowRight } from 'lucide-react';
import { formatDate, listOrders } from '@/lib/api';
import { inr } from '@/lib/pricing';

const OrdersPage = () => {
    const [orders, setOrders] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        listOrders()
            .then(setOrders)
            .catch(() => setError('Could not load your orders. Reload the page to try again.'));
    }, []);

    return (
        <div>
            <Helmet>
                <title>Order History — J.J. Serow Clothing Co.</title>
                <meta
                    name="description"
                    content="Every bulk order placed on your J.J. Serow retailer account, with set counts, totals and production status."
                />
            </Helmet>

            <h2 className="font-label text-[11px] font-semibold uppercase tracking-[0.2em]">
                Order history
            </h2>

            {error && (
                <p className="mt-4 border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                </p>
            )}

            {orders === null && !error && (
                <p className="mt-6 font-label text-[11px] uppercase tracking-[0.16em] text-foreground/50">
                    Loading…
                </p>
            )}

            {orders?.length === 0 && (
                <div className="mt-6 border border-foreground/50 p-10 text-center">
                    <p className="font-display text-2xl font-bold">No orders yet.</p>
                    <p className="mt-2 text-sm text-foreground/60">
                        Orders are recorded here the moment you confirm a cart — before the WhatsApp handoff.
                    </p>
                    <Link
                        to="/catalog"
                        className="mt-6 inline-flex h-12 items-center bg-foreground px-6 font-label text-xs font-semibold uppercase tracking-[0.16em] text-background"
                    >
                        Browse catalog
                    </Link>
                </div>
            )}

            {orders?.length > 0 && (
                <div className="mt-6 overflow-x-auto border-y border-foreground/60">
                    <table className="w-full min-w-[44rem] text-left">
                        <thead>
                            <tr className="border-b border-foreground/30 font-label text-[10px] uppercase tracking-[0.16em] text-foreground/55">
                                <th className="py-3 pr-4 font-normal">Order</th>
                                <th className="py-3 pr-4 font-normal">Placed</th>
                                <th className="py-3 pr-4 font-normal">Lines</th>
                                <th className="py-3 pr-4 font-normal">Sets</th>
                                <th className="py-3 pr-4 font-normal">Status</th>
                                <th className="py-3 pr-4 text-right font-normal">Total</th>
                                <th className="py-3" />
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map((order) => (
                                <tr key={order.code} className="border-b border-foreground/20 last:border-b-0">
                                    <td className="py-4 pr-4 font-label text-sm font-semibold tracking-[0.08em]">
                                        {order.code}
                                    </td>
                                    <td className="py-4 pr-4 text-sm text-foreground/70">
                                        {formatDate(order.placed_at)}
                                    </td>
                                    <td className="py-4 pr-4 text-sm text-foreground/70">{order.items_count}</td>
                                    <td className="py-4 pr-4 text-sm text-foreground/70">{order.total_sets}</td>
                                    <td className="py-4 pr-4">
                                        <span className="border border-foreground/50 px-2 py-1 font-label text-[10px] uppercase tracking-[0.12em]">
                                            {order.status_label}
                                        </span>
                                    </td>
                                    <td className="py-4 pr-4 text-right font-display text-xl font-black">
                                        {inr(order.total)}
                                    </td>
                                    <td className="py-4 text-right">
                                        <Link
                                            to={`/account/orders/${order.code}`}
                                            className="inline-flex items-center gap-1 font-label text-[10px] uppercase tracking-[0.14em] underline underline-offset-4"
                                        >
                                            View <ArrowRight className="h-3 w-3" />
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default OrdersPage;
