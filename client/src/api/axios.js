import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.PROD ? '/ams/server/api' : '/api',
    headers: { 'Content-Type': 'application/json' }
});

export const getServerUrl = (path) => {
    if (!path) return path;
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    const base = import.meta.env.PROD ? '/ams/server' : '';
    return `${base}${path.startsWith('/') ? path : '/' + path}`;
};

// Request interceptor: attach stored token
api.interceptors.request.use(config => {
    const token = localStorage.getItem('lms_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// Response interceptor: handle 401
api.interceptors.response.use(
    res => res,
    err => {
        const msg = (err.response?.data?.message || '').toLowerCase();
        // Only force logout if the token itself is invalid or expired
        // Generic "Unauthorized" from data endpoints should NOT log the user out
        const isTokenError = msg.includes('token') || msg.includes('expired') || msg.includes('invalid token');
        if (err.response?.status === 401 && isTokenError) {
            window.dispatchEvent(new Event('auth:logout'));
        }
        return Promise.reject(err);
    }
);

export default api;
