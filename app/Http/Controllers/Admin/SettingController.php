<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Rules\ImageSource;
use App\Support\UploadedImages;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    public function show(): JsonResponse
    {
        return response()->json([
            'settings' => Setting::values(),
            'defaults' => Setting::DEFAULTS,
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'LEAD_DAYS' => ['required', 'integer', 'min:1', 'max:365'],
            'MOQ_SETS' => ['required', 'integer', 'min:1', 'max:10000'],
            'SAMPLE_SET_PRICE' => ['required', 'numeric', 'min:0', 'max:1000000'],
            'PRIVATE_LABEL_PER_PC' => ['required', 'numeric', 'min:0', 'max:100000'],
            'GST_RATE' => ['required', 'numeric', 'min:0', 'max:1'],
            'STANDARD_SET_PIECES' => ['required', 'integer', 'min:1', 'max:100'],
            'WHATSAPP_NUMBER' => ['required', 'string', 'regex:/^[0-9]{8,15}$/'],
            // Uploaded through the same admin uploader as product photos, so
            // these accept a /uploads/… path as well as an external URL.
            'HERO_URL' => ['required', 'string', 'max:500', new ImageSource],
            'FACTORY_URL' => ['required', 'string', 'max:500', new ImageSource],
            'COMPANY_EMAIL' => ['required', 'email', 'max:160'],
            'COMPANY_LOCATION' => ['required', 'string', 'max:160'],

            'TIERS' => ['required', 'array', 'min:1'],
            'TIERS.*.min' => ['required', 'integer', 'min:1'],
            // The open-ended top tier is stored as null.
            'TIERS.*.max' => ['present', 'nullable', 'integer', 'min:1'],
            'TIERS.*.discount' => ['required', 'numeric', 'min:0', 'max:0.9'],
            'TIERS.*.label' => ['required', 'string', 'max:40'],
        ]);

        // Tiers are scanned in order and the first match wins, so an unordered
        // table would quietly price orders at the wrong discount.
        $mins = array_column($data['TIERS'], 'min');
        $sorted = $mins;
        sort($sorted);

        if ($mins !== $sorted) {
            return response()->json([
                'message' => 'Tiers must be listed from the smallest set count upwards.',
                'errors' => ['TIERS' => ['Tiers must be listed from the smallest set count upwards.']],
            ], 422);
        }

        $replaced = array_map(fn (string $key) => Setting::get($key), ['HERO_URL', 'FACTORY_URL']);

        Setting::putMany($data);

        // Same housekeeping as the product screen: a swapped-out upload that
        // nothing references any more comes off the disk.
        array_map(UploadedImages::prune(...), $replaced);

        return response()->json(['settings' => Setting::values()]);
    }
}
