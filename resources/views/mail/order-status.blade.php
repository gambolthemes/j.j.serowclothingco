<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px;background:#f5f2e9;font-family:Helvetica,Arial,sans-serif;color:#141310;">
    <div style="max-width:640px;margin:0 auto;background:#fbf9f2;border:1px solid #141310;padding:28px;">
        <p style="margin:0;font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#6b665c;">
            J.J. Serow Clothing Co. — production update
        </p>
        <h1 style="margin:12px 0 0;font-size:34px;letter-spacing:-.5px;">{{ $order->code }}</h1>
        <p style="margin:14px 0 0;font-size:16px;">
            Your order is now <strong>{{ $order->statusLabel() }}</strong>.
        </p>
        @if ($note)
            <p style="margin:10px 0 0;font-size:14px;color:#4a463f;">{{ $note }}</p>
        @endif
        <p style="margin:24px 0 0;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#6b665c;">
            Track any time with code {{ $order->code }}
        </p>
    </div>
</body>
</html>
