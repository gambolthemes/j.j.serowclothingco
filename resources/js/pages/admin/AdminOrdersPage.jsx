import React, { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { ArrowRight, Search } from 'lucide-react';
import { ORDER_STATUSES, adminListOrders, adminUpdateOrderStatus, formatDate } from '@/lib/api';
import { inr } from '@/lib/pricing';

const AdminOrdersPage = () => {
    const [params, setParams] = useSearchParams();
    const status = params.get('status') ?? '';
    const q = params.get('q') ?? '';
    const page = Number(params.get('page') ?? 1);

    const [search, setSearch] = useState(q);
    const [orders, setOrders] = useState(null);
    const [meta, setMeta] = useState(null);
    const [error, setError] = useState('');
    const [savingCode, setSavingCode] = useState('');

    const load = useCallback(() => {
        setError('');
        adminListOrders({ status: status || undefined, q: q || undefined, page })
            .then((data) => {
                setOrders(data.orders);
                setMeta(data.meta);
            })
            .catch(() => setError('Could not load orders.'));
    }, [status, q, page]);

    useEffect(load, [load]);
    useEffect(() => setSearch(q), [q]);

    // Every filter change resets to page 1 — page 4 of the old filter is meaningless.
    const setFilter = (patch) => {
        const next = { status, q, ...patch };
        const clean = Object.fromEntries(Object.entries(next).filter(([, v]) => v));
        setParams(clean);
    };

    const changeStatus = async (code, nextStatus) => {
        setSavingCode(code);
        try {
            await adminUpdateOrderStatus(code, { status: nextStatus });
            load();
        } catch {
            setError(`Could not move ${code} to that stage.`);
        } finally {
            setSavingCode('');
        }
    };

    return (
        <div>
            <Helmet>
                <title>Admin Orders — J.J. Serow Clothing Co.</title>
            </Helmet>

            <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="font-label text-[11px] font-semibold uppercase tracking-[0.2em]">
                    All orders{meta ? ` (${meta.total})` : ''}
                </h2>

                <div className="flex flex-wrap gap-2">
                    <select
                        value={status}
                        onChange={(e) => setFilter({ status: e.target.value })}
                        className="h-11 border border-foreground/60 bg-transparent px-2 font-label text-[11px] uppercase tracking-[0.12em] focus:outline-none focus:ring-1 focus:ring-foreground"
                    >
                        <option value="">All stages</option>
                        {ORDER_STATUSES.map((s) => (
                            <option key={s.value} value={s.value}>
                                {s.label}
                            </option>
                        ))}
                    </select>

                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            setFilter({ q: search.trim() });
                        }}
                        className="flex gap-2"
                    >
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Code, company, buyer…"
                            className="h-11 w-56 border border-foreground/60 bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
                        />
                        <button
                            type="submit"
                            className="flex h-11 items-center gap-2 border border-foreground/60 px-3 font-label text-[11px] uppercase tracking-[0.12em] hover:bg-secondary"
                        >
                            <Search className="h-3.5 w-3.5" />
                        </button>
                    </form>
                </div>
            </div>

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
                <p className="mt-6 border border-foreground/40 p-10 text-center text-sm text-foreground/60">
                    No orders match that filter.
                </p>
            )}

            {orders?.length > 0 && (
                <div className="mt-6 overflow-x-auto border-y border-foreground/60">
                    <table className="w-full min-w-[56rem] text-left">
                        <thead>
                            <tr className="border-b border-foreground/30 font-label text-[10px] uppercase tracking-[0.16em] text-foreground/55">
                                <th className="py-3 pr-4 font-normal">Order</th>
                                <th className="py-3 pr-4 font-normal">Retailer</th>
                                <th className="py-3 pr-4 font-normal">Placed</th>
                                <th className="py-3 pr-4 font-normal">Sets</th>
                                <th className="py-3 pr-4 text-right font-normal">Total</th>
                                <th className="py-3 pr-4 font-normal">Stage</th>
                                <th className="py-3" />
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map((order) => (
                                <tr key={order.code} className="border-b border-foreground/20 last:border-b-0">
                                    <td className="py-4 pr-4 font-label text-sm font-semibold tracking-[0.08em]">
                                        {order.code}
                                    </td>
                                    <td className="py-4 pr-4">
                                        <p className="text-sm font-medium">{order.retailer?.company ?? '—'}</p>
                                        <p className="font-label text-[10px] uppercase tracking-[0.12em] text-foreground/50">
                                            {order.retailer?.name}
                                        </p>
                                    </td>
                                    <td className="py-4 pr-4 text-sm text-foreground/70">
                                        {formatDate(order.placed_at)}
                                    </td>
                                    <td className="py-4 pr-4 text-sm text-foreground/70">{order.total_sets}</td>
                                    <td className="py-4 pr-4 text-right font-display text-lg font-black">
                                        {inr(order.total)}
                                    </td>
                                    <td className="py-4 pr-4">
                                        <select
                                            value={order.status}
                                            disabled={savingCode === order.code}
                                            onChange={(e) => changeStatus(order.code, e.target.value)}
                                            className="h-9 border border-foreground/60 bg-transparent px-2 font-label text-[10px] uppercase tracking-[0.12em] focus:outline-none focus:ring-1 focus:ring-foreground disabled:opacity-50"
                                        >
                                            {ORDER_STATUSES.map((s) => (
                                                <option key={s.value} value={s.value}>
                                                    {s.label}
                                                </option>
                                            ))}
                                        </select>
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

            {meta && meta.last_page > 1 && (
                <div className="mt-6 flex items-center gap-4 font-label text-[10px] uppercase tracking-[0.14em]">
                    <button
                        disabled={meta.current_page <= 1}
                        onClick={() => setParams({ ...(status && { status }), ...(q && { q }), page: meta.current_page - 1 })}
                        className="border border-foreground/50 px-3 py-2 disabled:opacity-40"
                    >
                        Previous
                    </button>
                    <span className="text-foreground/55">
                        Page {meta.current_page} of {meta.last_page}
                    </span>
                    <button
                        disabled={meta.current_page >= meta.last_page}
                        onClick={() => setParams({ ...(status && { status }), ...(q && { q }), page: meta.current_page + 1 })}
                        className="border border-foreground/50 px-3 py-2 disabled:opacity-40"
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
};

export default AdminOrdersPage;
