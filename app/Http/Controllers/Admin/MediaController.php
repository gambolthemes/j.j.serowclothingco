<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Rules\ImageSource;
use App\Support\UploadedImages;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Image uploads for the admin screens. Before this, adding a product meant
 * hosting the photo somewhere else first and pasting the URL — which is why the
 * whole catalog still points at the old site builder's CDN.
 *
 * Admin-only (the route sits behind `auth` + `admin`), so the risk here is a
 * compromised staff account rather than the open internet; the checks below are
 * about not turning an upload form into a way to run code.
 */
class MediaController extends Controller
{
    /** Kept in step with the `mimes` rule below — one place to widen or narrow. */
    private const EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            // `image` alone would accept an SVG, which is a script-execution
            // vector when served from our own origin. The explicit mimes list
            // is what keeps that out.
            'file' => [
                'required', 'file', 'image',
                'mimes:'.implode(',', self::EXTENSIONS),
                'max:5120',
                'dimensions:min_width=200,min_height=200,max_width=6000,max_height=6000',
            ],
        ], [
            'file.mimes' => 'Images must be JPG, PNG or WebP.',
            'file.max' => 'That image is over 5 MB. Export it smaller and try again.',
            'file.dimensions' => 'Images must be between 200px and 6000px on each side.',
        ]);

        /** @var UploadedFile $file */
        $file = $request->file('file');

        // The stored name is generated, never taken from the client: the browser
        // filename is attacker-controlled and would let a staff account choose
        // where the file lands and what extension it gets.
        $name = Str::lower(Str::random(32)).'.'.$file->extension();

        $file->storeAs('', $name, ['disk' => 'uploads']);

        return response()->json([
            'url' => ImageSource::UPLOAD_PREFIX.$name,
            'size' => Storage::disk('uploads')->size($name),
        ], 201);
    }

    /**
     * Removes an upload once nothing points at it. Called from the product
     * screens rather than exposed as its own delete, so the only way to lose a
     * file is to stop using it.
     */
    public function destroy(Request $request): JsonResponse
    {
        $data = $request->validate(['url' => ['required', 'string', 'max:500']]);

        return response()->json(['deleted' => UploadedImages::prune($data['url'])]);
    }
}
