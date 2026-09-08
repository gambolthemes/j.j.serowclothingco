import axios from 'axios';

const unwrap = (key) => (response) => response.data[key];

export const updateProfile = (payload) =>
    axios.put('/api/account/profile', payload).then(unwrap('user'));

export const updatePassword = (payload) => axios.put('/api/account/password', payload);

export const listAddresses = () => axios.get('/api/account/addresses').then(unwrap('addresses'));

export const createAddress = (payload) =>
    axios.post('/api/account/addresses', payload).then(unwrap('address'));

export const updateAddress = (id, payload) =>
    axios.put(`/api/account/addresses/${id}`, payload).then(unwrap('address'));

export const deleteAddress = (id) => axios.delete(`/api/account/addresses/${id}`);

export const listOrders = () => axios.get('/api/account/orders').then(unwrap('orders'));

export const getOrder = (code) =>
    axios.get(`/api/account/orders/${encodeURIComponent(code)}`).then(unwrap('order'));

export const placeOrder = (payload) =>
    axios.post('/api/account/orders', payload).then(unwrap('order'));

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

export const adminListRetailers = (params) =>
    axios.get('/api/admin/retailers', { params }).then((r) => r.data);

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
