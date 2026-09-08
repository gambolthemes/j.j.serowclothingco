/* The catalog comes from the database, printed into the page by the app shell
   (see App\Support\Storefront). The exports below keep the exact shape the
   screens have always imported, so nothing downstream had to change.

   The empty fallbacks matter: the admin screens and the login/signup pages are
   rendered by the same bundle, and a blank catalog must not crash them. */
const storefront = window.__STOREFRONT__ ?? { products: [], colors: [], settings: {} };

export const LOGO_URL = '/images/mark.svg';
export const LOGO_LOCKUP_URL = '/images/logo.svg';

export const HERO_URL = storefront.settings?.HERO_URL ?? '';
export const FACTORY_URL = storefront.settings?.FACTORY_URL ?? '';

export const COLORS = storefront.colors ?? [];
export const PRODUCTS = storefront.products ?? [];

export const findProduct = (id) => PRODUCTS.find((p) => p.id === id);
export const colorBase = (product, color) => color.base + product.priceMod;
export const minBase = (product) =>
    COLORS.length ? Math.min(...COLORS.map((c) => colorBase(product, c))) : 0;
