import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({ login: vi.fn() }));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));

import LoginPage from '@/pages/LoginPage';

/** Renders the page at a location, so the reset screen's notice can be passed. */
const renderLogin = (state) =>
    render(
        <MemoryRouter initialEntries={[{ pathname: '/login', state }]}>
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/catalog" element={<p>Catalog</p>} />
            </Routes>
        </MemoryRouter>
    );

const signIn = (email = 'buyer@example.com', password = 'passwordtest123') => {
    fireEvent.change(screen.getByPlaceholderText('buyer@yourstore.in'), { target: { value: email } });
    fireEvent.change(screen.getByPlaceholderText('••••••••••'), { target: { value: password } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
};

const rejectWith = (status, data = {}) => {
    auth.login.mockRejectedValue({ response: { status, data } });
};

beforeEach(() => {
    auth.login = vi.fn().mockResolvedValue({ id: 1 });
});

describe('LoginPage', () => {
    it('sends the credentials and moves on to the catalog', async () => {
        renderLogin();
        signIn();

        await waitFor(() => expect(auth.login).toHaveBeenCalledWith('buyer@example.com', 'passwordtest123'));
        expect(await screen.findByText('Catalog')).toBeInTheDocument();
    });

    it('offers a way out for a forgotten password', () => {
        renderLogin();

        expect(screen.getByRole('link', { name: /forgot your password/i })).toHaveAttribute(
            'href',
            '/forgot-password'
        );
    });

    it('explains a rejected password without naming which half was wrong', async () => {
        rejectWith(422, { errors: { email: ['These credentials do not match our records.'] } });
        renderLogin();
        signIn();

        expect(await screen.findByText(/invalid email or password/i)).toBeInTheDocument();
    });

    /* Telling someone to check their spelling when the real answer is "wait a
       minute" only burns the attempts they have left. */
    it('passes the throttle message straight through on a 429', async () => {
        rejectWith(429, { message: 'Too many sign-in attempts. Wait a minute and try again.' });
        renderLogin();
        signIn();

        expect(await screen.findByText(/wait a minute and try again/i)).toBeInTheDocument();
        expect(screen.queryByText(/invalid email or password/i)).not.toBeInTheDocument();
    });

    it('shows the notice the reset screen hands over', () => {
        renderLogin({ notice: 'Password updated. Sign in with your new password.' });

        expect(screen.getByText(/password updated/i)).toBeInTheDocument();
    });

    it('does not show a notice when there is none', () => {
        renderLogin();

        expect(screen.queryByText(/password updated/i)).not.toBeInTheDocument();
    });
});
