// Centralized API configuration
export const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || BASE_URL;
export const FLASK_URL = import.meta.env.VITE_FLASK_URL || 'http://localhost:5001';
export const PUBLIC_URL = import.meta.env.VITE_PUBLIC_URL || window.location.origin;
