// Centralized API configuration — Relative proxy auto-resolution for localhost & tunnels
export const BASE_URL = '';
export const SOCKET_URL = typeof window !== 'undefined' ? window.location.origin : '';
export const FLASK_URL = '';
export const PUBLIC_URL = typeof window !== 'undefined' ? window.location.origin : '';

