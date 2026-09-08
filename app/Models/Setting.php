<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

/**
 * Commercial terms that used to be constants in lib/pricing.js. The whole table
 * is a handful of rows, so it is read as one cached blob rather than key by key.
 */
class Setting extends Model
{
    protected $primaryKey = 'key';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = ['key', 'value'];

    protected function casts(): array
    {
        return ['value' => 'array'];
    }

    private const CACHE_KEY = 'settings.all';

    /**
     * Defaults, and the authoritative list of what a setting may be. A key
     * absent from here is not settable — the admin form validates against it.
     */
    public const DEFAULTS = [
        'LEAD_DAYS' => 20,
        'MOQ_SETS' => 10,
        'SAMPLE_SET_PRICE' => 1200,
        'PRIVATE_LABEL_PER_PC' => 30,
        'GST_RATE' => 0.05,
        'STANDARD_SET_PIECES' => 4,
        'WHATSAPP_NUMBER' => '919876543210',
        'TIERS' => [
            ['min' => 10, 'max' => 29, 'discount' => 0, 'label' => '10–29 sets'],
            ['min' => 30, 'max' => 49, 'discount' => 0.06, 'label' => '30–49 sets'],
            ['min' => 50, 'max' => null, 'discount' => 0.12, 'label' => '50+ sets'],
        ],
        'HERO_URL' => 'https://images.hostinger.com/f5a8f912-eb6d-4ef5-844c-0c929393b5c0.png',
        'FACTORY_URL' => 'https://images.hostinger.com/2a655bec-48a0-42cb-835c-a58da604c65e.png',
        'COMPANY_EMAIL' => 'orders@jjserow.in',
        'COMPANY_LOCATION' => 'Tirupur, Tamil Nadu, India',
    ];

    /**
     * Every setting, stored values layered over the defaults.
     *
     * Only the stored rows are cached, never the merged result — caching the
     * merge means adding a key to DEFAULTS does nothing until someone clears
     * the cache, and every reader of that key blows up in the meantime.
     */
    public static function values(): array
    {
        $stored = Cache::rememberForever(
            self::CACHE_KEY,
            fn () => static::query()->pluck('value', 'key')->all()
        );

        return array_replace(self::DEFAULTS, $stored);
    }

    public static function get(string $key): mixed
    {
        return static::values()[$key] ?? null;
    }

    /**
     * @param  array<string, mixed>  $values
     */
    public static function putMany(array $values): void
    {
        foreach ($values as $key => $value) {
            if (! array_key_exists($key, self::DEFAULTS)) {
                continue;
            }

            static::updateOrCreate(['key' => $key], ['value' => $value]);
        }

        static::forget();
    }

    public static function forget(): void
    {
        Cache::forget(self::CACHE_KEY);
    }
}
