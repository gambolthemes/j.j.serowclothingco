<?php

namespace App\Http\Controllers\Account;

use App\Http\Controllers\Controller;
use App\Models\Cart;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * The retailer's cart, kept against the account instead of one browser's
 * localStorage. A cart started on the shop laptop now opens on the phone.
 *
 * The payload is the same shape the React CartContext holds, camelCase and all,
 * so neither side has to translate. It carries no prices on purpose — see
 * App\Models\Cart.
 */
class CartController extends Controller
{
    /** How many distinct lines a cart may hold; well past any real order. */
    private const MAX_LINES = 60;

    public function show(Request $request): JsonResponse
    {
        $cart = $request->user()->cart;

        return response()->json([
            'items' => $cart?->items ?? [],
            'updated_at' => $cart?->updated_at?->toAtomString(),
        ]);
    }

    /**
     * Replaces the stored cart outright. The client owns the merge — it is the
     * side that knows what the retailer just did — so a partial update here
     * would only give the two copies a way to disagree.
     */
    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'items' => ['present', 'array', 'max:'.self::MAX_LINES],
            // The key is the client's identity for a line (product + colour +
            // ratio + options). Stored as sent so the two sides can match lines
            // up without recomputing it.
            'items.*.key' => ['required', 'string', 'max:400'],
            'items.*.productId' => ['required', 'string', 'max:120'],
            'items.*.colorName' => ['required', 'string', 'max:80'],
            'items.*.sets' => ['required', 'integer', 'min:1', 'max:100000'],
            'items.*.ratio' => ['required', 'array', 'min:1', 'max:10'],
            'items.*.ratio.*' => ['required', 'integer', 'min:0', 'max:10000'],
            'items.*.privateLabel' => ['nullable', 'boolean'],
            'items.*.sample' => ['nullable', 'boolean'],
        ], [
            'items.max' => 'That is more lines than a cart can hold. Place what you have and start another.',
        ]);

        // Rebuilt field by field rather than stored as received: without this a
        // client could park anything it liked in the JSON column, and every
        // screen that reads a cart back would have to distrust it.
        $items = array_map(fn (array $item) => [
            'key' => $item['key'],
            'productId' => $item['productId'],
            'colorName' => $item['colorName'],
            'ratio' => array_map('intval', $item['ratio']),
            'sets' => (int) $item['sets'],
            'privateLabel' => (bool) ($item['privateLabel'] ?? false),
            'sample' => (bool) ($item['sample'] ?? false),
        ], $data['items']);

        // An empty cart is deleted rather than stored: the row exists to say
        // "this retailer has something waiting", and an empty one says nothing.
        if ($items === []) {
            $request->user()->cart()->delete();

            return response()->json(['items' => [], 'updated_at' => null]);
        }

        $cart = Cart::updateOrCreate(['user_id' => $request->user()->id], ['items' => $items]);

        return response()->json([
            'items' => $cart->items,
            'updated_at' => $cart->updated_at->toAtomString(),
        ]);
    }
}
