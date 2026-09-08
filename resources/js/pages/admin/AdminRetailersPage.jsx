import React, { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Search } from 'lucide-react';
import { adminListRetailers, formatDate } from '@/lib/api';
import { inr } from '@/lib/pricing';

const AdminRetailersPage = () => {
    const [params, setParams] = useSearchParams();
    const q = params.get('q') ?? '';
    const page = Number(params.get('page') ?? 1);

    const [search, setSearch] = useState(q);
    const [retailers, setRetailers] = useState(null);
    const [meta, setMeta] = useState(null);
    const [error, setError] = useState('');

    const load = useCallback(() => {
        setError('');
        adminListRetailers({ q: q || undefined, page })
            .then((data) => {
                setRetailers(data.retailers);
                setMeta(data.meta);
            })
            .catch(() => setError('Could not load retailers.'));
    }, [q, page]);

    useEffect(load, [load]);
    useEffect(() => setSearch(q), [q]);

    return (
        <div>
            <Helmet>
                <title>Admin Retailers — J.J. Serow Clothing Co.</title>
            </Helmet>

            <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="font-label text-[11px] font-semibold uppercase tracking-[0.2em]">
                    Registered retailers{meta ? ` (${meta.total})` : ''}
                </h2>

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        setParams(search.trim() ? { q: search.trim() } : {});
                    }}
                    className="flex gap-2"
                >
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Company, buyer, email…"
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

            {error && (
                <p className="mt-4 border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                </p>
            )}

            {retailers === null && !error && (
                <p className="mt-6 font-label text-[11px] uppercase tracking-[0.16em] text-foreground/50">
                    Loading…
                </p>
            )}

            {retailers?.length === 0 && (
                <p className="mt-6 border border-foreground/40 p-10 text-center text-sm text-foreground/60">
                    No retailers match that search.
                </p>
            )}

            {retailers?.length > 0 && (
                <div className="mt-6 overflow-x-auto border-y border-foreground/60">
                    <table className="w-full min-w-[48rem] text-left">
                        <thead>
                            <tr className="border-b border-foreground/30 font-label text-[10px] uppercase tracking-[0.16em] text-foreground/55">
                                <th className="py-3 pr-4 font-normal">Company</th>
                                <th className="py-3 pr-4 font-normal">Buyer</th>
                                <th className="py-3 pr-4 font-normal">Joined</th>
                                <th className="py-3 pr-4 font-normal">Orders</th>
                                <th className="py-3 pr-4 font-normal">Sets</th>
                                <th className="py-3 pr-4 text-right font-normal">Value</th>
                                <th className="py-3" />
                            </tr>
                        </thead>
                        <tbody>
                            {retailers.map((retailer) => (
                                <tr key={retailer.id} className="border-b border-foreground/20 last:border-b-0">
                                    <td className="py-4 pr-4 text-sm font-medium">{retailer.company ?? '—'}</td>
                                    <td className="py-4 pr-4">
                                        <p className="text-sm text-foreground/80">{retailer.name}</p>
                                        <p className="font-label text-[10px] tracking-[0.08em] text-foreground/50">
                                            {retailer.email}
                                        </p>
                                    </td>
                                    <td className="py-4 pr-4 text-sm text-foreground/70">
                                        {formatDate(retailer.joined_at)}
                                    </td>
                                    <td className="py-4 pr-4 text-sm text-foreground/70">
                                        {retailer.orders_count}
                                    </td>
                                    <td className="py-4 pr-4 text-sm text-foreground/70">
                                        {retailer.orders_sets}
                                    </td>
                                    <td className="py-4 pr-4 text-right font-display text-lg font-black">
                                        {inr(retailer.orders_value)}
                                    </td>
                                    <td className="py-4 text-right">
                                        {retailer.orders_count > 0 && (
                                            <Link
                                                to={`/admin/orders?q=${encodeURIComponent(retailer.email)}`}
                                                className="font-label text-[10px] uppercase tracking-[0.14em] underline underline-offset-4"
                                            >
                                                Orders
                                            </Link>
                                        )}
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
                        onClick={() => setParams({ ...(q && { q }), page: meta.current_page - 1 })}
                        className="border border-foreground/50 px-3 py-2 disabled:opacity-40"
                    >
                        Previous
                    </button>
                    <span className="text-foreground/55">
                        Page {meta.current_page} of {meta.last_page}
                    </span>
                    <button
                        disabled={meta.current_page >= meta.last_page}
                        onClick={() => setParams({ ...(q && { q }), page: meta.current_page + 1 })}
                        className="border border-foreground/50 px-3 py-2 disabled:opacity-40"
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
};

export default AdminRetailersPage;
