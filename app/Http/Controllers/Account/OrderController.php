<?php

namespace App\Http\Controllers\Account;

use App\Http\Controllers\Controller;
use App\Mail\OrderPlaced;
use App\Models\Color;
use App\Models\Order;
use App\Models\Product;
use App\Models\Setting;
use App\Support\Payments\Gateways;
use App\Support\Pricing;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class OrderController extends Controller
{
    private function moqSets(): int
    {
        return (int) Setting::get('MOQ_SETS');
    }

    public function index(Request $request): JsonResponse
    {
        $orders = $request->user()->orders()->withCount('items')->get()
            ->map(fn (Order $order) => $this->summary($order));

        return response()->json(['orders' => $orders]);
    }

    public function show(Request $request, string $code): JsonResponse
    {
        $order = $request->user()->orders()
            ->with(['items', 'payments'])
            ->where('code', strtoupper(trim($code)))
            ->firstOrFail();

        return response()->json(['order' => $this->summary($order) + [
            'shipping_address' => $order->shipping_address,
            'billing_profile' => $order->billing_profile,
            // Where the advance goes. Sent with the order rather than in the
            // public page payload, so the account details reach retailers and
            // not every visitor's page source.
            'pay_to' => Setting::payTo(),
            'notes' => $order->notes,
            'can_cancel' => in_array($order->status, self::CANCELLABLE, true),
            'payments' => $order->payments->map(fn ($payment) => $payment->payload()),
            // Only offered while the order is actually payable, and only for
            // gateways that are configured — an empty list is the normal state
            // on a site that takes bank transfers alone.
            'payment_options' => $order->status === 'placed' ? Gateways::options() : [],
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
            'items.*.product_id' => ['required', 'string', 'max:80', Rule::exists('products', 'slug')->where('is_active', true)],
            'items.*.color_name' => ['required', 'string', 'max:80', Rule::exists('colors', 'name')],
            'items.*.ratio' => ['required', 'array'],
            'items.*.ratio.*' => ['integer', 'min:0', 'max:999'],
            'items.*.sets' => ['required', 'integer', 'min:'.$this->moqSets(), 'max:100000'],
            'items.*.private_label' => ['boolean'],
            'items.*.sample' => ['boolean'],
            'address_id' => ['nullable', 'integer'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $address = isset($data['address_id'])
            ? $request->user()->addresses()->find($data['address_id'])
            : $request->user()->addresses()->where('is_default', true)->first();

        // Prices are never taken from the browser. Each line is re-priced from
        // the catalog and the settings table, so a crafted request cannot book
        // an order at a price we do not sell at.
        $products = Product::with('colors')
            ->whereIn('slug', array_column($data['items'], 'product_id'))
            ->get()
            ->keyBy('slug');
        $colors = Color::whereIn('name', array_column($data['items'], 'color_name'))->get()->keyBy('name');

        // Stock is per product AND colour, so it cannot be a validation rule on
        // either field alone. Checked here, because the button being disabled in
        // the browser is not something the server can rely on.
        $soldOut = [];

        foreach ($data['items'] as $index => $item) {
            $status = $products[$item['product_id']]
                ->colors->firstWhere('name', $item['color_name'])?->pivot->status;

            if ($status === 'out_of_stock') {
                $soldOut["items.{$index}.color_name"] = [
                    $products[$item['product_id']]->name.' is out of stock in '.$item['color_name'].'.',
                ];
            }
        }

        if ($soldOut) {
            throw ValidationException::withMessages($soldOut);
        }

        $lines = array_map(function (array $item) use ($products, $colors) {
            $product = $products[$item['product_id']];
            $color = $colors[$item['color_name']];
            $base = Pricing::colorBase($product, $color);
            $privateLabel = (bool) ($item['private_label'] ?? false);
            $sample = (bool) ($item['sample'] ?? false);

            return [
                'product_id' => $product->slug,
                'product_name' => $product->name,
                'color_name' => $color->name,
                'ratio' => $item['ratio'],
                'sets' => $item['sets'],
                'private_label' => $privateLabel,
                'sample' => $sample,
                'per_set_price' => Pricing::perSetPrice($base, $item['sets'], $item['ratio'], $privateLabel),
                'line_total' => Pricing::lineTotal($base, $item['sets'], $item['ratio'], $privateLabel, $sample),
            ];
        }, $data['items']);

        $subtotal = round(array_sum(array_column($lines, 'line_total')), 2);
        $gst = round($subtotal * (float) Setting::get('GST_RATE'), 2);

        $order = DB::transaction(function () use ($request, $data, $lines, $address, $subtotal, $gst) {
            $order = $request->user()->orders()->create([
                // `code` is unique and the real one needs the id, so the
                // placeholder has to be unique too — a fixed string makes
                // concurrent checkouts block on each other's row lock.
                'code' => 'TMP-'.Str::random(16),
                'status' => 'placed',
                'total_sets' => array_sum(array_column($lines, 'sets')),
                'subtotal' => $subtotal,
                'gst' => $gst,
                'total' => $subtotal + $gst,
                'shipping_address' => $address?->only([
                    'label', 'contact_name', 'phone', 'gstin',
                    'line1', 'line2', 'city', 'state', 'pincode',
                ]),
                // Snapshotted for the same reason as the address: the invoice
                // has to keep the tax identity that was current on the day, not
                // whatever the retailer edits into their profile next month.
                'billing_profile' => $request->user()->paymentProfile?->invoiceSnapshot(),
                'notes' => $data['notes'] ?? null,
                'placed_at' => now(),
            ]);

            // Derived from the id so it is unique without a retry loop, and
            // lands in the JS-2xxx range the retailers already recognise.
            $order->forceFill(['code' => 'JS-'.(2040 + $order->id)])->save();

            $order->items()->createMany($lines);

            $order->statusEvents()->create([
                'user_id' => $request->user()->id,
                'actor_name' => $request->user()->name,
                'from_status' => null,
                'to_status' => 'placed',
                'note' => 'Order confirmed from the cart',
                'created_at' => now(),
            ]);

            return $order;
        });

        // Queued rather than sent inline: with a real SMTP server, sending here
        // would make every checkout wait on the mail handshake. The try/catch
        // stays because pushing the job can fail too, and no mail problem may
        // lose an order that is already committed — the retailer is about to be
        // handed to WhatsApp either way.
        try {
            Mail::to($request->user()->email)->queue(new OrderPlaced($order));
        } catch (\Throwable $e) {
            Log::warning('Order confirmation mail failed', ['code' => $order->code, 'error' => $e->getMessage()]);
        }

        return response()->json(['order' => $this->summary($order->fresh())], 201);
    }

    /**
     * Statuses a retailer may still walk away from. Once fabric is cut the
     * order stops being theirs to cancel — that conversation goes to WhatsApp.
     */
    private const CANCELLABLE = ['placed', 'payment_received'];

    public function cancel(Request $request, string $code): JsonResponse
    {
        $data = $request->validate(['reason' => ['nullable', 'string', 'max:500']]);

        $order = $request->user()->orders()->where('code', strtoupper(trim($code)))->firstOrFail();

        if (! in_array($order->status, self::CANCELLABLE, true)) {
            return response()->json([
                'message' => 'This order is already in production. Message us on WhatsApp to change it.',
            ], 422);
        }

        $from = $order->status;
        $order->update(['status' => 'cancelled']);

        $order->statusEvents()->create([
            'user_id' => $request->user()->id,
            'actor_name' => $request->user()->name,
            'from_status' => $from,
            'to_status' => 'cancelled',
            'note' => $data['reason'] ?? 'Cancelled by the retailer',
            'created_at' => now(),
        ]);

        return response()->json(['order' => $this->summary($order->fresh())]);
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
