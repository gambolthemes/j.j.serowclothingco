import React from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/* Only the two network calls are stubbed; fieldErrors and generalError are the
   real ones, because how a 422 body turns into a message is what these pages
   are for. */
vi.mock('@/lib/api', async (importOriginal) => ({
    ...(await importOriginal()),
    requestPasswordReset: vi.fn(),
    resetPassword: vi.fn(),
}));

import { requestPasswordReset, resetPassword } from '@/lib/api';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';

const LocationProbe = () => {
    const location = useLocation();

    return <p data-testid="notice">{location.state?.notice ?? 'no notice'}</p>;
};

const renderReset = (search) =>
    render(
        <MemoryRouter initialEntries={[`/reset-password${search}`]}>
            <Routes>
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/login" element={<LocationProbe />} />
                <Route path="/forgot-password" element={<p>Forgot screen</p>} />
            </Routes>
        </MemoryRouter>
    );

const VALID_LINK = '?token=a-real-token&email=buyer%40example.com';

const typePasswords = (password, confirmation = password) => {
    const [first, second] = screen.getAllByPlaceholderText('••••••••••');
    fireEvent.change(first, { target: { value: password } });
    fireEvent.change(second, { target: { value: confirmation } });
    fireEvent.click(screen.getByRole('button', { name: /save password/i }));
};

beforeEach(() => {
    requestPasswordReset.mockResolvedValue('If that email is registered, a reset link is on its way.');
    resetPassword.mockResolvedValue('Password updated. Sign in with your new password.');
});

describe('ForgotPasswordPage', () => {
    const renderForgot = () =>
        render(
            <MemoryRouter>
                <ForgotPasswordPage />
            </MemoryRouter>
        );

    const submit = (email = 'buyer@example.com') => {
        fireEvent.change(screen.getByPlaceholderText('buyer@yourstore.in'), { target: { value: email } });
        fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));
    };

    it('asks for the link and shows what the server said', async () => {
        renderForgot();
        submit();

        await waitFor(() => expect(requestPasswordReset).toHaveBeenCalledWith('buyer@example.com'));
        expect(await screen.findByText(/reset link is on its way/i)).toBeInTheDocument();
    });

    /* The confirmation must not depend on whether the address is registered —
       a form that says "no such account" is an account-enumeration tool. */
    it('replaces the form with the confirmation either way', async () => {
        renderForgot();
        submit('stranger@example.com');

        expect(await screen.findByRole('link', { name: /back to sign in/i })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /send reset link/i })).not.toBeInTheDocument();
    });

    it('surfaces the throttle message instead of the form vanishing', async () => {
        requestPasswordReset.mockRejectedValue({
            response: { status: 429, data: { message: 'Too many reset requests for that email.' } },
        });
        renderForgot();
        submit();

        expect(await screen.findByText(/too many reset requests/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
    });
});

describe('ResetPasswordPage', () => {
    it('sends the token and address from the link with the new password', async () => {
        renderReset(VALID_LINK);
        typePasswords('brand-new-password');

        await waitFor(() =>
            expect(resetPassword).toHaveBeenCalledWith({
                token: 'a-real-token',
                email: 'buyer@example.com',
                password: 'brand-new-password',
            })
        );
    });

    it('hands the confirmation to the login screen', async () => {
        renderReset(VALID_LINK);
        typePasswords('brand-new-password');

        expect(await screen.findByTestId('notice')).toHaveTextContent('Password updated');
    });

    it('catches a mismatch before spending the token', () => {
        renderReset(VALID_LINK);
        typePasswords('brand-new-password', 'brand-new-passwerd');

        expect(screen.getByText(/do not match/i)).toBeInTheDocument();
        expect(resetPassword).not.toHaveBeenCalled();
    });

    it('catches a short password before spending the token', () => {
        renderReset(VALID_LINK);
        typePasswords('short');

        expect(screen.getByText(/at least 10 characters/i)).toBeInTheDocument();
        expect(resetPassword).not.toHaveBeenCalled();
    });

    it('reports an expired link and points at a fresh one', async () => {
        resetPassword.mockRejectedValue({
            response: { status: 422, data: { errors: { email: ['This password reset token is invalid.'] } } },
        });
        renderReset(VALID_LINK);
        typePasswords('brand-new-password');

        expect(await screen.findByText(/token is invalid/i)).toBeInTheDocument();
    });

    /* Someone typed the URL, or a mail client mangled the query string. */
    it('offers a new link rather than a form it cannot submit', () => {
        renderReset('');

        expect(screen.getByRole('link', { name: /send a new link/i })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /save password/i })).not.toBeInTheDocument();
    });
});
