import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Check, Landmark, ShieldCheck } from 'lucide-react';
import { fieldErrors, generalError, getPaymentProfile, savePaymentProfile } from '@/lib/api';
import {
    cardClass,
    errorClass,
    fieldClass,
    labelClass,
    primaryButtonClass,
} from '@/components/account/ui';

/* Billing identity and how the retailer pays, in one place, so the desk stops
   asking for a GSTIN on WhatsApp every time an invoice has to be raised.

   Deliberately no card fields. Orders here are 100% advance by transfer — there
   is no payment gateway, and a card number in our own database would be a
   PCI-DSS obligation bought for nothing. */
const PaymentPage = () => {
    const [form, setForm] = useState(null);
    const [methods, setMethods] = useState({});
    const [bankMethods, setBankMethods] = useState([]);
    const [payTo, setPayTo] = useState(null);
    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState('');
    const [saved, setSaved] = useState(false);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        getPaymentProfile()
            .then((data) => {
                setForm(data.profile);
                setMethods(data.methods);
                setBankMethods(data.bank_methods);
                setPayTo(data.payTo);
            })
            .catch(() => setMessage('Could not load your payment details.'));
    }, []);

    const set = (key) => (e) => {
        setSaved(false);
        setForm((f) => ({ ...f, [key]: e.target.value }));
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        setErrors({});
        setMessage('');
        setSaved(false);
        setBusy(true);
        try {
            setForm(await savePaymentProfile(form));
            setSaved(true);
        } catch (err) {
            const fields = fieldErrors(err);
            setErrors(fields);
            if (!Object.keys(fields).length) {
                setMessage(generalError(err, 'Could not save your payment details.'));
            }
        } finally {
            setBusy(false);
        }
    };

    if (!form) {
        return (
            <div>
                <Helmet>
                    <title>Payment Details — J.J. Serow Clothing Co.</title>
                </Helmet>
                <p className="font-label text-[11px] uppercase tracking-[0.16em] text-foreground/50">
                    {message || 'Loading…'}
                </p>
            </div>
        );
    }

    const method = form.preferred_method || '';
    const needsBank = bankMethods.includes(method);
    const showsBank = needsBank || Boolean(form.bank_account_number);
    // Blank until the wholesale desk fills the settings in, and there is nothing
    // worth showing an empty box for.
    const hasPayTo = payTo && (payTo.upi || payTo.account_number);

    return (
        <div>
            <Helmet>
                <title>Payment Details — J.J. Serow Clothing Co.</title>
                <meta
                    name="description"
                    content="Save your GSTIN, PAN and payment method so every wholesale invoice is raised correctly."
                />
            </Helmet>

            {hasPayTo && (
                <div className="border border-foreground bg-accent p-5 text-accent-foreground">
                    <div className="flex items-start gap-3">
                        <Landmark className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={2.25} />
                        <div className="min-w-0">
                            <p className="font-label text-[11px] font-semibold uppercase tracking-[0.14em]">
                                Where to send the advance
                            </p>
                            <dl className="mt-3 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
                                {[
                                    ['UPI', payTo.upi],
                                    ['Account name', payTo.account_name],
                                    ['Account number', payTo.account_number],
                                    ['IFSC', payTo.ifsc],
                                    ['Bank', payTo.bank_name],
                                    ['Our GSTIN', payTo.gstin],
                                ]
                                    .filter(([, value]) => value)
                                    .map(([term, value]) => (
                                        <div key={term} className="flex flex-wrap gap-2">
                                            <dt className="font-label text-[10px] uppercase tracking-[0.14em] opacity-70">
                                                {term}
                                            </dt>
                                            <dd className="break-all font-label font-semibold">{value}</dd>
                                        </div>
                                    ))}
                            </dl>
                            <p className="mt-3 text-sm leading-relaxed">
                                Pay in full, then share the receipt on WhatsApp — the order is confirmed within
                                6 hours and production starts from there.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {message && (
                <p className="mt-4 border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {message}
                </p>
            )}

            <form onSubmit={onSubmit} className={`${cardClass} mt-6`}>
                <h2 className="font-label text-[11px] font-semibold uppercase tracking-[0.2em]">
                    Billing identity
                </h2>
                <p className="mt-2 text-sm text-foreground/60">
                    Saved once and used on every GST invoice. Orders already placed keep the details they were
                    raised with.
                </p>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <label className="block sm:col-span-2">
                        <span className={labelClass}>Registered business name (if different from your store name)</span>
                        <input
                            value={form.legal_name ?? ''}
                            onChange={set('legal_name')}
                            className={fieldClass}
                            placeholder="Serow Retail Private Limited"
                        />
                        {errors.legal_name && <p className={errorClass}>{errors.legal_name}</p>}
                    </label>
                    <label className="block">
                        <span className={labelClass}>GSTIN</span>
                        <input
                            value={form.gstin ?? ''}
                            onChange={set('gstin')}
                            className={`${fieldClass} uppercase`}
                            placeholder="22AAAAA0000A1Z5"
                            maxLength={15}
                        />
                        {errors.gstin && <p className={errorClass}>{errors.gstin}</p>}
                    </label>
                    <label className="block">
                        <span className={labelClass}>Business PAN</span>
                        <input
                            value={form.pan ?? ''}
                            onChange={set('pan')}
                            className={`${fieldClass} uppercase`}
                            placeholder="AAAAA0000A"
                            maxLength={10}
                        />
                        {errors.pan && <p className={errorClass}>{errors.pan}</p>}
                    </label>
                </div>

                <h2 className="mt-8 font-label text-[11px] font-semibold uppercase tracking-[0.2em]">
                    How you pay
                </h2>
                <p className="mt-2 text-sm text-foreground/60">
                    Tells the wholesale desk what to watch for, and gives us somewhere to send a refund if an
                    order is cancelled before cutting.
                </p>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <label className="block">
                        <span className={labelClass}>Preferred method</span>
                        <select
                            value={method}
                            onChange={set('preferred_method')}
                            className={fieldClass}
                        >
                            <option value="">Not set</option>
                            {Object.entries(methods).map(([value, label]) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                        </select>
                        {errors.preferred_method && <p className={errorClass}>{errors.preferred_method}</p>}
                    </label>

                    {(method === 'upi' || form.upi_id) && (
                        <label className="block">
                            <span className={labelClass}>
                                Your UPI ID {method === 'upi' ? '' : '(optional)'}
                            </span>
                            <input
                                value={form.upi_id ?? ''}
                                onChange={set('upi_id')}
                                className={fieldClass}
                                placeholder="yourstore@okhdfcbank"
                            />
                            {errors.upi_id && <p className={errorClass}>{errors.upi_id}</p>}
                        </label>
                    )}

                    {showsBank && (
                        <>
                            <label className="block">
                                <span className={labelClass}>Account holder name</span>
                                <input
                                    value={form.bank_account_name ?? ''}
                                    onChange={set('bank_account_name')}
                                    className={fieldClass}
                                />
                                {errors.bank_account_name && (
                                    <p className={errorClass}>{errors.bank_account_name}</p>
                                )}
                            </label>
                            <label className="block">
                                <span className={labelClass}>Account number</span>
                                <input
                                    value={form.bank_account_number ?? ''}
                                    onChange={set('bank_account_number')}
                                    className={fieldClass}
                                    inputMode="numeric"
                                    maxLength={18}
                                />
                                {errors.bank_account_number && (
                                    <p className={errorClass}>{errors.bank_account_number}</p>
                                )}
                            </label>
                            <label className="block">
                                <span className={labelClass}>IFSC</span>
                                <input
                                    value={form.bank_ifsc ?? ''}
                                    onChange={set('bank_ifsc')}
                                    className={`${fieldClass} uppercase`}
                                    placeholder="HDFC0001234"
                                    maxLength={11}
                                />
                                {errors.bank_ifsc && <p className={errorClass}>{errors.bank_ifsc}</p>}
                            </label>
                            <label className="block">
                                <span className={labelClass}>Bank &amp; branch (optional)</span>
                                <input
                                    value={form.bank_name ?? ''}
                                    onChange={set('bank_name')}
                                    className={fieldClass}
                                    placeholder="HDFC Bank, Ludhiana"
                                />
                                {errors.bank_name && <p className={errorClass}>{errors.bank_name}</p>}
                            </label>
                        </>
                    )}
                </div>

                <p className="mt-6 flex items-start gap-2 border-t border-foreground/20 pt-5 font-label text-[10px] uppercase tracking-[0.12em] text-foreground/45">
                    <ShieldCheck className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                    We never ask for or store card details. Every order is paid by transfer and confirmed on
                    WhatsApp.
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-4">
                    <button type="submit" disabled={busy} className={primaryButtonClass}>
                        {busy ? 'Saving…' : 'Save payment details'}
                    </button>
                    {saved && (
                        <p className="flex items-center gap-2 font-label text-[10px] uppercase tracking-[0.14em] text-foreground/60">
                            <Check className="h-3.5 w-3.5" /> Payment details saved.
                        </p>
                    )}
                </div>
            </form>
        </div>
    );
};

export default PaymentPage;
