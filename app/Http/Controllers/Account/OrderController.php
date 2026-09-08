<?php

namespace App\Http\Controllers\Account;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class OrderController extends Controller
{
    /** GST charged on every wholesale invoice. Mirrors GST_RATE in lib/pricing.js. */
    private const GST_RATE = 0.05;

    /** Minimum sets per colour line. Mirrors MOQ_SETS in lib/pricing.js. */
    private const MOQ_SETS = 10;

    public function index(Request $request): JsonResponse
    {
        $orders = $request->user()->orders()->withCount('items')->get()
            ->map(fn (Order $order) => $this->summary($order));

        return response()->json(['orders' => $orders]);
    }

    public function show(Request $request, string $code): JsonResponse
    {
        $order = $request->user()->orders()->with('items')->where('code', strtoupper(trim($code)))->firstOrFail();

        return response()->json(['order' => $this->summary($order) + [
            'shipping_address' => $order->shipping_address,
            'notes' => $order->notes,
            'items' => $order->items->map(fn ($item) => [
                'id' => $item->id,
                'product_id' => $item->product_id,
                'product_name' => $item->product_name,
                'color_name' => $item->color_name,
                'ratio' => $item->ratio,
                'sets' => $item->sets,
                'private_label' => $item->private_label,
                'sample' => $item->sample,
                'per_set_price' => (float) $item->per_set_price,
                'line_total' => (float) $item->line_total,
            ]),
        ]]);
    }

    /**
     * Records the cart before the retailer is handed off to WhatsApp, so the
     * code they quote there resolves to a real order.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'string', 'max:80'],
            'items.*.product_name' => ['required', 'string', 'max:160'],
            'items.*.color_name' => ['required', 'string', 'max:80'],
            'items.*.ratio' => ['required', 'array'],
            'items.*.ratio.*' => ['integer', 'min:0', 'max:999'],
            'items.*.sets' => ['required', 'integer', 'min:'.self::MOQ_SETS, 'max:100000'],
            'items.*.private_label' => ['boolean'],
            'items.*.sample' => ['boolean'],
            'items.*.per_set_price' => ['required', 'numeric', 'min:0', 'max:1000000'],
            'items.*.line_total' => ['required', 'numeric', 'min:0', 'max:100000000'],
            'address_id' => ['nullable', 'integer'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $address = isset($data['address_id'])
            ? $request->user()->addresses()->find($data['address_id'])
            : $request->user()->addresses()->where('is_default', true)->first();

        // Only the per-line figures come from the client; the invoice arithmetic
        // is done here so the stored totals always agree with the lines.
        $subtotal = round(array_sum(array_column($data['items'], 'line_total')), 2);
        $gst = round($subtotal * self::GST_RATE, 2);

        $order = DB::transaction(function () use ($request, $data, $address, $subtotal, $gst) {
            $order = $request->user()->orders()->create([
                // `code` is unique and the real one needs the id, so the
                // placeholder has to be unique too — a fixed string makes
                // concurrent checkouts block on each other's row lock.
                'code' => 'TMP-'.Str::random(16),
                'status' => 'placed',
                'total_sets' => array_sum(array_column($data['items'], 'sets')),
                'subtotal' => $subtotal,
                'gst' => $gst,
                'total' => $subtotal + $gst,
                'shipping_address' => $address?->only([
                    'label', 'contact_name', 'phone', 'gstin',
                    'line1', 'line2', 'city', 'state', 'pincode',
                ]),
                'notes' => $data['notes'] ?? null,
                'placed_at' => now(),
            ]);

            // Derived from the id so it is unique without a retry loop, and
            // lands in the JS-2xxx range the retailers already recognise.
            $order->forceFill(['code' => 'JS-'.(2040 + $order->id)])->save();

            $order->items()->createMany(array_map(fn (array $item) => [
                'product_id' => $item['product_id'],
                'product_name' => $item['product_name'],
                'color_name' => $item['color_name'],
                'ratio' => $item['ratio'],
                'sets' => $item['sets'],
                'private_label' => $item['private_label'] ?? false,
                'sample' => $item['sample'] ?? false,
                'per_set_price' => $item['per_set_price'],
                'line_total' => $item['line_total'],
            ], $data['items']));

            return $order;
        });

        return response()->json(['order' => $this->summary($order->fresh())], 201);
    }

    /**
     * @return array<string, mixed>
     */
    private function summary(Order $order): array
    {
        return [
            'code' => $order->code,
            'status' => $order->status,
            'status_label' => $order->statusLabel(),
            'stage_index' => $order->stageIndex(),
            'total_sets' => $order->total_sets,
            'subtotal' => (float) $order->subtotal,
            'gst' => (float) $order->gst,
            'total' => (float) $order->total,
            'items_count' => $order->items_count ?? $order->items()->count(),
            'placed_at' => $order->placed_at->toIso8601String(),
        ];
    }
}
