import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';

const LINKS = [
    { to: '/catalog', label: 'Catalog' },
    { to: '/rate-card', label: 'Rate Card' },
    { to: '/tracking', label: 'Track Order' },
    { to: '/', label: 'Home' },
];

const NotFoundPage = () => (
    <div className="relative">
        <Helmet>
            <title>Page not found — J.J. Serow Clothing Co.</title>
            <meta name="description" content="That page does not exist on the J.J. Serow wholesale storefront." />
            <meta name="robots" content="noindex" />
        </Helmet>

        <span className="vertical-label absolute left-1 top-24 hidden font-label text-[10px] uppercase tracking-[0.35em] text-foreground/40 lg:block">
            404 — not found
        </span>

        <div className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-8">
            <p className="font-label text-[10px] uppercase tracking-[0.3em] text-foreground/60">Error 404</p>
            <h1 className="mt-4 font-display text-6xl font-black tracking-tight">Page not found</h1>
            <p className="mt-5 text-sm leading-relaxed text-foreground/70">
                That address does not exist. It may have been a mistyped link, or a style that has left the
                catalog.
            </p>

            <div className="mt-10 flex flex-wrap justify-center gap-3">
                {LINKS.map((link) => (
                    <Link
                        key={link.to}
                        to={link.to}
                        className="flex h-12 items-center border border-foreground/60 px-5 font-label text-[11px] uppercase tracking-[0.14em] transition-colors hover:bg-secondary"
                    >
                        {link.label}
                    </Link>
                ))}
            </div>
        </div>
    </div>
);

export default NotFoundPage;
