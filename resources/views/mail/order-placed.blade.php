@php
    $inr = fn ($n) => '₹'.number_format((float) $n, 0, '.', ',');
@endphp
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px;background:#f5f2e9;font-family:Helvetica,Arial,sans-serif;color:#141310;">
    <div style="max-width:640px;margin:0 auto;background:#fbf9f2;border:1px solid #141310;padding:28px;">
        <p style="margin:0;font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#6b665c;">
            J.J. Serow Clothing Co. — order received
        </p>
        <h1 style="margin:12px 0 0;font-size:34px;letter-spacing:-.5px;">{{ $order->code }}</h1>
        <p style="margin:8px 0 0;font-size:14px;color:#4a463f;">
            Thanks {{ $order->user->name }} — we have your order for {{ $order->user->company }}.
            Production runs on a {{ $leadDays }}-day estimate from the moment payment is confirmed.
        </p>

        <table style="width:100%;border-collapse:collapse;margin-top:24px;font-size:14px;">
            <tr style="text-align:left;border-bottom:1px solid #141310;">
                <th style="padding:8px 0;font-size:11px;letter-spacing:.12em;text-transform:uppercase;">Style</th>
                <th style="padding:8px 0;font-size:11px;letter-spacing:.12em;text-transform:uppercase;">Colour</th>
                <th style="padding:8px 0;font-size:11px;letter-spacing:.12em;text-transform:uppercase;">Sets</th>
                <th style="padding:8px 0;font-size:11px;letter-spacing:.12em;text-transform:uppercase;text-align:right;">Total</th>
            </tr>
            @foreach ($order->items as $item)
                <tr style="border-bottom:1px solid #ddd8cc;">
                    <td style="padding:10px 0;">{{ $item->product_name }}</td>
                    <td style="padding:10px 0;">{{ $item->color_name }}</td>
                    <td style="padding:10px 0;">{{ $item->sets }}</td>
                    <td style="padding:10px 0;text-align:right;">{{ $inr($item->line_total) }}</td>
                </tr>
            @endforeach
        </table>

        <table style="width:100%;margin-top:16px;font-size:14px;">
            <tr><td style="padding:3px 0;color:#4a463f;">Subtotal</td><td style="text-align:right;">{{ $inr($order->subtotal) }}</td></tr>
            <tr><td style="padding:3px 0;color:#4a463f;">GST</td><td style="text-align:right;">{{ $inr($order->gst) }}</td></tr>
            <tr><td style="padding:8px 0;border-top:1px solid #141310;font-weight:bold;">Total</td>
                <td style="padding:8px 0;border-top:1px solid #141310;text-align:right;font-size:22px;font-weight:bold;">{{ $inr($order->total) }}</td></tr>
        </table>

        <p style="margin:24px 0 0;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#6b665c;">
            100% advance • Track this order with code {{ $order->code }}
        </p>
    </div>
</body>
</html>
