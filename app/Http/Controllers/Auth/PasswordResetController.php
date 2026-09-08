<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/*
| "Forgot password" for retailers. Without it the only way back into a locked
| account is someone running artisan on the server, which is not a support
| process — a buyer in another city needs to be able to do this at 11pm.
|
| Both endpoints are guest routes and both are throttled in routes/web.php.
*/
class PasswordResetController extends Controller
{
    /**
     * Mails a signed reset link. The token itself lives in password_reset_tokens
     * and is hashed there, so a leaked database row cannot be replayed.
     */
    public function sendLink(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'string', 'email', 'max:255'],
        ]);

        $status = Password::sendResetLink($data);

        // Deliberately the same answer whether or not the address is on file.
        // Saying "no such account" would turn this form into a way to test which
        // of a competitor's buyers are registered here. RESET_THROTTLED is
        // folded in for the same reason — it only fires for a real account.
        if (in_array($status, [Password::RESET_LINK_SENT, Password::INVALID_USER, Password::RESET_THROTTLED], true)) {
            return response()->json([
                'status' => 'If that email is registered, a reset link is on its way. It expires in '
                    .config('auth.passwords.users.expire').' minutes.',
            ]);
        }

        throw ValidationException::withMessages(['email' => __($status)]);
    }

    /**
     * Consumes the token and sets the new password. The retailer signs in
     * afterwards rather than being logged in here: whoever is holding the link
     * has proved they can read the inbox, not that they are at a trusted device.
     */
    public function reset(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'string', 'email'],
            // Same rule as registration and the account password screen — one
            // minimum length across the app, or retailers learn three of them.
            'password' => ['required', 'string', 'min:10', 'confirmed'],
        ]);

        $status = Password::reset($data, function (User $user, string $password) {
            // Rotating remember_token drops any "remember me" cookie the old
            // password left lying around, which is the point of a reset.
            $user->forceFill([
                'password' => $password,
                'remember_token' => Str::random(60),
            ])->save();

            event(new PasswordReset($user));
        });

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages(['email' => __($status)]);
        }

        return response()->json(['status' => 'Password updated. Sign in with your new password.']);
    }
}
