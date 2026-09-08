import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api', async (importOriginal) => ({
    ...(await importOriginal()),
    getPaymentProfile: vi.fn(),
    savePaymentProfile: vi.fn(),
}));

import { getPaymentProfile, savePaymentProfile } from '@/lib/api';
import PaymentPage from '@/pages/account/PaymentPage';

const EMPTY_PROFILE = {
    legal_name: null,
    gstin: null,
    pan: null,
    preferred_method: null,
    method_label: null,
    upi_id: null,
    bank_account_name: null,
    bank_account_number: null,
    bank_ifsc: null,
    bank_name: null,
};

const response = (overrides = {}) => ({
    profile: { ...EMPTY_PROFILE, ...(overrides.profile ?? {}) },
    methods: { upi: 'UPI', neft: 'NEFT', rtgs: 'RTGS', imps: 'IMPS', cheque: 'Cheque / DD' },
    bank_methods: ['neft', 'rtgs', 'imps'],
    payTo: { upi: '', account_name: '', account_number: '', ifsc: '', bank_name: '', gstin: '', ...(overrides.payTo ?? {}) },
});

/** Waits out the initial load, which every test needs before touching the form. */
const renderPage = async () => {
    render(<PaymentPage />);

    return screen.findByRole('button', { name: /save payment details/i });
};

const chooseMethod = (value) =>
    fireEvent.change(screen.getByRole('combobox'), { target: { value } });

beforeEach(() => {
    getPaymentProfile.mockResolvedValue(response());
    savePaymentProfile.mockImplementation((payload) => Promise.resolve({ ...EMPTY_PROFILE, ...payload }));
});

describe('PaymentPage', () => {
    it('sends what the retailer typed', async () => {
        await renderPage();

        fireEvent.change(screen.getByPlaceholderText('22AAAAA0000A1Z5'), {
            target: { value: '22AAAAA0000A1Z5' },
        });
        fireEvent.click(screen.getByRole('button', { name: /save payment details/i }));

        await waitFor(() =>
            expect(savePaymentProfile).toHaveBeenCalledWith(
                expect.objectContaining({ gstin: '22AAAAA0000A1Z5' })
            )
        );
        expect(await screen.findByText(/payment details saved/i)).toBeInTheDocument();
    });

    /* Asking a cheque payer for an IFSC is how a form gets abandoned, so the
       bank block only appears for the methods that settle into an account. */
    it('asks for the bank account only when the method needs one', async () => {
        await renderPage();

        expect(screen.queryByPlaceholderText('HDFC0001234')).not.toBeInTheDocument();

        chooseMethod('neft');
        expect(screen.getByPlaceholderText('HDFC0001234')).toBeInTheDocument();

        chooseMethod('cheque');
        expect(screen.queryByPlaceholderText('HDFC0001234')).not.toBeInTheDocument();
    });

    it('asks for a UPI ID when UPI is the chosen method', async () => {
        await renderPage();

        expect(screen.queryByPlaceholderText('yourstore@okhdfcbank')).not.toBeInTheDocument();

        chooseMethod('upi');
        expect(screen.getByPlaceholderText('yourstore@okhdfcbank')).toBeInTheDocument();
    });

    /* A saved account has to stay visible and editable even though the method
       on file no longer requires it — otherwise it is stuck, uneditable. */
    it('keeps showing a saved bank account whatever the method', async () => {
        getPaymentProfile.mockResolvedValue(
            response({ profile: { preferred_method: 'cheque', bank_account_number: '50100123456789' } })
        );

        await renderPage();

        expect(screen.getByDisplayValue('50100123456789')).toBeInTheDocument();
    });

    it('shows the field error the server sent, against its own field', async () => {
        savePaymentProfile.mockRejectedValue({
            response: {
                status: 422,
                data: { errors: { gstin: ['That does not look like a GSTIN.'] } },
            },
        });

        await renderPage();
        fireEvent.click(screen.getByRole('button', { name: /save payment details/i }));

        expect(await screen.findByText(/does not look like a gstin/i)).toBeInTheDocument();
    });

    describe('where to pay', () => {
        it('shows the account once the desk has filled it in', async () => {
            getPaymentProfile.mockResolvedValue(
                response({ payTo: { upi: 'jjserow@okhdfcbank', account_number: '50100999888777' } })
            );

            await renderPage();

            expect(screen.getByText('jjserow@okhdfcbank')).toBeInTheDocument();
            expect(screen.getByText('50100999888777')).toBeInTheDocument();
        });

        /* Better no block at all than an empty one telling a retailer to
           transfer money to nowhere. */
        it('stays hidden while the settings are blank', async () => {
            await renderPage();

            expect(screen.queryByText(/where to send the advance/i)).not.toBeInTheDocument();
        });
    });

    it('says plainly that card details are never taken', async () => {
        await renderPage();

        expect(screen.getByText(/never ask for or store card details/i)).toBeInTheDocument();
    });
});
