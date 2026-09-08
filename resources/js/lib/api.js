import axios from 'axios';

const unwrap = (key) => (response) => response.data[key];

/* ---- password reset ----
   Guest endpoints, unlike everything below them. Both are throttled server
   side, so callers should expect a 429 as well as the usual 422. */

/** Always resolves for a well-formed address, whether or not it is registered. */
export const requestPasswordReset = (email) =>
    axios.post('/auth/forgot-password', { email }).then(unwrap('status'));

export const resetPassword = ({ token, email, password }) =>
    axios
        .post('/auth/reset-password', {
            token,
            email,
            password,
            password_confirmation: password,
        })
        .then(unwrap('status'));

export const updateProfile = (payload) =>
    axios.put('/api/account/profile', payload).then(unwrap('user'));

export const updatePassword = (payload) => axios.put('/api/account/password', payload);

/* ---- billing & payment ----
   Tax identity and the account the advance comes from. No card details: orders
   settle by transfer, so there is no gateway and nothing to tokenise. */

/** Returns the profile plus the method list and where to send the money. */
export const getPaymentProfile = () => axios.get('/api/account/payment').then((r) => r.data);

export const savePaymentProfile = (payload) =>
    axios.put('/api/account/payment', payload).then(unwrap('profile'));

export const listAddresses = () => axios.get('/api/account/addresses').then(unwrap('addresses'));

export const createAddress = (payload) =>
    axios.post('/api/account/addresses', payload).then(unwrap('address'));

export const updateAddress = (id, payload) =>
    axios.put(`/api/account/addresses/${id}`, payload).then(unwrap('address'));

export const deleteAddress = (id) => axios.delete(`/api/account/addresses/${id}`);

/* ---- cart ----
   The draft cart lives against the account so it follows the retailer between
   devices; CartContext keeps a localStorage copy as well for guests and for
   surviving a reload before the pull lands. */

export const getCart = () => axios.get('/api/account/cart').then(unwrap('items'));

export const saveCart = (items) =>
    axios.put('/api/account/cart', { items }).then(unwrap('items'));

export const listOrders = () => axios.get('/api/account/orders').then(unwrap('orders'));

export const getOrder = (code) =>
    axios.get(`/api/account/orders/${encodeURIComponent(code)}`).then(unwrap('order'));

export const placeOrder = (payload) =>
    axios.post('/api/account/orders', payload).then(unwrap('order'));

/* ---- paying an order ----
   Two steps because that is how both gateways work: open a payment, let the
   buyer approve it in the gateway's own UI, then come back to be verified.
   Neither call carries an amount — the server takes that off the order. */

export const startPayment = (code, gateway) =>
    axios
        .post(`/api/account/orders/${encodeURIComponent(code)}/pay`, { gateway })
        .then((r) => r.data);

export const confirmPayment = (code, { gateway, gatewayOrderId, payload }) =>
    axios
        .post(`/api/account/orders/${encodeURIComponent(code)}/pay/confirm`, {
            gateway,
            gateway_order_id: gatewayOrderId,
            payload,
        })
        .then((r) => r.data);

export const cancelOrder = (code, reason) =>
    axios
        .post(`/api/account/orders/${encodeURIComponent(code)}/cancel`, { reason })
        .then(unwrap('order'));

export const trackOrder = (code) =>
    axios.get(`/api/track/${encodeURIComponent(code)}`).then(unwrap('order'));

/* ---- staff ---- */

/** Mirrors Order::STATUSES in app/Models/Order.php — keep the two in step. */
export const ORDER_STATUSES = [
    { value: 'placed', label: 'Order Placed' },
    { value: 'payment_received', label: 'Payment Received' },
    { value: 'cutting', label: 'Cutting' },
    { value: 'stitching', label: 'Stitching' },
    { value: 'qc', label: 'QC' },
    { value: 'dispatch', label: 'Dispatch' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' },
];

export const adminStats = () => axios.get('/api/admin/stats').then((r) => r.data);

export const adminListOrders = (params) =>
    axios.get('/api/admin/orders', { params }).then((r) => r.data);

export const adminGetOrder = (code) =>
    axios.get(`/api/admin/orders/${encodeURIComponent(code)}`).then(unwrap('order'));

export const adminUpdateOrderStatus = (code, payload) =>
    axios.put(`/api/admin/orders/${encodeURIComponent(code)}/status`, payload).then(unwrap('order'));

export const adminUpdateOrderItems = (code, payload) =>
    axios.put(`/api/admin/orders/${encodeURIComponent(code)}/items`, payload).then(unwrap('order'));

export const adminListRetailers = (params) =>
    axios.get('/api/admin/retailers', { params }).then((r) => r.data);

export const adminGetRetailer = (id) =>
    axios.get(`/api/admin/retailers/${id}`).then(unwrap('retailer'));

export const adminSetRole = (id, isAdmin) =>
    axios.put(`/api/admin/retailers/${id}/role`, { is_admin: isAdmin }).then((r) => r.data);

export const adminListProducts = () => axios.get('/api/admin/products').then((r) => r.data);

export const adminCreateProduct = (payload) =>
    axios.post('/api/admin/products', payload).then(unwrap('product'));

export const adminUpdateProduct = (id, payload) =>
    axios.put(`/api/admin/products/${id}`, payload).then(unwrap('product'));

export const adminDeleteProduct = (id) => axios.delete(`/api/admin/products/${id}`);

export const adminListColors = () => axios.get('/api/admin/colors').then(unwrap('colors'));

export const adminCreateColor = (payload) =>
    axios.post('/api/admin/colors', payload).then(unwrap('colors'));

export const adminUpdateColor = (id, payload) =>
    axios.put(`/api/admin/colors/${id}`, payload).then(unwrap('colors'));

export const adminDeleteColor = (id) =>
    axios.delete(`/api/admin/colors/${id}`).then(unwrap('colors'));

/**
 * Uploads one product or storefront photo and returns the path to store on the
 * record — a site-relative /uploads/… string, not an absolute URL, so the
 * images keep working if the site ever moves domain.
 */
export const adminUploadImage = (file, onProgress) => {
    const body = new FormData();
    body.append('file', file);

    return axios
        .post('/api/admin/media', body, {
            onUploadProgress: (e) =>
                onProgress?.(e.total ? Math.round((e.loaded / e.total) * 100) : 0),
        })
        .then(unwrap('url'));
};

export const adminGetSettings = () => axios.get('/api/admin/settings').then((r) => r.data);

export const adminSaveSettings = (payload) =>
    axios.put('/api/admin/settings', payload).then(unwrap('settings'));

/**
 * CSV downloads go through a plain navigation rather than axios — the response
 * is a file, and letting the browser handle it keeps the Save dialog native.
 */
export const adminExportUrl = (what, params = {}) => {
    const query = new URLSearchParams(
        Object.entries(params).filter(([, v]) => v)
    ).toString();

    return `/api/admin/${what}/export${query ? `?${query}` : ''}`;
};

/**
 * Flattens a Laravel 422 body into { field: "first message" } so a form can
 * hang each message off its own input.
 */
export const fieldErrors = (error) => {
    const errors = error?.response?.data?.errors;

    if (!errors) return {};

    return Object.fromEntries(Object.entries(errors).map(([field, list]) => [field, list[0]]));
};

/** The one message worth showing when a request fails for no field in particular. */
export const generalError = (error, fallback) =>
    error?.response?.data?.message || fallback;

export const formatDate = (iso) =>
    new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
