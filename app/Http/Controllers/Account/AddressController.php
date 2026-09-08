<?php

namespace App\Http\Controllers\Account;

use App\Http\Controllers\Controller;
use App\Models\Address;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AddressController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json(['addresses' => $request->user()->addresses]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);

        $address = $request->user()->addresses()->create($data);

        // The first address a retailer saves is the one everything ships to.
        if (($data['is_default'] ?? false) || $request->user()->addresses()->count() === 1) {
            $address->makeDefault();
        }

        return response()->json(['address' => $address->fresh()], 201);
    }

    public function update(Request $request, Address $address): JsonResponse
    {
        $this->authorizeOwner($request, $address);

        $data = $this->validated($request);
        $address->update($data);

        if ($data['is_default'] ?? false) {
            $address->makeDefault();
        } else {
            // Unchecking the box means "not this one", so hand the default to a
            // different address — but never leave the account without one.
            $this->ensureOneDefault($request, $address->id);
        }

        return response()->json(['address' => $address->fresh()]);
    }

    public function destroy(Request $request, Address $address): JsonResponse
    {
        $this->authorizeOwner($request, $address);

        $wasDefault = $address->is_default;
        $address->delete();

        if ($wasDefault) {
            $this->ensureOneDefault($request);
        }

        return response()->json(['status' => 'deleted']);
    }

    private function authorizeOwner(Request $request, Address $address): void
    {
        abort_unless($address->user_id === $request->user()->id, 404);
    }

    /**
     * Never leave the account without a default while addresses remain.
     * `$avoid` is an address the caller would rather not pick — it is used
     * anyway if it is the only one left.
     */
    private function ensureOneDefault(Request $request, ?int $avoid = null): void
    {
        if ($request->user()->addresses()->where('is_default', true)->exists()) {
            return;
        }

        $next = $avoid === null
            ? $request->user()->addresses()->first()
            : $request->user()->addresses()->whereKeyNot($avoid)->first()
                ?? $request->user()->addresses()->first();

        $next?->makeDefault();
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request): array
    {
        return $request->validate([
            'label' => ['required', 'string', 'max:60'],
            'contact_name' => ['required', 'string', 'max:120'],
            'phone' => ['required', 'string', 'max:20'],
            'gstin' => ['nullable', 'string', 'max:20'],
            'line1' => ['required', 'string', 'max:200'],
            'line2' => ['nullable', 'string', 'max:200'],
            'city' => ['required', 'string', 'max:80'],
            'state' => ['required', 'string', 'max:80'],
            'pincode' => ['required', 'string', 'regex:/^\d{6}$/'],
            'is_default' => ['boolean'],
        ]);
    }
}
