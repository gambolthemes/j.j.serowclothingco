<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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

        $retailers = User::query()
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
            ->orderBy('company')
            ->paginate(25)
            ->withQueryString();

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
}
