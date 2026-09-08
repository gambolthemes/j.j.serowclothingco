<?php

namespace App\Http\Controllers;

use App\Models\Order;
use Illuminate\Http\JsonResponse;

class TrackingController extends Controller
{
    /** Production estimate quoted to retailers. Mirrors LEAD_DAYS in lib/pricing.js. */
    private const LEAD_DAYS = 20;

    /**
     * Public lookup by order code. Order codes are short and guessable, so this
     * returns progress only — never amounts, line items or the shipping address.
     */
    public function show(string $code): JsonResponse
    {
        $order = Order::where('code', strtoupper(trim($code)))->first();

        if (! $order) {
            return response()->json(['message' => 'No order found with that code.'], 404);
        }

        return response()->json(['order' => [
            'code' => $order->code,
            'status' => $order->status,
            'status_label' => $order->statusLabel(),
            'stage_index' => $order->stageIndex(),
            'timeline' => Order::TIMELINE,
            'placed_at' => $order->placed_at->toIso8601String(),
            'expected_dispatch' => $order->placed_at->copy()->addDays(self::LEAD_DAYS)->toIso8601String(),
        ]]);
    }
}
