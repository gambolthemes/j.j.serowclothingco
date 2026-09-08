<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

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

        $orders = Order::query()
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
            ->latest('placed_at')
            ->paginate(25)
            ->withQueryString();

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
        $order = Order::with(['items', 'user:id,name,company,email'])->where('code', strtoupper(trim($code)))->firstOrFail();

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
        $order->update($data);

        // The relation has to be loaded for summary() to include the retailer —
        // the admin page merges this response into the order it is showing.
        $order->load('user:id,name,company,email');

        return response()->json(['order' => $this->summary($order)]);
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
