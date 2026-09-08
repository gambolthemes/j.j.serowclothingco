# j.j.serowclothingco

BULK ORDERS. SET WISE. Made in Ludhiana.

A Laravel 11 back end serving a React SPA. Retailers register, see wholesale
pricing, order set-wise and track production; staff run the catalog, orders and
commercial terms from `/admin`.

## Local development

```bash
composer install
npm install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
npm run dev            # vite, in one terminal
php artisan serve      # or use Herd, in another
php artisan queue:work # in a third — mail is queued, see "Queue worker" below
```

With `MAIL_MAILER=log` the mail lands in `storage/logs/laravel.log`, but only
once the worker has picked the job up. No worker, no mail — locally as well as
in production.

Admin is never granted through the app — `is_admin` is not mass assignable.
Promote a registered account from the CLI:

```bash
php artisan admin:promote buyer@yourstore.in
```

Tests — two suites, both expected to pass before a deploy:

```bash
php artisan test   # Laravel: auth, orders, admin, cart, uploads, SEO
npm test           # vitest + testing-library: pricing, cart sync, auth screens
```

`npm run test:watch` reruns the front-end suite as you edit. The React tests run
under jsdom against `vitest.config.js`, which is deliberately separate from
`vite.config.js` — the build config loads laravel-vite-plugin, which the tests
neither need nor can satisfy.

## Deploying

### 1. Environment

Do **not** copy `.env.example` onto the server — it is the local-development
template. Use `.env.production.example`, which documents every value that has to
change and why. The three that break a live site hardest:

| Key | Live value | What goes wrong otherwise |
| --- | --- | --- |
| `APP_DEBUG` | `false` | Stack traces on error pages and in every API response, including database name and credentials |
| `MAIL_MAILER` | `smtp` | Nothing is delivered — order confirmations and password-reset links silently go to `storage/logs` |
| `APP_URL` | the real `https://` origin | Reset links, the sitemap and `robots.txt` all point at the wrong host |

```bash
cp .env.production.example .env
# fill in APP_URL, DB_*, MAIL_*
php artisan key:generate --force
```

### 2. Build and migrate

```bash
composer install --no-dev --optimize-autoloader
npm ci && npm run build
php artisan migrate --force
php artisan config:cache && php artisan route:cache && php artisan view:cache
```

### 3. Queue worker (required)

Order confirmations, status updates and password-reset links are queued
(`QUEUE_CONNECTION=database`) so no retailer waits on an SMTP handshake mid
checkout. **Nothing is delivered until a worker is running.** Keep one alive
under supervisor/systemd:

```bash
php artisan queue:work --tries=3 --max-time=3600
```

Restart it on every deploy, or it keeps running the old code:

```bash
php artisan queue:restart
```

### 4. Uploads directory

Product and storefront photos uploaded from `/admin` are written straight into
`public/uploads` — no `storage:link`, so there is no symlink to forget or for a
host to refuse. Two consequences:

- the directory must be **writable** by the web server user
- it is **content, not code**: back it up with the database, and never wipe it
  as part of a deploy (a `git clean` there deletes the catalog photography)

### 5. Payment gateways (optional)

Both are off until their keys are in `.env`; with none configured, retailers pay
by transfer exactly as before and no pay button appears. See
`.env.production.example` for the variables.

| | Razorpay | PayPal |
| --- | --- | --- |
| For | Indian retailers | buyers **outside** India |
| Currency | INR | USD, at the rate under admin settings |
| Methods | UPI, netbanking, card, wallet | PayPal balance and cards |

**PayPal cannot take India-domestic payments.** PayPal ended domestic India
payments in April 2021 and does not settle INR cross-border, so it is only worth
enabling if you sell overseas. It also stays hidden until a USD rate is set
(Admin → Settings → Payment instructions) — without one there is no honest way
to convert a rupee total, and the rate usually carries a margin, so it is a
decision rather than a market lookup.

Register both webhooks — they are what marks an order paid when a buyer's
browser dies mid-payment:

| Gateway | URL | Events |
| --- | --- | --- |
| Razorpay | `https://your-host/webhooks/razorpay` | `payment.captured` |
| PayPal | `https://your-host/webhooks/paypal` | `PAYMENT.CAPTURE.COMPLETED`, `CHECKOUT.ORDER.APPROVED` |

Every callback is verified before anything is settled — Razorpay by HMAC
signature, PayPal by capturing server-side and by its signature-verification
API. An unsigned webhook is ignored, and a webhook quoting the wrong amount is
refused and logged.

### 6. Check

- `php artisan about` — confirm `Debug Mode: OFF` and the mailer is not `log`
- `curl https://your-host/robots.txt` — the `Sitemap:` line must be your domain
- Send yourself a password reset and confirm the mail arrives with a working link
