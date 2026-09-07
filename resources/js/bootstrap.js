import axios from 'axios';

window.axios = axios;

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

/* Auth runs on Laravel's own session cookie, so every request has to carry it
   and the matching CSRF token. Laravel reads the token from X-XSRF-TOKEN,
   which axios fills in from the XSRF-TOKEN cookie set by the web middleware. */
window.axios.defaults.withCredentials = true;
window.axios.defaults.withXSRFToken = true;
