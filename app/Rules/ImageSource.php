<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Support\Str;

/**
 * An image reference the storefront can actually render: either something we
 * host ourselves (/uploads/…, written by the admin uploader) or a full http(s)
 * URL somewhere else.
 *
 * The catalog was built on absolute URLs — the images still sit on the old
 * site builder's CDN — so those have to keep validating. But an uploaded file
 * is a site-relative path, and Laravel's `url` rule rejects those, which is why
 * this exists rather than a plain `url`.
 */
class ImageSource implements ValidationRule
{
    /** Where MediaController writes, and the only local prefix we accept. */
    public const UPLOAD_PREFIX = '/uploads/';

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) || $value === '') {
            $fail('Choose an image, or paste a full https:// URL.');

            return;
        }

        if (self::isUpload($value)) {
            // No traversal out of the uploads directory, and no protocol-
            // relative "//evil.example" sneaking past the prefix check.
            if (str_contains($value, '..') || Str::startsWith($value, '//')) {
                $fail('That image path is not valid.');
            }

            return;
        }

        if (! filter_var($value, FILTER_VALIDATE_URL) || ! Str::startsWith($value, ['http://', 'https://'])) {
            $fail('The image must be an uploaded file, or a full http:// or https:// URL.');
        }
    }

    /** True for a path this app serves out of public/uploads. */
    public static function isUpload(?string $value): bool
    {
        return is_string($value) && Str::startsWith($value, self::UPLOAD_PREFIX);
    }
}
