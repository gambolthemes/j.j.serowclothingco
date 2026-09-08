<?php

namespace App\Mail;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/** Sent to the retailer whenever staff move an order along the timeline. */
class OrderStatusChanged extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Order $order, public ?string $note = null) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Order {$this->order->code} is now {$this->order->statusLabel()}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'mail.order-status',
            with: ['order' => $this->order, 'note' => $this->note],
        );
    }
}
