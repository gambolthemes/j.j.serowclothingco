/* Commercial terms come from the settings table, printed into the page by the
   app shell (see App\Support\Storefront). The defaults below are only a safety
   net for a page rendered without that payload. The calculations here mirror
   App\Support\Pricing, which is what actually prices a stored order. */
const settings = window.__STOREFRONT__?.settings ?? {};

const DEFAULTS = {
    LEAD_DAYS: 20,
    MOQ_SETS: 10,
    SAMPLE_SET_PRICE: 1200,
    PRIVATE_LABEL_PER_PC: 30,
    GST_RATE: 0.05,
    STANDARD_SET_PIECES: 4,
    WHATSAPP_NUMBER: '919876543210',
    COMPANY_EMAIL: 'orders@jjserow.in',
    COMPANY_LOCATION: 'Tirupur, Tamil Nadu, India',
};

const setting = (key) => settings[key] ?? DEFAULTS[key];

export const LEAD_DAYS = Number(setting('LEAD_DAYS'));
export const MOQ_SETS = Number(setting('MOQ_SETS'));
export const SAMPLE_SET_PRICE = Number(setting('SAMPLE_SET_PRICE'));
export const PRIVATE_LABEL_PER_PC = Number(setting('PRIVATE_LABEL_PER_PC'));
export const GST_RATE = Number(setting('GST_RATE'));
export const STANDARD_SET_PIECES = Number(setting('STANDARD_SET_PIECES'));
export const WHATSAPP_NUMBER = String(setting('WHATSAPP_NUMBER'));
export const COMPANY_EMAIL = String(setting('COMPANY_EMAIL'));
export const COMPANY_LOCATION = String(setting('COMPANY_LOCATION'));

/** Just the town, for copy that reads "…made in {city}". */
export const COMPANY_CITY = COMPANY_LOCATION.split(',')[0].trim();

/* Copy that used to be typed out by hand all over the storefront. Deriving it
   from the settings is the whole point of having them — otherwise changing MOQ
   in the admin silently leaves every page still quoting the old number. */
export const LEAD_LABEL = `${LEAD_DAYS} days`;
export const MOQ_LABEL = `MOQ ${MOQ_SETS} sets`;
export const GST_LABEL = `GST (${Math.round(GST_RATE * 1000) / 10}%)`;

/** 919876543210 -> +91 98765 43210, for display next to a wa.me link. */
export const whatsappDisplay = () => {
    const digits = WHATSAPP_NUMBER.replace(/\D/g, '');
    const local = digits.slice(-10);
    const country = digits.slice(0, -10);

    if (local.length < 10) return `+${digits}`;

    return `+${country} ${local.slice(0, 5)} ${local.slice(5)}`.trim();
};

// The open-ended top tier is stored as max: null; Infinity is what the
// comparison below needs.
export const TIERS = (
    settings.TIERS ?? [
        { min: 10, max: 29, discount: 0, label: '10–29 sets' },
        { min: 30, max: 49, discount: 0.06, label: '30–49 sets' },
        { min: 50, max: null, discount: 0.12, label: '50+ sets' },
    ]
).map((tier) => ({
    ...tier,
    min: Number(tier.min),
    max: tier.max === null || tier.max === undefined ? Infinity : Number(tier.max),
    discount: Number(tier.discount),
}));

export const tierFor = (sets) => TIERS.find((t) => sets >= t.min && sets <= t.max) || TIERS[0];

export const discountedSetBase = (base, sets) => Math.round(base * (1 - tierFor(sets).discount));

export const piecesPerSet = (ratio) =>
    Object.values(ratio).reduce((sum, n) => sum + (Number(n) || 0), 0);

// Price per set scales with piece count against the standard 4-pc set, plus private label per piece.
export const perSetPrice = (base, sets, ratio, privateLabel) => {
    const pieces = Math.max(piecesPerSet(ratio), 1);
    const core = Math.round((discountedSetBase(base, sets) * pieces) / STANDARD_SET_PIECES);
    return core + (privateLabel ? PRIVATE_LABEL_PER_PC * pieces : 0);
};

export const lineTotal = (base, item) =>
    perSetPrice(base, item.sets, item.ratio, item.privateLabel) * item.sets +
    (item.sample ? SAMPLE_SET_PRICE : 0);

export const inr = (n) => '₹' + Math.round(n).toLocaleString('en-IN');

export const ratioLabel = (ratio) =>
    ['S', 'M', 'L', 'XL', 'XXL']
        .filter((s) => Number(ratio[s]) > 0)
        .map((s) => `${s}-${ratio[s]}`)
        .join(', ');
