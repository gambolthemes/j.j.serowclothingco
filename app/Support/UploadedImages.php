<?php

namespace App\Support;

use App\Models\Product;
use App\Models\Setting;
use App\Rules\ImageSource;
use Illuminate\Support\Facades\Storage;

/**
 * Housekeeping for public/uploads. Every image the admin uploads would
 * otherwise stay on disk forever, including the four rejected shots taken
 * before the good one.
 */
class UploadedImages
{
    /** Settings that hold an image, so a file in use by one is never pruned. */
    private const IMAGE_SETTINGS = ['HERO_URL', 'FACTORY_URL'];

    /**
     * Deletes an uploaded file, but only if nothing references it any more.
     *
     * The reference check is the whole point: duplicating a product copies the
     * image path too, so deleting on "this product stopped using it" alone
     * would blank out the copy.
     *
     * @return bool whether a file was actually removed
     */
    public static function prune(?string $path): bool
    {
        if (! ImageSource::isUpload($path) || self::isReferenced($path)) {
            return false;
        }

        $name = basename($path);

        return Storage::disk('uploads')->exists($name)
            && Storage::disk('uploads')->delete($name);
    }

    private static function isReferenced(string $path): bool
    {
        if (Product::where('image', $path)->exists()) {
            return true;
        }

        $settings = Setting::values();

        foreach (self::IMAGE_SETTINGS as $key) {
            if (($settings[$key] ?? null) === $path) {
                return true;
            }
        }

        return false;
    }
}
