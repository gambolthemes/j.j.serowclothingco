<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px;background:#f5f2e9;font-family:Helvetica,Arial,sans-serif;color:#141310;">
    <div style="max-width:640px;margin:0 auto;background:#fbf9f2;border:1px solid #141310;padding:28px;">
        <p style="margin:0;font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#6b665c;">
            J.J. Serow Clothing Co. — account
        </p>
        <h1 style="margin:12px 0 0;font-size:34px;letter-spacing:-.5px;">Reset your password</h1>
        <p style="margin:14px 0 0;font-size:16px;">
            Hello {{ $user->name }} — someone asked to reset the password for
            <strong>{{ $user->email }}</strong>. Use the button below to choose a new one.
        </p>
        <p style="margin:24px 0 0;">
            <a href="{{ $url }}" style="display:inline-block;background:#141310;color:#fbf9f2;text-decoration:none;padding:14px 22px;font-size:12px;letter-spacing:.16em;text-transform:uppercase;font-weight:600;">
                Choose a new password
            </a>
        </p>
        <p style="margin:20px 0 0;font-size:13px;color:#4a463f;">
            This link expires in {{ $expiresInMinutes }} minutes. If you did not ask for it, ignore
            this mail — nothing changes until the link is used.
        </p>
        <p style="margin:20px 0 0;font-size:12px;color:#6b665c;word-break:break-all;">
            Button not working? Paste this into your browser:<br>{{ $url }}
        </p>
    </div>
</body>
</html>
