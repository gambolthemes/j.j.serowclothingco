<?php

namespace App\Mail;

use App\Models\Order;
use App\Models\Setting;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Sent to the retailer the moment a cart is confirmed, with the wholesale desk
 * copied in. Until now the only record of an order was the WhatsApp message the
 * retailer had to actually send.
 */
class OrderPlaced extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Order $order) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Order {$this->order->code} received — J.J. Serow Clothing Co.",
            cc: [Setting::get('COMPANY_EMAIL')],
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'mail.order-placed',
            with: [
                'order' => $this->order->loadMissing('items'),
                'leadDays' => Setting::get('LEAD_DAYS'),
            ],
        );
    }
}
