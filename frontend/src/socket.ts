import { io } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
// Extract base URL (strip /api if present)
const SOCKET_URL = API_URL.replace('/api', '');

const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true
});

export default socket;
