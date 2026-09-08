import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CreditCard, Loader2 } from 'lucide-react';
import { confirmPayment, generalError, startPayment } from '@/lib/api';
import { loadScript } from '@/lib/loadScript';
import { inr } from '@/lib/pricing';
import { ghostButtonClass } from '@/components/account/ui';

const RAZORPAY_SDK = 'https://checkout.razorpay.com/v1/checkout.js';

/*
 * Paying an order online, for whichever gateways the server says are configured.
 *
 * The two flows differ in shape: Razorpay opens a modal we drive, while PayPal
 * renders its own button into a container. Both end in the same place — the
 * gateway's response is posted back and the *server* decides whether it counts.
 * Nothing here marks anything paid.
 *
 * The SDKs load on click rather than with the page. Most retailers here pay by
 * bank transfer and will never touch either, and neither is a script worth
 * running on an account page for nothing.
 */
const PayNow = ({ order, onPaid }) => {
    const [active, setActive] = useState(null); // gateway key being worked on
    const [error, setError] = useState('');
    const [paypal, setPaypal] = useState(null); // { client } once PayPal is open
    const paypalSlot = useRef(null);
    const alive = useRef(true);

    useEffect(() => () => {
        alive.current = false;
    }, []);

    const options = order?.payment_options ?? [];

    const settle = useCallback(
        async (gateway, gatewayOrderId, payload) => {
            try {
                await confirmPayment(order.code, { gateway, gatewayOrderId, payload });
                if (alive.current) onPaid?.();
            } catch (err) {
                if (!alive.current) return;
                setError(
                    generalError(
                        err,
                        'We could not confirm that payment. If money left your account, send us the reference on WhatsApp.'
                    )
                );
            } finally {
                if (alive.current) setActive(null);
            }
        },
        [order?.code, onPaid]
    );

    const payWithRazorpay = async (client) => {
        await loadScript(RAZORPAY_SDK);

        const checkout = new window.Razorpay({
            ...client,
            handler: (response) => settle('razorpay', client.order_id, response),
            // Closing the modal is not a failure — the retailer can try again,
            // and the payment row stays open until it is used or replaced.
            modal: { ondismiss: () => alive.current && setActive(null) },
        });

        checkout.open();
    };

    const payWithPayPal = async (client) => {
        await loadScript(client.sdk_url);

        if (!alive.current) return;

        setPaypal({ client });
        // The container is rendered by the state change above, so the button
        // has somewhere to go only after React has painted it.
        await Promise.resolve();

        window.paypal
            .Buttons({
                createOrder: () => client.order_id,
                onApprove: () => settle('paypal', client.order_id, { paypal_order_id: client.order_id }),
                onCancel: () => alive.current && setActive(null),
                onError: () =>
                    alive.current && setError('PayPal could not complete that payment. Try again.'),
            })
            .render(paypalSlot.current);
    };

    const begin = async (gateway) => {
        if (active) return;

        setError('');
        setPaypal(null);
        setActive(gateway);

        try {
            const { client } = await startPayment(order.code, gateway);

            if (!alive.current) return;

            if (gateway === 'razorpay') await payWithRazorpay(client);
            else await payWithPayPal(client);
        } catch (err) {
            if (!alive.current) return;
            setError(generalError(err, 'Could not start that payment. Try again in a moment.'));
            setActive(null);
        }
    };

    if (options.length === 0) return null;

    return (
        <div className="mt-8 border border-foreground bg-card p-5">
            <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" strokeWidth={2} />
                <h2 className="font-label text-[11px] font-semibold uppercase tracking-[0.2em]">
                    Pay {inr(order.total)} now
                </h2>
            </div>
            <p className="mt-2 text-sm text-foreground/65">
                Production starts as soon as payment clears. You can still pay by bank transfer and send
                the receipt on WhatsApp.
            </p>

            <div className="mt-4 grid gap-3">
                {options.map((option) => (
                    <button
                        key={option.key}
                        type="button"
                        onClick={() => begin(option.key)}
                        disabled={Boolean(active)}
                        className={`${ghostButtonClass} h-auto flex-col items-start gap-1 py-3 text-left disabled:opacity-50`}
                    >
                        <span className="flex items-center gap-2">
                            {active === option.key && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                            {option.label}
                        </span>
                        <span className="font-label text-[10px] normal-case tracking-normal text-foreground/55">
                            {option.blurb}
                        </span>
                    </button>
                ))}
            </div>

            {/* PayPal draws its own button, and only once a payment is open. */}
            <div ref={paypalSlot} className={paypal ? 'mt-4' : 'hidden'} />

            {error && (
                <p className="mt-4 border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                </p>
            )}
        </div>
    );
};

export default PayNow;
