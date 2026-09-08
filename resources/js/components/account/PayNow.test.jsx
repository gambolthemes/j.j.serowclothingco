import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api', async (importOriginal) => ({
    ...(await importOriginal()),
    startPayment: vi.fn(),
    confirmPayment: vi.fn(),
}));
vi.mock('@/lib/loadScript', () => ({ loadScript: vi.fn(() => Promise.resolve()) }));

import { confirmPayment, startPayment } from '@/lib/api';
import { loadScript } from '@/lib/loadScript';
import PayNow from '@/components/account/PayNow';

const RAZORPAY = { key: 'razorpay', label: 'Pay in rupees', blurb: 'UPI, netbanking…', currency: 'INR' };
const PAYPAL = { key: 'paypal', label: 'Pay with PayPal', blurb: 'For buyers outside India…', currency: 'USD' };

const order = (options = [RAZORPAY]) => ({
    code: 'JS-2041',
    total: 403200,
    payment_options: options,
});

/** Captures the config PayNow hands the Razorpay SDK, so `handler` can be fired. */
let razorpayConfig;
let razorpayOpened;

beforeEach(() => {
    razorpayConfig = null;
    razorpayOpened = false;

    window.Razorpay = vi.fn(function Razorpay(config) {
        razorpayConfig = config;
        this.open = () => {
            razorpayOpened = true;
        };
    });

    startPayment.mockResolvedValue({
        gateway: 'razorpay',
        client: { key: 'rzp_test_key', order_id: 'order_RZP123', amount: 40320000, currency: 'INR' },
    });
    confirmPayment.mockResolvedValue({ status: 'paid' });
});

afterEach(() => {
    delete window.Razorpay;
    delete window.paypal;
});

describe('PayNow', () => {
    /* An order with no configured gateway must not show a dead "pay" box —
       the retailer's route is the bank transfer, and saying otherwise is worse
       than saying nothing. */
    it('renders nothing when no gateway is configured', () => {
        const { container } = render(<PayNow order={order([])} />);

        expect(container).toBeEmptyDOMElement();
    });

    it('lists a button per available gateway with what it will do', () => {
        render(<PayNow order={order([RAZORPAY, PAYPAL])} />);

        expect(screen.getByRole('button', { name: /pay in rupees/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /pay with paypal/i })).toBeInTheDocument();
        expect(screen.getByText(/for buyers outside india/i)).toBeInTheDocument();
    });

    it('shows the amount the order is actually for', () => {
        render(<PayNow order={order()} />);

        expect(screen.getByText(/₹4,03,200/)).toBeInTheDocument();
    });

    it('opens a payment and hands the SDK what the server sent back', async () => {
        render(<PayNow order={order()} />);

        await userEvent.click(screen.getByRole('button', { name: /pay in rupees/i }));

        await waitFor(() => expect(razorpayOpened).toBe(true));
        expect(startPayment).toHaveBeenCalledWith('JS-2041', 'razorpay');
        expect(loadScript).toHaveBeenCalledWith(expect.stringContaining('checkout.razorpay.com'));
        expect(razorpayConfig.order_id).toBe('order_RZP123');
    });

    /* The whole point of the confirm step: the gateway's response goes to the
       server, which decides whether it counts. Nothing here marks it paid. */
    it('posts the gateway response back for the server to verify', async () => {
        const onPaid = vi.fn();
        render(<PayNow order={order()} onPaid={onPaid} />);

        await userEvent.click(screen.getByRole('button', { name: /pay in rupees/i }));
        await waitFor(() => expect(razorpayConfig).not.toBeNull());

        const response = {
            razorpay_order_id: 'order_RZP123',
            razorpay_payment_id: 'pay_ABC',
            razorpay_signature: 'signed',
        };
        await act(() => razorpayConfig.handler(response));

        expect(confirmPayment).toHaveBeenCalledWith('JS-2041', {
            gateway: 'razorpay',
            gatewayOrderId: 'order_RZP123',
            payload: response,
        });
        await waitFor(() => expect(onPaid).toHaveBeenCalled());
    });

    it('reports a payment the server would not verify, and does not claim success', async () => {
        confirmPayment.mockRejectedValue({
            response: { status: 422, data: { message: 'We could not verify that payment.' } },
        });
        const onPaid = vi.fn();

        render(<PayNow order={order()} onPaid={onPaid} />);
        await userEvent.click(screen.getByRole('button', { name: /pay in rupees/i }));
        await waitFor(() => expect(razorpayConfig).not.toBeNull());

        await act(() => razorpayConfig.handler({ razorpay_order_id: 'order_RZP123' }));

        expect(await screen.findByText(/could not verify that payment/i)).toBeInTheDocument();
        expect(onPaid).not.toHaveBeenCalled();
    });

    it('surfaces a refusal to open the payment at all', async () => {
        startPayment.mockRejectedValue({
            response: { status: 422, data: { message: 'This order is already paid.' } },
        });

        render(<PayNow order={order()} />);
        await userEvent.click(screen.getByRole('button', { name: /pay in rupees/i }));

        expect(await screen.findByText(/already paid/i)).toBeInTheDocument();
    });

    /* Closing the gateway's window is a change of mind, not an error — the
       buttons have to come back enabled. */
    it('re-enables the buttons when the retailer dismisses the modal', async () => {
        render(<PayNow order={order()} />);
        const button = screen.getByRole('button', { name: /pay in rupees/i });

        await userEvent.click(button);
        await waitFor(() => expect(razorpayConfig).not.toBeNull());
        expect(button).toBeDisabled();

        act(() => razorpayConfig.modal.ondismiss());

        await waitFor(() => expect(button).toBeEnabled());
    });

    it('loads the PayPal SDK the server named and renders its own button', async () => {
        const buttons = { render: vi.fn() };
        window.paypal = { Buttons: vi.fn(() => buttons) };

        startPayment.mockResolvedValue({
            gateway: 'paypal',
            client: {
                order_id: 'PPORDER1',
                client_id: 'paypal-client',
                currency: 'USD',
                amount: '4840.00',
                sdk_url: 'https://www.paypal.com/sdk/js?client-id=paypal-client&currency=USD',
            },
        });

        render(<PayNow order={order([PAYPAL])} />);
        await userEvent.click(screen.getByRole('button', { name: /pay with paypal/i }));

        await waitFor(() => expect(buttons.render).toHaveBeenCalled());
        expect(loadScript).toHaveBeenCalledWith(expect.stringContaining('paypal.com/sdk/js'));
        expect(window.paypal.Buttons.mock.calls[0][0].createOrder()).toBe('PPORDER1');
    });
});
