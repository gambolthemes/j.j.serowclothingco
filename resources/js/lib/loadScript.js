/*
 * Loads a third-party script once, on demand.
 *
 * Both payment SDKs are only needed by a retailer who is actually paying, and
 * only for the gateway they picked — pulling either into the main bundle would
 * put a tracker-shaped script on every page of the storefront for nothing.
 */
const pending = new Map();

export const loadScript = (src) => {
    if (pending.has(src)) return pending.get(src);

    const promise = new Promise((resolve, reject) => {
        // A script the browser already has (a second order, a back-navigation)
        // fires no load event, so a fresh tag would hang forever.
        const existing = document.querySelector(`script[src="${src}"]`);

        if (existing?.dataset.loaded === 'true') {
            resolve();

            return;
        }

        const tag = existing ?? document.createElement('script');
        tag.src = src;
        tag.async = true;
        tag.addEventListener('load', () => {
            tag.dataset.loaded = 'true';
            resolve();
        });
        tag.addEventListener('error', () => {
            // Dropped from the cache so a retry can actually retry — a blocked
            // script is often an ad blocker the retailer can turn off.
            pending.delete(src);
            tag.remove();
            reject(new Error(`Could not load ${src}`));
        });

        if (!existing) document.body.appendChild(tag);
    });

    pending.set(src, promise);

    return promise;
};

export default loadScript;
