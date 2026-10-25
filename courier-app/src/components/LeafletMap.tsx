import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View, StyleProp, ViewStyle } from 'react-native';
import { WebView } from 'react-native-webview';
import { colors } from '../ui/theme';
import { buildMapHtml, MapMarker, LatLng, MapHandle } from './mapHtml';

export type { MapMarker, LatLng, MapHandle };

interface LeafletMapProps {
  center: LatLng;
  zoom?: number;
  markers?: MapMarker[];
  /** Mode pilih lokasi: pin tetap di tengah, peta digeser. */
  picker?: boolean;
  onMove?: (pos: LatLng) => void;
  fitMarkers?: boolean;
  interactive?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const LeafletMap = forwardRef<MapHandle, LeafletMapProps>(function LeafletMap(
  { center, zoom = 16, markers = [], picker = false, onMove, fitMarkers = false, interactive = true, style },
  ref,
) {
  const webRef = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  // HTML dibuat sekali; perubahan berikutnya dikirim sebagai perintah.
  const html = useMemo(() => buildMapHtml({ center, zoom, picker, interactive }), []); // eslint-disable-line react-hooks/exhaustive-deps

  const send = useCallback((cmd: object) => {
    webRef.current?.injectJavaScript(`window.__apply(${JSON.stringify(cmd)}); true;`);
  }, []);

  useImperativeHandle(ref, () => ({
    setCenter: (pos, z) => send({ center: pos, zoom: z }),
  }), [send]);

  useEffect(() => {
    if (ready) send({ markers, fit: fitMarkers });
  }, [ready, markers, fitMarkers, send]);

  return (
    <View style={[styles.wrap, style]}>
      <WebView
        ref={webRef}
        originWhitelist={['*']}
        source={{ html }}
        style={styles.web}
        scrollEnabled={false}
        javaScriptEnabled
        domStorageEnabled
        onMessage={(e) => {
          try {
            const msg = JSON.parse(e.nativeEvent.data);
            if (msg.type === 'ready') setReady(true);
            if (msg.type === 'move') onMove?.({ lat: msg.lat, lng: msg.lng });
          } catch {}
        }}
      />
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
  web: { flex: 1, backgroundColor: 'transparent' },
  loading: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt },
});
