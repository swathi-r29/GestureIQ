//src/utils/socket.js

import { io } from 'socket.io-client';
import { SOCKET_URL } from './constants';

let _socket = null;

export const getSocket = () => {
    if (!_socket) {
        const socketUrl = SOCKET_URL;
        _socket = io(socketUrl, {
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 5,
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
