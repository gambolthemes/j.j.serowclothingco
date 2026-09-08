import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import {
    adminCreateProduct,
    adminDeleteProduct,
    adminListProducts,
    adminUpdateProduct,
    fieldErrors,
    generalError,
} from '@/lib/api';
import { inr } from '@/lib/pricing';
import ImageField from '@/components/admin/ImageField';
import {
    cardClass,
    errorClass,
    fieldClass,
    ghostButtonClass,
    labelClass,
    primaryButtonClass,
} from '@/components/account/ui';

const EMPTY = {
    name: '',
    slug: '',
    category: 'shirts',
    fabric: '',
    image: '',
    price_mod: 0,
    blurb: '',
    is_active: true,
    stock: {},
};

const STOCK_LABELS = {
    in_stock: 'In stock',
    made_to_order: 'Made to order',
    out_of_stock: 'Out of stock',
};

const AdminProductsPage = () => {
    const [data, setData] = useState(null);
    const [editing, setEditing] = useState(null); // null | 'new' | product id
    const [form, setForm] = useState(EMPTY);
    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);

    const load = () => adminListProducts().then(setData);

    useEffect(() => {
        load().catch(() => setMessage('Could not load the catalog.'));
    }, []);

    const set = (key) => (e) =>
        setForm((f) => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

    const setStock = (colorName, status) =>
        setForm((f) => ({ ...f, stock: { ...f.stock, [colorName]: status } }));

    const openNew = () => {
        const stock = Object.fromEntries((data?.colors ?? []).map((c) => [c.name, 'in_stock']));
        setForm({ ...EMPTY, stock });
        setErrors({});
        setEditing('new');
    };

    const openEdit = (product) => {
        setForm({ ...EMPTY, ...product, stock: { ...product.stock } });
        setErrors({});
        setEditing(product.id);
    };

    const close = () => {
        setEditing(null);
        setErrors({});
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        setErrors({});
        setMessage('');
        setBusy(true);
        try {
            const payload = { ...form, price_mod: Number(form.price_mod) };
            if (editing === 'new') await adminCreateProduct(payload);
            else await adminUpdateProduct(editing, payload);
            await load();
            close();
        } catch (err) {
            const fields = fieldErrors(err);
            setErrors(fields);
            if (!Object.keys(fields).length) setMessage(generalError(err, 'Could not save that product.'));
        } finally {
            setBusy(false);
        }
    };

    const remove = async (product) => {
        if (
            !window.confirm(
                `Delete "${product.name}"? Past orders keep their copy, but it disappears from the catalog.`
            )
        ) {
            return;
        }
        await adminDeleteProduct(product.id);
        await load();
    };

    const colors = data?.colors ?? [];

    return (
        <div>
            <Helmet>
                <title>Admin Products — J.J. Serow Clothing Co.</title>
            </Helmet>

            <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="font-label text-[11px] font-semibold uppercase tracking-[0.2em]">
                    Catalog{data ? ` (${data.products.length})` : ''}
                </h2>
                {editing === null && (
                    <button onClick={openNew} className={ghostButtonClass}>
                        <Plus className="h-3.5 w-3.5" /> Add product
                    </button>
                )}
            </div>

            {message && (
                <p className="mt-4 border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {message}
                </p>
            )}

            {editing !== null && (
                <form onSubmit={onSubmit} className={`${cardClass} mt-6`}>
                    <div className="flex items-center justify-between">
                        <h3 className="font-label text-[11px] font-semibold uppercase tracking-[0.2em]">
                            {editing === 'new' ? 'New product' : 'Edit product'}
                        </h3>
                        <button type="button" onClick={close} aria-label="Close" className="text-foreground/50 hover:text-foreground">
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                        <label className="block">
                            <span className={labelClass}>Name</span>
                            <input required value={form.name} onChange={set('name')} className={fieldClass} />
                            {errors.name && <p className={errorClass}>{errors.name}</p>}
                        </label>
                        <label className="block">
                            <span className={labelClass}>
                                Slug {editing === 'new' ? '(optional — from the name)' : '(cannot change)'}
                            </span>
                            <input
                                value={form.slug ?? ''}
                                onChange={set('slug')}
                                disabled={editing !== 'new'}
                                className={`${fieldClass} disabled:opacity-50`}
                                placeholder="serow-oxford"
                            />
                            {errors.slug && <p className={errorClass}>{errors.slug}</p>}
                        </label>
                        <label className="block">
                            <span className={labelClass}>Category</span>
                            <input required value={form.category} onChange={set('category')} className={fieldClass} />
                            {errors.category && <p className={errorClass}>{errors.category}</p>}
                        </label>
                        <label className="block">
                            <span className={labelClass}>Fabric</span>
                            <input required value={form.fabric} onChange={set('fabric')} className={fieldClass} />
                            {errors.fabric && <p className={errorClass}>{errors.fabric}</p>}
                        </label>
                        <div className="sm:col-span-2">
                            <ImageField
                                label="Product photo"
                                value={form.image}
                                onChange={(image) => setForm((f) => ({ ...f, image }))}
                                error={errors.image}
                            />
                        </div>
                        <label className="block">
                            <span className={labelClass}>Price modifier (₹, added to every colour base)</span>
                            <input
                                required
                                type="number"
                                value={form.price_mod}
                                onChange={set('price_mod')}
                                className={fieldClass}
                            />
                            {errors.price_mod && <p className={errorClass}>{errors.price_mod}</p>}
                        </label>
                        <label className="mt-7 flex items-center gap-2 font-label text-[10px] uppercase tracking-[0.14em] text-foreground/70">
                            <input
                                type="checkbox"
                                checked={form.is_active}
                                onChange={set('is_active')}
                                className="h-4 w-4 border-foreground/60"
                            />
                            Show on the storefront
                        </label>
                        <label className="block sm:col-span-2">
                            <span className={labelClass}>Blurb</span>
                            <textarea
                                required
                                rows={3}
                                value={form.blurb}
                                onChange={set('blurb')}
                                className="w-full border border-foreground/60 bg-transparent p-3 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
                            />
                            {errors.blurb && <p className={errorClass}>{errors.blurb}</p>}
                        </label>
                    </div>

                    <div className="mt-6">
                        <p className={labelClass}>Stock by colour</p>
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {colors.map((color) => (
                                <div
                                    key={color.id}
                                    className="flex items-center gap-2 border border-foreground/40 px-3 py-2"
                                >
                                    <span
                                        aria-hidden
                                        className="h-4 w-4 shrink-0 border border-foreground/50"
                                        style={{ background: color.hex }}
                                    />
                                    <span className="flex-1 truncate font-label text-[10px] uppercase tracking-[0.12em]">
                                        {color.name}
                                    </span>
                                    <select
                                        value={form.stock[color.name] ?? 'in_stock'}
                                        onChange={(e) => setStock(color.name, e.target.value)}
                                        className="h-8 border border-foreground/50 bg-transparent px-1 font-label text-[10px] uppercase tracking-[0.1em] focus:outline-none"
                                    >
                                        {(data?.stock_states ?? []).map((s) => (
                                            <option key={s} value={s}>
                                                {STOCK_LABELS[s] ?? s}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-6 flex gap-3">
                        <button type="submit" disabled={busy} className={primaryButtonClass}>
                            {busy ? 'Saving…' : 'Save product'}
                        </button>
                        <button type="button" onClick={close} className={ghostButtonClass}>
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            {!data && <p className="mt-6 font-label text-[11px] uppercase tracking-[0.16em] text-foreground/50">Loading…</p>}

            {data && (
                <div className="mt-6 overflow-x-auto border-y border-foreground/60">
                    <table className="w-full min-w-[48rem] text-left">
                        <thead>
                            <tr className="border-b border-foreground/30 font-label text-[10px] uppercase tracking-[0.16em] text-foreground/55">
                                <th className="py-3 pr-4 font-normal">Product</th>
                                <th className="py-3 pr-4 font-normal">Category</th>
                                <th className="py-3 pr-4 font-normal">Price mod</th>
                                <th className="py-3 pr-4 font-normal">Stock</th>
                                <th className="py-3 pr-4 font-normal">Live</th>
                                <th className="py-3" />
                            </tr>
                        </thead>
                        <tbody>
                            {data.products.map((product) => {
                                const outOf = Object.values(product.stock).filter((s) => s === 'out_of_stock').length;
                                const mto = Object.values(product.stock).filter((s) => s === 'made_to_order').length;
                                return (
                                    <tr key={product.id} className="border-b border-foreground/20 last:border-b-0">
                                        <td className="py-4 pr-4">
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={product.image}
                                                    alt=""
                                                    className="h-12 w-10 border border-foreground/40 object-cover"
                                                />
                                                <div>
                                                    <p className="font-display text-base font-bold">{product.name}</p>
                                                    <p className="font-label text-[10px] tracking-[0.08em] text-foreground/50">
                                                        {product.slug} • {product.fabric}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 pr-4 text-sm text-foreground/70">{product.category}</td>
                                        <td className="py-4 pr-4 text-sm text-foreground/70">
                                            {product.price_mod >= 0 ? '+' : '−'}
                                            {inr(Math.abs(product.price_mod))}
                                        </td>
                                        <td className="py-4 pr-4 font-label text-[10px] uppercase tracking-[0.1em] text-foreground/60">
                                            {outOf > 0 && <span className="text-destructive">{outOf} out</span>}
                                            {outOf > 0 && mto > 0 && ' • '}
                                            {mto > 0 && `${mto} MTO`}
                                            {outOf === 0 && mto === 0 && 'all in stock'}
                                        </td>
                                        <td className="py-4 pr-4">
                                            <span
                                                className={`border px-2 py-1 font-label text-[10px] uppercase tracking-[0.1em] ${
                                                    product.is_active
                                                        ? 'border-foreground/50'
                                                        : 'border-destructive/50 text-destructive'
                                                }`}
                                            >
                                                {product.is_active ? 'Live' : 'Hidden'}
                                            </span>
                                        </td>
                                        <td className="py-4 text-right">
                                            <div className="flex justify-end gap-3 font-label text-[10px] uppercase tracking-[0.14em]">
                                                <button
                                                    onClick={() => openEdit(product)}
                                                    className="flex items-center gap-1 underline underline-offset-4"
                                                >
                                                    <Pencil className="h-3 w-3" /> Edit
                                                </button>
                                                <button
                                                    onClick={() => remove(product)}
                                                    className="flex items-center gap-1 text-foreground/55 underline underline-offset-4 hover:text-destructive"
                                                >
                                                    <Trash2 className="h-3 w-3" /> Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            <p className="mt-4 font-label text-[10px] uppercase tracking-[0.14em] text-foreground/45">
                Catalog changes reach the storefront on the next page load.
            </p>
        </div>
    );
};

export default AdminProductsPage;
