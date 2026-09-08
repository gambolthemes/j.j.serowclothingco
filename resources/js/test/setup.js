import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

import { STOREFRONT_FIXTURE } from './storefront';

/*
 * lib/pricing.js and data/products.js read window.__STOREFRONT__ once, at import
 * time — that is how the blade shell hands the catalog to the bundle. So the
 * payload has to exist before any module under test is imported, which is
 * exactly what a setup file runs early enough to do. Setting it inside a test
 * would be too late: the module has already read it and captured the defaults.
 */
window.__STOREFRONT__ = STOREFRONT_FIXTURE;
window.__AUTH_USER__ = null;

/*
 * jsdom has no layout engine, so anything that scrolls or measures throws.
 * ScrollToTop calls the first on every navigation.
 */
window.scrollTo = () => {};

afterEach(() => {
    cleanup();
    localStorage.clear();
});
