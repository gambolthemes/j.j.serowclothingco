import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Check, Plus, Trash2 } from 'lucide-react';
import { adminGetSettings, adminSaveSettings, fieldErrors, generalError } from '@/lib/api';
import ImageField from '@/components/admin/ImageField';
import {
    cardClass,
    errorClass,
    fieldClass,
    ghostButtonClass,
    labelClass,
    primaryButtonClass,
} from '@/components/account/ui';

const NUMBERS = [
    { key: 'MOQ_SETS', label: 'Minimum sets per colour', hint: 'MOQ enforced at checkout' },
    { key: 'LEAD_DAYS', label: 'Production estimate (days)', hint: 'Drives the tracking timeline' },
    { key: 'STANDARD_SET_PIECES', label: 'Pieces in a standard set', hint: 'Prices scale against this' },
    { key: 'SAMPLE_SET_PRICE', label: 'Sample set price (₹)', hint: 'Flat charge per line' },
    { key: 'PRIVATE_LABEL_PER_PC', label: 'Private label (₹ / piece)', hint: 'Added per piece' },
];

const AdminSettingsPage = () => {
    const [form, setForm] = useState(null);
    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState('');
    const [saved, setSaved] = useState(false);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        adminGetSettings()
            .then(({ settings }) => setForm(settings))
            .catch(() => setMessage('Could not load settings.'));
    }, []);

    const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

    const setTier = (index, key, value) =>
        setForm((f) => ({
            ...f,
            TIERS: f.TIERS.map((t, i) => (i === index ? { ...t, [key]: value } : t)),
        }));

    const addTier = () =>
        setForm((f) => ({
            ...f,
            TIERS: [...f.TIERS, { min: 1, max: null, discount: 0, label: 'New tier' }],
        }));

    const removeTier = (index) =>
        setForm((f) => ({ ...f, TIERS: f.TIERS.filter((_, i) => i !== index) }));

    const onSubmit = async (e) => {
        e.preventDefault();
        setErrors({});
        setMessage('');
        setSaved(false);
        setBusy(true);
        try {
            const payload = {
                ...form,
                LEAD_DAYS: Number(form.LEAD_DAYS),
                MOQ_SETS: Number(form.MOQ_SETS),
                STANDARD_SET_PIECES: Number(form.STANDARD_SET_PIECES),
                SAMPLE_SET_PRICE: Number(form.SAMPLE_SET_PRICE),
                PRIVATE_LABEL_PER_PC: Number(form.PRIVATE_LABEL_PER_PC),
                GST_RATE: Number(form.GST_RATE),
                WHATSAPP_NUMBER: String(form.WHATSAPP_NUMBER),
                TIERS: form.TIERS.map((t) => ({
                    min: Number(t.min),
                    // An empty top bound means "and above".
                    max: t.max === '' || t.max === null ? null : Number(t.max),
                    discount: Number(t.discount),
                    label: t.label,
                })),
            };
            setForm(await adminSaveSettings(payload));
            setSaved(true);
        } catch (err) {
            const fields = fieldErrors(err);
            setErrors(fields);
            if (!Object.keys(fields).length) setMessage(generalError(err, 'Could not save settings.'));
            else if (fields.TIERS) setMessage(fields.TIERS);
        } finally {
            setBusy(false);
        }
    };

    if (!form) {
        return (
            <div>
                <Helmet>
                    <title>Admin Settings — J.J. Serow Clothing Co.</title>
                </Helmet>
                <p className="font-label text-[11px] uppercase tracking-[0.16em] text-foreground/50">
                    {message || 'Loading…'}
                </p>
            </div>
        );
    }

    return (
        <form onSubmit={onSubmit}>
            <Helmet>
                <title>Admin Settings — J.J. Serow Clothing Co.</title>
            </Helmet>

            <h2 className="font-label text-[11px] font-semibold uppercase tracking-[0.2em]">
                Commercial terms
            </h2>
            <p className="mt-2 text-sm text-foreground/60">
                These drive checkout, pricing and tracking on the storefront. Existing orders keep the numbers
                they were placed at.
            </p>

            {message && (
                <p className="mt-4 border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {message}
                </p>
            )}

            <div className={`${cardClass} mt-6`}>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {NUMBERS.map((f) => (
                        <label key={f.key} className="block">
                            <span className={labelClass}>{f.label}</span>
                            <input
                                required
                                type="number"
                                value={form[f.key]}
                                onChange={set(f.key)}
                                className={fieldClass}
                            />
                            <span className="mt-1 block font-label text-[9px] uppercase tracking-[0.1em] text-foreground/40">
                                {f.hint}
                            </span>
                            {errors[f.key] && <p className={errorClass}>{errors[f.key]}</p>}
                        </label>
                    ))}
                    <label className="block">
                        <span className={labelClass}>GST rate (0.05 = 5%)</span>
                        <input
                            required
                            type="number"
                            step="0.001"
                            value={form.GST_RATE}
                            onChange={set('GST_RATE')}
                            className={fieldClass}
                        />
                        {errors.GST_RATE && <p className={errorClass}>{errors.GST_RATE}</p>}
                    </label>
                    <label className="block">
                        <span className={labelClass}>WhatsApp number (with country code)</span>
                        <input
                            required
                            value={form.WHATSAPP_NUMBER}
                            onChange={set('WHATSAPP_NUMBER')}
                            className={fieldClass}
                            placeholder="919876543210"
                        />
                        {errors.WHATSAPP_NUMBER && <p className={errorClass}>{errors.WHATSAPP_NUMBER}</p>}
                    </label>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <label className="block">
                        <span className={labelClass}>Orders email (shown in the footer)</span>
                        <input
                            required
                            type="email"
                            value={form.COMPANY_EMAIL}
                            onChange={set('COMPANY_EMAIL')}
                            className={fieldClass}
                        />
                        {errors.COMPANY_EMAIL && <p className={errorClass}>{errors.COMPANY_EMAIL}</p>}
                    </label>
                    <label className="block">
                        <span className={labelClass}>Location (city first — it feeds the page title)</span>
                        <input
                            required
                            value={form.COMPANY_LOCATION}
                            onChange={set('COMPANY_LOCATION')}
                            className={fieldClass}
                            placeholder="Tirupur, Tamil Nadu, India"
                        />
                        {errors.COMPANY_LOCATION && <p className={errorClass}>{errors.COMPANY_LOCATION}</p>}
                    </label>
                    <ImageField
                        label="Hero image"
                        value={form.HERO_URL}
                        onChange={(HERO_URL) => setForm((f) => ({ ...f, HERO_URL }))}
                        error={errors.HERO_URL}
                        hint="Shown across the top of the homepage"
                    />
                    <ImageField
                        label="Factory image"
                        value={form.FACTORY_URL}
                        onChange={(FACTORY_URL) => setForm((f) => ({ ...f, FACTORY_URL }))}
                        error={errors.FACTORY_URL}
                        hint="Shown in the “made in” section"
                    />
                </div>
            </div>

            <div className={`${cardClass} mt-6`}>
                <h3 className="font-label text-[11px] font-semibold uppercase tracking-[0.2em]">
                    Payment instructions
                </h3>
                <p className="mt-2 text-sm text-foreground/60">
                    Where retailers send the advance. Shown on their payment screen and on any invoice still
                    awaiting payment — and, unlike everything above, never printed into the public page. Leave
                    blank what you do not use; the block is hidden until there is a UPI ID or an account number.
                </p>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <label className="block">
                        <span className={labelClass}>Our GSTIN (printed on every invoice)</span>
                        <input
                            value={form.COMPANY_GSTIN ?? ''}
                            onChange={set('COMPANY_GSTIN')}
                            className={`${fieldClass} uppercase`}
                            placeholder="22AAAAA0000A1Z5"
                            maxLength={15}
                        />
                        {errors.COMPANY_GSTIN && <p className={errorClass}>{errors.COMPANY_GSTIN}</p>}
                    </label>
                    <label className="block">
                        <span className={labelClass}>UPI ID</span>
                        <input
                            value={form.PAY_TO_UPI ?? ''}
                            onChange={set('PAY_TO_UPI')}
                            className={fieldClass}
                            placeholder="jjserow@okhdfcbank"
                        />
                        {errors.PAY_TO_UPI && <p className={errorClass}>{errors.PAY_TO_UPI}</p>}
                    </label>
                    <label className="block">
                        <span className={labelClass}>Account holder name</span>
                        <input
                            value={form.PAY_TO_ACCOUNT_NAME ?? ''}
                            onChange={set('PAY_TO_ACCOUNT_NAME')}
                            className={fieldClass}
                            placeholder="J.J. Serow Clothing Co."
                        />
                        {errors.PAY_TO_ACCOUNT_NAME && <p className={errorClass}>{errors.PAY_TO_ACCOUNT_NAME}</p>}
                    </label>
                    <label className="block">
                        <span className={labelClass}>Account number</span>
                        <input
                            value={form.PAY_TO_ACCOUNT_NUMBER ?? ''}
                            onChange={set('PAY_TO_ACCOUNT_NUMBER')}
                            className={fieldClass}
                            inputMode="numeric"
                            maxLength={18}
                        />
                        {errors.PAY_TO_ACCOUNT_NUMBER && (
                            <p className={errorClass}>{errors.PAY_TO_ACCOUNT_NUMBER}</p>
                        )}
                    </label>
                    <label className="block">
                        <span className={labelClass}>IFSC</span>
                        <input
                            value={form.PAY_TO_IFSC ?? ''}
                            onChange={set('PAY_TO_IFSC')}
                            className={`${fieldClass} uppercase`}
                            placeholder="HDFC0001234"
                            maxLength={11}
                        />
                        {errors.PAY_TO_IFSC && <p className={errorClass}>{errors.PAY_TO_IFSC}</p>}
                    </label>
                    <label className="block">
                        <span className={labelClass}>Bank &amp; branch</span>
                        <input
                            value={form.PAY_TO_BANK_NAME ?? ''}
                            onChange={set('PAY_TO_BANK_NAME')}
                            className={fieldClass}
                            placeholder="HDFC Bank, Ludhiana"
                        />
                        {errors.PAY_TO_BANK_NAME && <p className={errorClass}>{errors.PAY_TO_BANK_NAME}</p>}
                    </label>
                </div>
            </div>

            <div className={`${cardClass} mt-6`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-label text-[11px] font-semibold uppercase tracking-[0.2em]">
                        Volume tiers
                    </h3>
                    <button type="button" onClick={addTier} className={ghostButtonClass}>
                        <Plus className="h-3.5 w-3.5" /> Add tier
                    </button>
                </div>
                <p className="mt-2 text-sm text-foreground/60">
                    Listed smallest first — the first tier a set count falls into wins. Leave the top bound
                    empty for "and above".
                </p>

                <div className="mt-5 space-y-3">
                    {form.TIERS.map((tier, i) => (
                        <div key={i} className="grid gap-3 border border-foreground/30 p-3 sm:grid-cols-[1fr_1fr_1fr_2fr_auto]">
                            <label className="block">
                                <span className={labelClass}>From sets</span>
                                <input
                                    required
                                    type="number"
                                    value={tier.min}
                                    onChange={(e) => setTier(i, 'min', e.target.value)}
                                    className={fieldClass}
                                />
                            </label>
                            <label className="block">
                                <span className={labelClass}>To sets</span>
                                <input
                                    type="number"
                                    value={tier.max ?? ''}
                                    onChange={(e) => setTier(i, 'max', e.target.value)}
                                    className={fieldClass}
                                    placeholder="∞"
                                />
                            </label>
                            <label className="block">
                                <span className={labelClass}>Discount (0.06 = 6%)</span>
                                <input
                                    required
                                    type="number"
                                    step="0.01"
                                    value={tier.discount}
                                    onChange={(e) => setTier(i, 'discount', e.target.value)}
                                    className={fieldClass}
                                />
                            </label>
                            <label className="block">
                                <span className={labelClass}>Label</span>
                                <input
                                    required
                                    value={tier.label}
                                    onChange={(e) => setTier(i, 'label', e.target.value)}
                                    className={fieldClass}
                                />
                            </label>
                            <button
                                type="button"
                                onClick={() => removeTier(i)}
                                disabled={form.TIERS.length <= 1}
                                aria-label="Remove tier"
                                className="mt-7 flex h-11 w-11 items-center justify-center border border-foreground/40 text-foreground/55 hover:text-destructive disabled:opacity-30"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-4">
                <button type="submit" disabled={busy} className={primaryButtonClass}>
                    {busy ? 'Saving…' : 'Save settings'}
                </button>
                {saved && (
                    <p className="flex items-center gap-2 font-label text-[10px] uppercase tracking-[0.14em] text-foreground/60">
                        <Check className="h-3.5 w-3.5" /> Saved — reload the storefront to see them.
                    </p>
                )}
            </div>
        </form>
    );
};

export default AdminSettingsPage;
