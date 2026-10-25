import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View, StyleProp, ViewStyle } from 'react-native';
import { colors } from '../ui/theme';
import { buildMapHtml, MapMarker, LatLng, MapHandle } from './mapHtml';

export type { MapMarker, LatLng, MapHandle };

interface LeafletMapProps {
  center: LatLng;
  zoom?: number;
  markers?: MapMarker[];
  picker?: boolean;
  onMove?: (pos: LatLng) => void;
  fitMarkers?: boolean;
  interactive?: boolean;
  style?: StyleProp<ViewStyle>;
}

// Versi web: iframe srcDoc (react-native-webview tidak mendukung web).
export const LeafletMap = forwardRef<MapHandle, LeafletMapProps>(function LeafletMap(
  { center, zoom = 16, markers = [], picker = false, onMove, fitMarkers = false, interactive = true, style },
  ref,
) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [ready, setReady] = useState(false);
  const html = useMemo(() => buildMapHtml({ center, zoom, picker, interactive }), []); // eslint-disable-line react-hooks/exhaustive-deps
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

  const send = useCallback((cmd: object) => {
    const win = frameRef.current?.contentWindow as (Window & { __apply?: (c: object) => void }) | null;
    win?.__apply?.(cmd);
  }, []);

  useImperativeHandle(ref, () => ({ setCenter: (pos, z) => send({ center: pos, zoom: z }) }), [send]);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.source !== frameRef.current?.contentWindow) return;
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'ready') setReady(true);
        if (msg.type === 'move') onMoveRef.current?.({ lat: msg.lat, lng: msg.lng });
      } catch {}
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  useEffect(() => {
    if (ready) send({ markers, fit: fitMarkers });
  }, [ready, markers, fitMarkers, send]);

  return (
    <View style={[styles.wrap, style]}>
      {React.createElement('iframe', {
        ref: frameRef,
        srcDoc: html,
        title: 'Peta',
        style: { border: 0, width: '100%', height: '100%' },
      })}
      {!ready && (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', backgroundColor: colors.surfaceAlt },
  loading: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt },
});
