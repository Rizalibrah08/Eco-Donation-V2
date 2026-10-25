import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_URL } from '../lib/config';

type Handler = (payload: any) => void;

let socket: Socket | null = null;
let currentToken: string | null = null;
const listeners = new Map<string, Set<Handler>>();

// Satu koneksi untuk seluruh aplikasi. Listener didaftarkan lewat registry
// sehingga tetap berlaku walaupun socket tersambung ulang / dibuat ulang.
export function connectSocket(token: string) {
  if (socket && currentToken === token) return;
  disconnectSocket();
  currentToken = token;
  socket = io(API_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 10000,
  });
  socket.onAny((event: string, payload: unknown) => {
    listeners.get(event)?.forEach((h) => h(payload));
    listeners.get('*')?.forEach((h) => h({ event, payload }));
  });
}

export function disconnectSocket() {
  socket?.removeAllListeners();
  socket?.disconnect();
  socket = null;
  currentToken = null;
}

export function subscribe(events: string | string[], handler: Handler) {
  const list = Array.isArray(events) ? events : [events];
  list.forEach((e) => {
    if (!listeners.has(e)) listeners.set(e, new Set());
    listeners.get(e)!.add(handler);
  });
  return () => list.forEach((e) => listeners.get(e)?.delete(handler));
}

// Hook: handler selalu versi terbaru tanpa perlu re-subscribe.
export function useSocketEvent(events: string | string[], handler: Handler) {
  const ref = useRef(handler);
  ref.current = handler;
  const key = Array.isArray(events) ? events.join('|') : events;
  useEffect(() => subscribe(key.split('|'), (p) => ref.current(p)), [key]);
}
