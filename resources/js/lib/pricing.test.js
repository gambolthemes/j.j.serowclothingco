import { describe, expect, it } from 'vitest';

import {
    GST_LABEL,
    MOQ_LABEL,
    COMPANY_CITY,
    TIERS,
    discountedSetBase,
    inr,
    lineTotal,
    perSetPrice,
    piecesPerSet,
    ratioLabel,
    tierFor,
    whatsappDisplay,
} from '@/lib/pricing';

/*
 * These mirror App\Support\Pricing, which is what actually prices a stored
 * order. If the two ever disagree the storefront quotes one number and the
 * invoice shows another, so the arithmetic is worth pinning down on both sides.
 */
describe('tiers', () => {
    it('reads the open-ended top tier as unbounded', () => {
        expect(TIERS.at(-1).max).toBe(Infinity);
        expect(tierFor(5000).discount).toBe(0.12);
    });

    it('picks the tier a set count falls in', () => {
        expect(tierFor(10).discount).toBe(0);
        expect(tierFor(29).discount).toBe(0);
        expect(tierFor(30).discount).toBe(0.06);
        expect(tierFor(49).discount).toBe(0.06);
        expect(tierFor(50).discount).toBe(0.12);
    });

    it('falls back to the first tier below the smallest one', () => {
        // Under the MOQ the checkout refuses the line anyway; the point is that
        // it does not return undefined and crash the page on the way there.
        expect(tierFor(1)).toBe(TIERS[0]);
    });

    it('discounts the set base and rounds to whole rupees', () => {
        expect(discountedSetBase(3200, 12)).toBe(3200);
        expect(discountedSetBase(3200, 30)).toBe(3008);
        expect(discountedSetBase(3200, 50)).toBe(2816);
    });
});

describe('set pricing', () => {
    const standard = { M: 1, L: 1, XL: 1, XXL: 1 };

    it('counts the pieces in a ratio', () => {
        expect(piecesPerSet(standard)).toBe(4);
        expect(piecesPerSet({ M: 2, L: 3 })).toBe(5);
        expect(piecesPerSet({})).toBe(0);
    });

    it('charges the base for a standard four-piece set', () => {
        expect(perSetPrice(3200, 12, standard, false)).toBe(3200);
    });

    it('scales the price with the piece count', () => {
        // Six pieces against a four-piece standard: 3200 * 6 / 4.
        expect(perSetPrice(3200, 12, { M: 2, L: 2, XL: 2 }, false)).toBe(4800);
    });

    it('adds private label per piece, not per set', () => {
        expect(perSetPrice(3200, 12, standard, true)).toBe(3200 + 30 * 4);
    });

    it('applies the tier discount before scaling', () => {
        expect(perSetPrice(3200, 50, standard, false)).toBe(2816);
    });

    it('never divides by zero on an empty ratio', () => {
        expect(Number.isFinite(perSetPrice(3200, 12, {}, false))).toBe(true);
    });
});

describe('line totals', () => {
    const item = { sets: 12, ratio: { M: 1, L: 1, XL: 1, XXL: 1 }, privateLabel: false, sample: false };

    it('multiplies the per-set price by the set count', () => {
        expect(lineTotal(3200, item)).toBe(3200 * 12);
    });

    it('adds the sample set once for the whole line, not per set', () => {
        expect(lineTotal(3200, { ...item, sample: true })).toBe(3200 * 12 + 1200);
    });
});

describe('display helpers', () => {
    it('formats rupees in the Indian grouping', () => {
        expect(inr(3200)).toBe('₹3,200');
        expect(inr(1234567)).toBe('₹12,34,567');
        expect(inr(3200.4)).toBe('₹3,200');
    });

    it('lists only the sizes actually ordered, in size order', () => {
        expect(ratioLabel({ XL: 2, M: 1, L: 0 })).toBe('M-1, XL-2');
        expect(ratioLabel({})).toBe('');
    });

    it('renders a whatsapp number the way a person would read it', () => {
        expect(whatsappDisplay()).toBe('+91 98765 43210');
    });

    it('derives the copy that used to be typed out by hand', () => {
        expect(MOQ_LABEL).toBe('MOQ 10 sets');
        expect(GST_LABEL).toBe('GST (5%)');
        expect(COMPANY_CITY).toBe('Tirupur');
    });
});
