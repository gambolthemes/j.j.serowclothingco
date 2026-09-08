import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import {
    adminCreateColor,
    adminDeleteColor,
    adminListColors,
    adminUpdateColor,
    fieldErrors,
    generalError,
} from '@/lib/api';
import { inr } from '@/lib/pricing';
import {
    cardClass,
    errorClass,
    fieldClass,
    ghostButtonClass,
    labelClass,
    primaryButtonClass,
} from '@/components/account/ui';

const EMPTY = { name: '', hex: '#CCCCCC', base: 3200 };

const AdminColorsPage = () => {
    const [colors, setColors] = useState(null);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(EMPTY);
    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        adminListColors()
            .then(setColors)
            .catch(() => setMessage('Could not load colours.'));
    }, []);

    const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

    const openNew = () => {
        setForm(EMPTY);
        setErrors({});
        setEditing('new');
    };

    const openEdit = (color) => {
        setForm({ name: color.name, hex: color.hex, base: color.base });
        setErrors({});
        setEditing(color.id);
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
            const payload = { ...form, base: Number(form.base) };
            setColors(
                editing === 'new' ? await adminCreateColor(payload) : await adminUpdateColor(editing, payload)
            );
            close();
        } catch (err) {
            const fields = fieldErrors(err);
            setErrors(fields);
            if (!Object.keys(fields).length) setMessage(generalError(err, 'Could not save that colour.'));
        } finally {
            setBusy(false);
        }
    };

    const remove = async (color) => {
        if (
            !window.confirm(
                `Delete "${color.name}"? Past orders keep the colour name, but it leaves the catalog.`
            )
        ) {
            return;
        }
        setMessage('');
        try {
            setColors(await adminDeleteColor(color.id));
        } catch (err) {
            setMessage(generalError(err, 'Could not delete that colour.'));
        }
    };

    return (
        <div>
            <Helmet>
                <title>Admin Colours — J.J. Serow Clothing Co.</title>
            </Helmet>

            <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="font-label text-[11px] font-semibold uppercase tracking-[0.2em]">
                    Colourways{colors ? ` (${colors.length})` : ''}
                </h2>
                {editing === null && (
                    <button onClick={openNew} className={ghostButtonClass}>
                        <Plus className="h-3.5 w-3.5" /> Add colour
                    </button>
                )}
            </div>

            <p className="mt-2 text-sm text-foreground/60">
                The base price is per set for that colourway, before the product's modifier and before tier
                discounts.
            </p>

            {message && (
                <p className="mt-4 border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {message}
                </p>
            )}

            {editing !== null && (
                <form onSubmit={onSubmit} className={`${cardClass} mt-6 max-w-xl`}>
                    <div className="flex items-center justify-between">
                        <h3 className="font-label text-[11px] font-semibold uppercase tracking-[0.2em]">
                            {editing === 'new' ? 'New colour' : 'Edit colour'}
                        </h3>
                        <button type="button" onClick={close} aria-label="Close" className="text-foreground/50 hover:text-foreground">
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="mt-6 grid gap-4 sm:grid-cols-3">
                        <label className="block sm:col-span-2">
                            <span className={labelClass}>Name</span>
                            <input required value={form.name} onChange={set('name')} className={fieldClass} />
                            {errors.name && <p className={errorClass}>{errors.name}</p>}
                        </label>
                        <label className="block">
                            <span className={labelClass}>Base price (₹ / set)</span>
                            <input
                                required
                                type="number"
                                value={form.base}
                                onChange={set('base')}
                                className={fieldClass}
                            />
                            {errors.base && <p className={errorClass}>{errors.base}</p>}
                        </label>
                        <label className="block sm:col-span-3">
                            <span className={labelClass}>Swatch</span>
                            <div className="flex items-center gap-3">
                                <input
                                    type="color"
                                    value={form.hex}
                                    onChange={set('hex')}
                                    className="h-11 w-16 border border-foreground/60 bg-transparent"
                                />
                                <input
                                    required
                                    value={form.hex}
                                    onChange={set('hex')}
                                    className={fieldClass}
                                    placeholder="#F2EFE6"
                                />
                            </div>
                            {errors.hex && <p className={errorClass}>{errors.hex}</p>}
                        </label>
                    </div>

                    <div className="mt-6 flex gap-3">
                        <button type="submit" disabled={busy} className={primaryButtonClass}>
                            {busy ? 'Saving…' : 'Save colour'}
                        </button>
                        <button type="button" onClick={close} className={ghostButtonClass}>
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            {!colors && (
                <p className="mt-6 font-label text-[11px] uppercase tracking-[0.16em] text-foreground/50">Loading…</p>
            )}

            {colors && (
                <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {colors.map((color) => (
                        <div key={color.id} className="flex items-center gap-3 border border-foreground/50 bg-card p-4">
                            <span
                                aria-hidden
                                className="h-10 w-10 shrink-0 border border-foreground/60"
                                style={{ background: color.hex }}
                            />
                            <div className="min-w-0 flex-1">
                                <p className="font-display text-lg font-bold">{color.name}</p>
                                <p className="font-label text-[10px] uppercase tracking-[0.12em] text-foreground/55">
                                    {inr(color.base)} / set • {color.hex}
                                </p>
                            </div>
                            <div className="flex flex-col gap-2 font-label text-[10px] uppercase tracking-[0.12em]">
                                <button onClick={() => openEdit(color)} className="flex items-center gap-1 underline underline-offset-4">
                                    <Pencil className="h-3 w-3" /> Edit
                                </button>
                                <button
                                    onClick={() => remove(color)}
                                    className="flex items-center gap-1 text-foreground/55 underline underline-offset-4 hover:text-destructive"
                                >
                                    <Trash2 className="h-3 w-3" /> Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <p className="mt-4 font-label text-[10px] uppercase tracking-[0.14em] text-foreground/45">
                A new colour starts as made-to-order on every product — set real stock under Products.
            </p>
        </div>
    );
};

export default AdminColorsPage;
