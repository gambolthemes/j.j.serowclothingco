import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Check } from 'lucide-react';
import { fieldErrors, generalError, updatePassword } from '@/lib/api';
import {
    cardClass,
    errorClass,
    fieldClass,
    labelClass,
    primaryButtonClass,
} from '@/components/account/ui';

const EMPTY = { current_password: '', password: '', password_confirmation: '' };

const PasswordPage = () => {
    const [form, setForm] = useState(EMPTY);
    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);

    const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

    const onSubmit = async (e) => {
        e.preventDefault();
        setErrors({});
        setMessage('');

        if (form.password !== form.password_confirmation) {
            setErrors({ password_confirmation: 'The two new passwords do not match.' });
            return;
        }

        setBusy(true);
        try {
            await updatePassword(form);
            setForm(EMPTY);
            setMessage('Password changed. Other devices have been signed out.');
        } catch (err) {
            const fields = fieldErrors(err);
            setErrors(fields);
            if (!Object.keys(fields).length) {
                setMessage(generalError(err, 'Could not change your password.'));
            }
        } finally {
            setBusy(false);
        }
    };

    return (
        <div>
            <Helmet>
                <title>Change Password — J.J. Serow Clothing Co.</title>
                <meta name="description" content="Change the password on your J.J. Serow retailer account." />
            </Helmet>

            <form onSubmit={onSubmit} className={`${cardClass} max-w-xl`}>
                <h2 className="font-label text-[11px] font-semibold uppercase tracking-[0.2em]">
                    Change password
                </h2>
                <p className="mt-2 text-sm text-foreground/60">
                    Minimum 10 characters. Changing it signs out every other device on your account.
                </p>

                <label className="mt-6 block">
                    <span className={labelClass}>Current password</span>
                    <input
                        type="password"
                        required
                        value={form.current_password}
                        onChange={set('current_password')}
                        className={fieldClass}
                        placeholder="••••••••••"
                    />
                    {errors.current_password && <p className={errorClass}>{errors.current_password}</p>}
                </label>

                <label className="mt-4 block">
                    <span className={labelClass}>New password</span>
                    <input
                        type="password"
                        required
                        value={form.password}
                        onChange={set('password')}
                        className={fieldClass}
                        placeholder="••••••••••"
                    />
                    {errors.password && <p className={errorClass}>{errors.password}</p>}
                </label>

                <label className="mt-4 block">
                    <span className={labelClass}>Confirm new password</span>
                    <input
                        type="password"
                        required
                        value={form.password_confirmation}
                        onChange={set('password_confirmation')}
                        className={fieldClass}
                        placeholder="••••••••••"
                    />
                    {errors.password_confirmation && (
                        <p className={errorClass}>{errors.password_confirmation}</p>
                    )}
                </label>

                <div className="mt-6 flex flex-wrap items-center gap-4">
                    <button type="submit" disabled={busy} className={primaryButtonClass}>
                        {busy ? 'Saving…' : 'Change password'}
                    </button>
                    {message && (
                        <p className="flex items-center gap-2 font-label text-[10px] uppercase tracking-[0.14em] text-foreground/60">
                            <Check className="h-3.5 w-3.5" /> {message}
                        </p>
                    )}
                </div>
            </form>
        </div>
    );
};

export default PasswordPage;
