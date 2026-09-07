export const LEAD_DAYS = 20;
export const MOQ_SETS = 10;
export const SAMPLE_SET_PRICE = 1200;
export const PRIVATE_LABEL_PER_PC = 30;
export const GST_RATE = 0.05;
export const STANDARD_SET_PIECES = 4;
export const WHATSAPP_NUMBER = "919876543210";

export const TIERS = [
  { min: 10, max: 29, discount: 0, label: "10–29 sets" },
  { min: 30, max: 49, discount: 0.06, label: "30–49 sets" },
  { min: 50, max: Infinity, discount: 0.12, label: "50+ sets" },
];

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

export const inr = (n) => "₹" + Math.round(n).toLocaleString("en-IN");

export const ratioLabel = (ratio) =>
  ["S", "M", "L", "XL", "XXL"]
    .filter((s) => Number(ratio[s]) > 0)
    .map((s) => `${s}-${ratio[s]}`)
    .join(", ");
