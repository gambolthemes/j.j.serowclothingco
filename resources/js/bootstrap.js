import axios from 'axios';

window.axios = axios;

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

/* Auth runs on Laravel's own session cookie, so every request has to carry it
   and the matching CSRF token. Laravel reads the token from X-XSRF-TOKEN,
   which axios fills in from the XSRF-TOKEN cookie set by the web middleware. */
window.axios.defaults.withCredentials = true;
window.axios.defaults.withXSRFToken = true;

/* Sessions expire while a tab sits open. Without this, every account and admin
   screen would just show "could not load" with no way back in. 401 is a dead
   session; 419 is its CSRF token going stale with it. A full page load rather
   than a react-router push, so the stale auth state in memory is discarded. */
const SESSION_LOST = [401, 419];

/* Screens a signed-out visitor is meant to be on. Bouncing them to /login from
   here would be a loop on the login screen itself, and would throw a retailer
   off the reset form mid-way through setting a new password. */
const GUEST_SCREENS = ['/login', '/signup', '/forgot-password', '/reset-password'];

window.axios.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error?.response?.status;
        const onLoginScreen = GUEST_SCREENS.includes(window.location.pathname);

        if (SESSION_LOST.includes(status) && !onLoginScreen) {
            window.location.assign('/login');
        }

        return Promise.reject(error);
    },
);
