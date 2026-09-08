import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const LINKS = [
    { to: '/account', label: 'Overview', end: true },
    { to: '/account/orders', label: 'Orders' },
    { to: '/account/addresses', label: 'Addresses' },
    { to: '/account/password', label: 'Password' },
];

const AccountLayout = () => {
    const { user } = useAuth();

    const linkClass = ({ isActive }) =>
        `border-b border-foreground/20 px-3 py-3 font-label text-[11px] uppercase tracking-[0.16em] transition-colors lg:border-b-0 lg:border-l-2 ${
            isActive
                ? 'bg-secondary text-foreground lg:border-l-foreground'
                : 'text-foreground/55 hover:text-foreground lg:border-l-transparent'
        }`;

    return (
        <div className="relative">
            <span className="vertical-label absolute left-1 top-24 hidden font-label text-[10px] uppercase tracking-[0.35em] text-foreground/40 lg:block">
                My account
            </span>

            <div className="mx-auto max-w-[90rem] px-4 py-14 sm:px-8">
                <p className="font-label text-[10px] uppercase tracking-[0.3em] text-foreground/60">
                    Retailer account
                </p>
                <h1 className="mt-4 font-display text-5xl font-black tracking-tight">
                    {user?.company || 'My Account'}
                </h1>
                <p className="mt-3 font-label text-[10px] uppercase tracking-[0.16em] text-foreground/55">
                    {user?.name}
                    {user?.email ? ` • ${user.email}` : ''}
                </p>

                <div className="mt-10 grid gap-8 lg:grid-cols-12 lg:gap-12">
                    <aside className="lg:col-span-3">
                        <nav className="flex flex-col border-t border-foreground/20 lg:border-t-0">
                            {LINKS.map((link) => (
                                <NavLink key={link.to} to={link.to} end={link.end} className={linkClass}>
                                    {link.label}
                                </NavLink>
                            ))}
                        </nav>
                    </aside>

                    <div className="lg:col-span-9">
                        <Outlet />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AccountLayout;
