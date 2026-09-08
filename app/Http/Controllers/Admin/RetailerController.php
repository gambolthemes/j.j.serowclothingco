<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class RetailerController extends Controller
{
    /**
     * Registered retailers with what they have ordered, so staff can see who is
     * actually buying without opening each account.
     */
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
        ]);

        $retailers = $this->filtered($filters)->paginate(25)->withQueryString();

        return response()->json([
            'retailers' => $retailers->getCollection()->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'company' => $user->company,
                'email' => $user->email,
                'orders_count' => (int) $user->orders_count,
                'orders_value' => (float) ($user->orders_sum_total ?? 0),
                'orders_sets' => (int) ($user->orders_sum_total_sets ?? 0),
                'joined_at' => $user->created_at->toIso8601String(),
            ])->values(),
            'meta' => [
                'current_page' => $retailers->currentPage(),
                'last_page' => $retailers->lastPage(),
                'total' => $retailers->total(),
            ],
        ]);
    }

    /** The retailer list as a CSV, honouring the current search. */
    public function export(Request $request): StreamedResponse
    {
        $filters = $request->validate(['q' => ['nullable', 'string', 'max:120']]);

        return response()->streamDownload(function () use ($filters) {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['Company', 'Buyer', 'Email', 'Joined', 'Orders', 'Sets', 'Value']);

            $this->filtered($filters)->chunk(200, function ($users) use ($out) {
                foreach ($users as $user) {
                    fputcsv($out, [
                        $user->company,
                        $user->name,
                        $user->email,
                        $user->created_at->format('Y-m-d'),
                        (int) $user->orders_count,
                        (int) ($user->orders_sum_total_sets ?? 0),
                        (float) ($user->orders_sum_total ?? 0),
                    ]);
                }
            });

            fclose($out);
        }, 'jjserow-retailers-'.now()->format('Y-m-d').'.csv', ['Content-Type' => 'text/csv']);
    }

    /** One account in full: profile, saved addresses and every order. */
    public function show(User $user): JsonResponse
    {
        $user->loadCount('orders');

        return response()->json(['retailer' => [
            'id' => $user->id,
            'name' => $user->name,
            'company' => $user->company,
            'email' => $user->email,
            'is_admin' => $user->is_admin,
            'joined_at' => $user->created_at->toIso8601String(),
            'orders_count' => (int) $user->orders_count,
            'addresses' => $user->addresses,
            'orders' => $user->orders()->withCount('items')->get()->map(fn (Order $order) => [
                'code' => $order->code,
                'status' => $order->status,
                'status_label' => $order->statusLabel(),
                'total_sets' => $order->total_sets,
                'total' => (float) $order->total,
                'items_count' => (int) $order->items_count,
                'placed_at' => $order->placed_at->toIso8601String(),
            ]),
        ]]);
    }

    /**
     * Grants or revokes staff access — the same thing `php artisan
     * admin:promote` does, from the UI.
     */
    public function updateRole(Request $request, User $user): JsonResponse
    {
        $data = $request->validate(['is_admin' => ['required', 'boolean']]);

        // Removing your own access would lock you straight out of this screen.
        if ($user->id === $request->user()->id && ! $data['is_admin']) {
            return response()->json([
                'message' => 'You cannot remove your own admin access.',
                'errors' => ['is_admin' => ['You cannot remove your own admin access.']],
            ], 422);
        }

        $user->forceFill(['is_admin' => $data['is_admin']])->save();

        return response()->json(['is_admin' => $user->is_admin]);
    }

    /**
     * Shared by the list and the export so a download always matches what is
     * on screen.
     *
     * @param  array<string, mixed>  $filters
     */
    private function filtered(array $filters): Builder
    {
        return User::query()
            ->where('is_admin', false)
            ->when($filters['q'] ?? null, function ($query, $term) {
                $like = '%'.$term.'%';
                $query->where(fn ($inner) => $inner
                    ->where('company', 'like', $like)
                    ->orWhere('name', 'like', $like)
                    ->orWhere('email', 'like', $like));
            })
            ->withCount('orders')
            ->withSum('orders', 'total')
            ->withSum('orders', 'total_sets')
            ->orderByDesc('orders_sum_total')
            ->orderBy('company');
    }
}
