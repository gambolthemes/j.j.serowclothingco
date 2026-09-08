/*
 * A miniature of what App\Support\Storefront prints into the page. Kept in the
 * same shape as the real payload — camelCase priceMod, colour bases in rupees,
 * stock keyed by colour name — so a test that passes here means something.
 *
 * The numbers are chosen to make the pricing arithmetic checkable by hand:
 * a White standard set is 3200, and the tiers below discount 0 / 6% / 12%.
 */
export const STOREFRONT_FIXTURE = {
    products: [
        {
            id: 'serow-oxford',
            name: 'Serow Oxford',
            category: 'shirts',
            fabric: 'Oxford cotton',
            image: '/uploads/oxford.jpg',
            priceMod: 0,
            blurb: 'The house shirt.',
            stock: { White: 'in_stock', Indigo: 'made_to_order', Olive: 'out_of_stock' },
        },
        {
            id: 'washed-wide-cargo',
            name: 'Washed Wide Cargo',
            category: 'trousers',
            fabric: 'Washed twill',
            image: 'https://images.hostinger.com/cargo.png',
            priceMod: 400,
            blurb: 'Wide leg, six pockets.',
            stock: { White: 'in_stock', Indigo: 'in_stock', Olive: 'in_stock' },
        },
    ],
    colors: [
        { name: 'White', hex: '#f5f2e9', base: 3200 },
        { name: 'Indigo', hex: '#26364f', base: 3400 },
        { name: 'Olive', hex: '#4a5233', base: 3300 },
    ],
    settings: {
        LEAD_DAYS: 20,
        MOQ_SETS: 10,
        SAMPLE_SET_PRICE: 1200,
        PRIVATE_LABEL_PER_PC: 30,
        GST_RATE: 0.05,
        STANDARD_SET_PIECES: 4,
        WHATSAPP_NUMBER: '919876543210',
        COMPANY_EMAIL: 'orders@jjserow.in',
        COMPANY_LOCATION: 'Tirupur, Tamil Nadu, India',
        HERO_URL: 'https://images.hostinger.com/hero.png',
        FACTORY_URL: 'https://images.hostinger.com/factory.png',
        TIERS: [
            { min: 10, max: 29, discount: 0, label: '10–29 sets' },
            { min: 30, max: 49, discount: 0.06, label: '30–49 sets' },
            { min: 50, max: null, discount: 0.12, label: '50+ sets' },
        ],
    },
};
