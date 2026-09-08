<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Color;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ColorController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['colors' => $this->list()]);
    }

    public function store(Request $request): JsonResponse
    {
        $color = Color::create(
            $this->validated($request) + ['position' => (Color::max('position') ?? 0) + 1]
        );

        // A new colourway has to exist on every product or the stock grid has a
        // hole in it; made-to-order is the safe assumption.
        foreach (Product::all() as $product) {
            $product->colors()->syncWithoutDetaching([$color->id => ['status' => 'made_to_order']]);
        }

        return response()->json(['colors' => $this->list()], 201);
    }

    public function update(Request $request, Color $color): JsonResponse
    {
        $color->update($this->validated($request, $color));

        return response()->json(['colors' => $this->list()]);
    }

    /**
     * Past orders store the colour name as text, so they keep reading correctly
     * after a delete. Blocked only while it is the last colour, since pricing
     * has nothing to work from without one.
     */
    public function destroy(Color $color): JsonResponse
    {
        if (Color::count() <= 1) {
            return response()->json([
                'message' => 'The catalog needs at least one colour.',
            ], 422);
        }

        $color->delete();

        return response()->json(['colors' => $this->list()]);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function list(): array
    {
        return Color::orderBy('position')->get()->map(fn (Color $c) => [
            'id' => $c->id,
            'name' => $c->name,
            'hex' => $c->hex,
            'base' => (float) $c->base,
            'position' => $c->position,
        ])->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request, ?Color $color = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:60', Rule::unique('colors', 'name')->ignore($color?->id)],
            'hex' => ['required', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'base' => ['required', 'numeric', 'min:0', 'max:1000000'],
        ]);
    }
}
