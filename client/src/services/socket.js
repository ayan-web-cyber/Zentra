import { io } from 'socket.io-client';

let socket = null;

// See services/api.js — same reasoning. Defaults to same-origin; set VITE_SOCKET_URL
// (e.g. https://api.yourdomain.com) if the backend lives on a different host than the
// frontend, or the socket connection will silently fail to establish.
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '/';

// One socket for the whole app lifetime, created after login and torn down on logout.
// withCredentials sends the same httpOnly JWT cookie the REST API uses, so no separate
// token has to be plumbed through — the server's socketAuth middleware reads that cookie.
export function connectSocket() {
  if (socket?.connected) return socket;
  socket = io(SOCKET_URL, { withCredentials: true, autoConnect: true });
  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
