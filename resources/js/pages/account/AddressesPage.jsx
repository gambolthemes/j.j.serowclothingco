import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Check, Pencil, Plus, Star, Trash2, X } from 'lucide-react';
import {
    createAddress,
    deleteAddress,
    fieldErrors,
    generalError,
    listAddresses,
    updateAddress,
} from '@/lib/api';
import {
    cardClass,
    errorClass,
    fieldClass,
    ghostButtonClass,
    labelClass,
    primaryButtonClass,
} from '@/components/account/ui';

const EMPTY = {
    label: '',
    contact_name: '',
    phone: '',
    gstin: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    pincode: '',
    is_default: false,
};

const AddressesPage = () => {
    const [addresses, setAddresses] = useState(null);
    const [editing, setEditing] = useState(null); // null = form closed, 'new' or an id
    const [form, setForm] = useState(EMPTY);
    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);

    const load = () => listAddresses().then(setAddresses);

    useEffect(() => {
        load().catch(() => setMessage('Could not load your addresses.'));
    }, []);

    const set = (key) => (e) =>
        setForm((f) => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

    const openNew = () => {
        setForm({ ...EMPTY, is_default: addresses?.length === 0 });
        setErrors({});
        setEditing('new');
    };

    const openEdit = (address) => {
        setForm({ ...EMPTY, ...address, gstin: address.gstin ?? '', line2: address.line2 ?? '' });
        setErrors({});
        setEditing(address.id);
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
            if (editing === 'new') {
                await createAddress(form);
            } else {
                await updateAddress(editing, form);
            }
            await load();
            close();
        } catch (err) {
            const fields = fieldErrors(err);
            setErrors(fields);
            if (!Object.keys(fields).length) {
                setMessage(generalError(err, 'Could not save that address.'));
            }
        } finally {
            setBusy(false);
        }
    };

    const remove = async (address) => {
        if (!window.confirm(`Delete the "${address.label}" address? Past orders keep their copy.`)) return;
        await deleteAddress(address.id);
        await load();
    };

    const makeDefault = async (address) => {
        await updateAddress(address.id, { ...address, gstin: address.gstin ?? '', line2: address.line2 ?? '', is_default: true });
        await load();
    };

    const field = (key, label, props = {}) => (
        <label className="block">
            <span className={labelClass}>{label}</span>
            <input value={form[key]} onChange={set(key)} className={fieldClass} {...props} />
            {errors[key] && <p className={errorClass}>{errors[key]}</p>}
        </label>
    );

    return (
        <div>
            <Helmet>
                <title>Shipping Addresses — J.J. Serow Clothing Co.</title>
                <meta
                    name="description"
                    content="Manage the delivery addresses on your J.J. Serow retailer account, with GSTIN for wholesale invoicing."
                />
            </Helmet>

            <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="font-label text-[11px] font-semibold uppercase tracking-[0.2em]">
                    Shipping addresses
                </h2>
                {editing === null && (
                    <button onClick={openNew} className={ghostButtonClass}>
                        <Plus className="h-3.5 w-3.5" /> Add address
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
                            {editing === 'new' ? 'New address' : 'Edit address'}
                        </h3>
                        <button type="button" onClick={close} aria-label="Close" className="text-foreground/50 hover:text-foreground">
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                        {field('label', 'Label', { required: true, placeholder: 'Warehouse / Main shop' })}
                        {field('contact_name', 'Contact name', { required: true })}
                        {field('phone', 'Phone', { required: true, placeholder: '98765 43210' })}
                        {field('gstin', 'GSTIN (optional)', { placeholder: '22AAAAA0000A1Z5' })}
                        <div className="sm:col-span-2">{field('line1', 'Address line 1', { required: true })}</div>
                        <div className="sm:col-span-2">{field('line2', 'Address line 2 (optional)')}</div>
                        {field('city', 'City', { required: true })}
                        {field('state', 'State', { required: true })}
                        {field('pincode', 'Pincode', { required: true, inputMode: 'numeric', placeholder: '141001' })}
                    </div>

                    <label className="mt-5 flex items-center gap-2 font-label text-[10px] uppercase tracking-[0.14em] text-foreground/70">
                        <input
                            type="checkbox"
                            checked={form.is_default}
                            onChange={set('is_default')}
                            className="h-4 w-4 border-foreground/60"
                        />
                        Ship orders here by default
                    </label>

                    <div className="mt-6 flex gap-3">
                        <button type="submit" disabled={busy} className={primaryButtonClass}>
                            {busy ? 'Saving…' : 'Save address'}
                        </button>
                        <button type="button" onClick={close} className={ghostButtonClass}>
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            {addresses === null && (
                <p className="mt-6 font-label text-[11px] uppercase tracking-[0.16em] text-foreground/50">
                    Loading…
                </p>
            )}

            {addresses?.length === 0 && editing === null && (
                <div className="mt-6 border border-foreground/50 p-10 text-center">
                    <p className="font-display text-2xl font-bold">No addresses saved.</p>
                    <p className="mt-2 text-sm text-foreground/60">
                        Add one and every order you confirm will carry it through to dispatch.
                    </p>
                </div>
            )}

            {addresses?.length > 0 && (
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    {addresses.map((address) => (
                        <div key={address.id} className="border border-foreground/50 bg-card p-5">
                            <div className="flex items-start justify-between gap-3">
                                <p className="font-label text-[10px] uppercase tracking-[0.16em] text-foreground/55">
                                    {address.label}
                                </p>
                                {address.is_default && (
                                    <span className="flex items-center gap-1 bg-accent px-2 py-0.5 font-label text-[9px] uppercase tracking-[0.12em] text-accent-foreground">
                                        <Check className="h-3 w-3" /> Default
                                    </span>
                                )}
                            </div>
                            <address className="mt-3 not-italic text-sm leading-relaxed text-foreground/75">
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
                            <div className="mt-4 flex flex-wrap gap-3 font-label text-[10px] uppercase tracking-[0.14em]">
                                <button onClick={() => openEdit(address)} className="flex items-center gap-1 underline underline-offset-4">
                                    <Pencil className="h-3 w-3" /> Edit
                                </button>
                                {!address.is_default && (
                                    <button onClick={() => makeDefault(address)} className="flex items-center gap-1 underline underline-offset-4">
                                        <Star className="h-3 w-3" /> Make default
                                    </button>
                                )}
                                <button
                                    onClick={() => remove(address)}
                                    className="flex items-center gap-1 text-foreground/55 underline underline-offset-4 hover:text-destructive"
                                >
                                    <Trash2 className="h-3 w-3" /> Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AddressesPage;
