import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { adminStats } from '@/lib/api';
import { inr } from '@/lib/pricing';

const AdminDashboardPage = () => {
    const [stats, setStats] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        adminStats()
            .then(setStats)
            .catch(() => setError('Could not load the production summary.'));
    }, []);

    return (
        <div>
            <Helmet>
                <title>Admin Dashboard — J.J. Serow Clothing Co.</title>
            </Helmet>

            {error && (
                <p className="border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                </p>
            )}

            {!stats && !error && (
                <p className="font-label text-[11px] uppercase tracking-[0.16em] text-foreground/50">Loading…</p>
            )}

            {stats && (
                <>
                    <div className="grid gap-4 sm:grid-cols-3">
                        {[
                            { label: 'Orders', value: stats.totals.orders },
                            { label: 'Sets in the book', value: stats.totals.sets },
                            { label: 'Order value', value: inr(stats.totals.value) },
                        ].map((stat) => (
                            <div key={stat.label} className="border border-foreground bg-card p-5">
                                <p className="font-label text-[10px] uppercase tracking-[0.16em] text-foreground/55">
                                    {stat.label}
                                </p>
                                <p className="mt-2 font-display text-3xl font-black">{stat.value}</p>
                            </div>
                        ))}
                    </div>

                    <h2 className="mt-10 font-label text-[11px] font-semibold uppercase tracking-[0.2em]">
                        By stage
                    </h2>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {stats.by_status.map((row) => (
                            <Link
                                key={row.status}
                                to={`/admin/orders?status=${row.status}`}
                                className={`border p-4 transition-colors hover:bg-secondary ${
                                    row.orders > 0 ? 'border-foreground/60' : 'border-foreground/25'
                                }`}
                            >
                                <p className="font-label text-[10px] uppercase tracking-[0.14em] text-foreground/55">
                                    {row.label}
                                </p>
                                <p className="mt-2 font-display text-2xl font-black">{row.orders}</p>
                                <p className="mt-1 font-label text-[10px] uppercase tracking-[0.12em] text-foreground/45">
                                    {row.sets} sets • {inr(row.value)}
                                </p>
                            </Link>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default AdminDashboardPage;
