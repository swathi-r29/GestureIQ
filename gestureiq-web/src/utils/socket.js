//src/utils/socket.js

import { io } from 'socket.io-client';

let _socket = null;

export const getSocket = () => {
    if (!_socket) {
        _socket = io('/', {
            path: '/socket.io',
            secure: false, // development
            rejectUnauthorized: false,
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
        });

        _socket.on('connect', () => {
            console.log('[Socket Shared] Connected:', _socket.id);
        });

        _socket.on('disconnect', () => {
            console.log('[Socket Shared] Disconnected');
        });
    }
    return _socket;
};
