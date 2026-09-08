<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Mail\OrderStatusChanged;
use App\Models\Color;
use App\Models\Order;
use App\Models\Product;
use App\Models\Setting;
use App\Support\Pricing;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class OrderController extends Controller
{
    /**
     * Every retailer's orders, newest first, optionally narrowed by status or a
     * search across order code, company and buyer name.
     */
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'status' => ['nullable', Rule::in(array_keys(Order::STATUSES))],
            'q' => ['nullable', 'string', 'max:120'],
        ]);

        $orders = $this->filtered($filters)->paginate(25)->withQueryString();

        return response()->json([
            'orders' => $orders->getCollection()->map(fn (Order $order) => $this->summary($order))->values(),
            'meta' => [
                'current_page' => $orders->currentPage(),
                'last_page' => $orders->lastPage(),
                'total' => $orders->total(),
            ],
        ]);
    }

    public function show(string $code): JsonResponse
    {
        $order = Order::with(['items', 'user:id,name,company,email', 'user.paymentProfile', 'statusEvents'])
            ->where('code', strtoupper(trim($code)))
            ->firstOrFail();

        return response()->json(['order' => $this->summary($order) + [
            'shipping_address' => $order->shipping_address,
            'billing_profile' => $order->billing_profile,
            // The account the advance should arrive from, so the desk can match
            // a transfer to an order instead of asking on WhatsApp.
            'payment_profile' => $order->user->paymentProfile?->payload(),
            'notes' => $order->notes,
            'history' => $order->statusEvents->map(fn ($event) => [
                'id' => $event->id,
                'actor_name' => $event->actor_name,
                'from_status' => $event->from_status,
                'from_label' => $event->from_status ? (Order::STATUSES[$event->from_status] ?? $event->from_status) : null,
                'to_status' => $event->to_status,
                'to_label' => Order::STATUSES[$event->to_status] ?? $event->to_status,
                'note' => $event->note,
                'created_at' => $event->created_at->toIso8601String(),
            ]),
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
     * Moves an order along the production timeline. Any status is reachable —
     * production skips and reversals happen, and staff should not have to fight
     * the tool over it.
     */
    public function updateStatus(Request $request, string $code): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(array_keys(Order::STATUSES))],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $order = Order::where('code', strtoupper(trim($code)))->firstOrFail();
        $from = $order->status;
        $order->update($data);

        // Only a real move is worth an audit row; saving a note without changing
        // the stage would otherwise fill the timeline with noise.
        if ($from !== $order->status) {
            $order->statusEvents()->create([
                'user_id' => $request->user()->id,
                'actor_name' => $request->user()->name,
                'from_status' => $from,
                'to_status' => $order->status,
                'note' => $data['notes'] ?? null,
                'created_at' => now(),
            ]);

            // Telling the retailer is the point of moving the stage, but the
            // desk should not sit on the mail server to do it — queued, and a
            // failed push must not undo a change that is already saved.
            try {
                Mail::to($order->user->email)->queue(
                    new OrderStatusChanged($order, $data['notes'] ?? null)
                );
            } catch (\Throwable $e) {
                Log::warning('Status mail failed', ['code' => $order->code, 'error' => $e->getMessage()]);
            }
        }

        // The relation has to be loaded for summary() to include the retailer —
        // the admin page merges this response into the order it is showing.
        $order->load('user:id,name,company,email');

        return response()->json(['order' => $this->summary($order)]);
    }

    /**
     * Corrects the lines on an order — set counts and removals. Staff take
     * these changes over WhatsApp, so the desk needs a way to apply them
     * without going into the database.
     */
    public function updateItems(Request $request, string $code): JsonResponse
    {
        $data = $request->validate([
            'items' => ['required', 'array', 'min:1'],
            'items.*.id' => ['required', 'integer'],
            'items.*.sets' => ['required', 'integer', 'min:1', 'max:100000'],
            'removed' => ['array'],
            'removed.*' => ['integer'],
        ]);

        $order = Order::with('items')->where('code', strtoupper(trim($code)))->firstOrFail();
        $keepIds = array_column($data['items'], 'id');

        if (array_diff($keepIds, $order->items->pluck('id')->all())) {
            return response()->json(['message' => 'Those lines are not on this order.'], 422);
        }

        if (! $keepIds) {
            return response()->json(['message' => 'An order needs at least one line.'], 422);
        }

        DB::transaction(function () use ($order, $data, $keepIds) {
            $order->items()->whereKeyNot($keepIds)->delete();

            $products = Product::with('colors')
                ->whereIn('slug', $order->items->pluck('product_id')->unique())
                ->get()
                ->keyBy('slug');
            $colors = Color::whereIn('name', $order->items->pluck('color_name')->unique())
                ->get()
                ->keyBy('name');

            foreach ($data['items'] as $line) {
                $item = $order->items->firstWhere('id', $line['id']);
                $product = $products[$item->product_id] ?? null;
                $color = $colors[$item->color_name] ?? null;

                if ($product && $color) {
                    // Re-price from today's catalog where we still can.
                    $base = Pricing::colorBase($product, $color);
                    $perSet = Pricing::perSetPrice($base, $line['sets'], $item->ratio, $item->private_label);
                    $lineTotal = Pricing::lineTotal(
                        $base, $line['sets'], $item->ratio, $item->private_label, $item->sample
                    );
                } else {
                    // The style or colourway has since left the catalog, so the
                    // price it was sold at is the only honest number left.
                    $perSet = (float) $item->per_set_price;
                    $lineTotal = $perSet * $line['sets']
                        + ($item->sample ? (float) Setting::get('SAMPLE_SET_PRICE') : 0);
                }

                $item->update([
                    'sets' => $line['sets'],
                    'per_set_price' => $perSet,
                    'line_total' => $lineTotal,
                ]);
            }

            $fresh = $order->items()->get();
            $subtotal = round($fresh->sum(fn ($i) => (float) $i->line_total), 2);
            $gst = round($subtotal * (float) Setting::get('GST_RATE'), 2);

            $order->update([
                'total_sets' => $fresh->sum('sets'),
                'subtotal' => $subtotal,
                'gst' => $gst,
                'total' => $subtotal + $gst,
            ]);
        });

        return $this->show($code);
    }

    /** Counts and value per status, for the admin dashboard. */
    public function stats(): JsonResponse
    {
        $rows = Order::query()
            ->selectRaw('status, count(*) as orders, sum(total) as value, sum(total_sets) as sets')
            ->groupBy('status')
            ->get()
            ->keyBy('status');

        $byStatus = collect(Order::STATUSES)->map(fn ($label, $status) => [
            'status' => $status,
            'label' => $label,
            'orders' => (int) ($rows[$status]->orders ?? 0),
            'value' => (float) ($rows[$status]->value ?? 0),
            'sets' => (int) ($rows[$status]->sets ?? 0),
        ])->values();

        return response()->json([
            'by_status' => $byStatus,
            'totals' => [
                'orders' => (int) $rows->sum('orders'),
                'value' => (float) $rows->sum('value'),
                'sets' => (int) $rows->sum('sets'),
            ],
        ]);
    }

    /**
     * The order list as a CSV, honouring whatever filter the screen has on.
     * Streamed so a long book does not have to be held in memory.
     */
    public function export(Request $request): StreamedResponse
    {
        $filters = $request->validate([
            'status' => ['nullable', Rule::in(array_keys(Order::STATUSES))],
            'q' => ['nullable', 'string', 'max:120'],
        ]);

        $filename = 'jjserow-orders-'.now()->format('Y-m-d').'.csv';

        return response()->streamDownload(function () use ($filters) {
            $out = fopen('php://output', 'w');

            fputcsv($out, [
                'Order', 'Placed', 'Status', 'Company', 'Buyer', 'Email',
                'Lines', 'Sets', 'Subtotal', 'GST', 'Total',
            ]);

            $this->filtered($filters)->chunk(200, function ($orders) use ($out) {
                foreach ($orders as $order) {
                    fputcsv($out, [
                        $order->code,
                        $order->placed_at->format('Y-m-d'),
                        $order->statusLabel(),
                        $order->user?->company,
                        $order->user?->name,
                        $order->user?->email,
                        $order->items_count,
                        $order->total_sets,
                        (float) $order->subtotal,
                        (float) $order->gst,
                        (float) $order->total,
                    ]);
                }
            });

            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv']);
    }

    /**
     * Shared by the list and the export so a download always matches what is
     * on screen.
     *
     * @param  array<string, mixed>  $filters
     */
    private function filtered(array $filters): Builder
    {
        return Order::query()
            ->with('user:id,name,company,email')
            ->withCount('items')
            ->when($filters['status'] ?? null, fn ($query, $status) => $query->where('status', $status))
            ->when($filters['q'] ?? null, function ($query, $term) {
                $like = '%'.$term.'%';
                $query->where(function ($inner) use ($like) {
                    $inner->where('code', 'like', $like)
                        ->orWhereHas('user', fn ($user) => $user
                            ->where('company', 'like', $like)
                            ->orWhere('name', 'like', $like)
                            ->orWhere('email', 'like', $like));
                });
            })
            ->latest('placed_at');
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
            'retailer' => $order->relationLoaded('user') && $order->user ? [
                'id' => $order->user->id,
                'name' => $order->user->name,
                'company' => $order->user->company,
                'email' => $order->user->email,
            ] : null,
        ];
    }
}
