import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import api from '../services/api';

export type SharingState = 'off' | 'starting' | 'on' | 'denied' | 'error';

const SEND_INTERVAL_MS = 10_000;

// Mengirim posisi kurir ke backend setiap ±10 detik selama `active` (status on_the_way).
// Backend meneruskannya ke pengguna lewat event `order:location`.
export function useLocationSharing(orderId: number, active: boolean): SharingState {
  const [state, setState] = useState<SharingState>('off');

  useEffect(() => {
    if (!active) {
      setState('off');
      return;
    }
    let cancelled = false;
    let sub: Location.LocationSubscription | null = null;
    let lastSent = 0;

    const send = ({ coords }: Location.LocationObject) => {
      const now = Date.now();
      if (now - lastSent < SEND_INTERVAL_MS - 500) return;
      lastSent = now;
      api
        .post(`/pickups/${orderId}/location`, { lat: coords.latitude, lng: coords.longitude })
        .then(() => !cancelled && setState('on'))
        .catch(() => !cancelled && setState('error'));
    };

    (async () => {
      setState('starting');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;
      if (status !== 'granted') {
        setState('denied');
        return;
      }
      const watcher = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: SEND_INTERVAL_MS, distanceInterval: 10 },
        send,
      );
      if (cancelled) watcher.remove();
      else sub = watcher;
    })().catch(() => !cancelled && setState('error'));

    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [orderId, active]);

  return state;
}
