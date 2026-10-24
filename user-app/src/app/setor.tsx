import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import api, { getErrorMessage } from '../services/api';
import { searchAddress, reverseGeocode, GeocodingResult } from '../services/geocodingService';
import { useDebounce } from '../hooks/useDebounce';
import { useRates } from '../hooks/useRates';
import { LeafletMap, MapHandle, LatLng } from '../components/LeafletMap';
import {
  AppBar, Button, Card, Chip, Dialog, Input, Screen, Text, colors, radius, spacing, toast,
} from '../ui';
import { CATEGORY_META } from '../lib/status';
import { formatDayLabel, formatNumber } from '../lib/format';

const STEP = 0.5;
const MAX_KG = 500;
const SLOTS = [8, 9, 10, 11, 13, 14, 15, 16, 17];
const DEFAULT_POS: LatLng = { lat: -6.2, lng: 106.816666 }; // Jakarta

function nextDays(count: number) {
  const days: Date[] = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  while (days.length < count) {
    if (d.getDay() !== 0) days.push(new Date(d)); // Minggu libur
    d.setDate(d.getDate() + 1);
  }
  return days;
}

export default function SetorScreen() {
  const router = useRouter();
  const { rates } = useRates();
  const mapRef = useRef<MapHandle>(null);

  // Kategori & berat (kg)
  const [weights, setWeights] = useState<Record<string, number>>({});
  // Lokasi
  const [pos, setPos] = useState<LatLng>(DEFAULT_POS);
  const [address, setAddress] = useState('');
  const [addressTouched, setAddressTouched] = useState(false);
  const [note, setNote] = useState('');
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<GeocodingResult[]>([]);
  const [locating, setLocating] = useState(false);
  const debouncedQuery = useDebounce(query, 350);
  const debouncedPos = useDebounce(pos, 600);
  // Jadwal
  const days = useMemo(() => nextDays(7), []);
  const [day, setDay] = useState(0);
  const [slot, setSlot] = useState<number | null>(null);
  // Kirim
  const [confirm, setConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const selected = Object.entries(weights);
  const totalKg = selected.reduce((s, [, w]) => s + w, 0);
  const estimate = selected.reduce((s, [c, w]) => s + Math.round(w * (rates[c] || 0)), 0);

  const isSlotPast = (d: Date, hour: number) => {
    const t = new Date(d);
    t.setHours(hour, 0, 0, 0);
    return t.getTime() < Date.now() + 60 * 60 * 1000; // minimal 1 jam dari sekarang
  };

  // Pilih slot pertama yang tersedia saat hari berganti.
  useEffect(() => {
    if (slot !== null && !isSlotPast(days[day], slot)) return;
    setSlot(SLOTS.find((h) => !isSlotPast(days[day], h)) ?? null);
  }, [day]); // eslint-disable-line react-hooks/exhaustive-deps

  // Lokasi awal dari GPS (tanpa memaksa izin di awal bila ditolak).
  useEffect(() => { locateMe(true); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (debouncedQuery.trim().length < 3) { setSuggestions([]); return; }
    searchAddress(debouncedQuery, { lat: pos.lat, lon: pos.lng }).then(setSuggestions);
  }, [debouncedQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (addressTouched) return;
    reverseGeocode(debouncedPos.lat, debouncedPos.lng).then((a) => { if (!addressTouched) setAddress(a); });
  }, [debouncedPos]); // eslint-disable-line react-hooks/exhaustive-deps

  async function locateMe(silent = false) {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (!silent) toast.error('Izin lokasi ditolak', 'Aktifkan izin lokasi atau geser peta secara manual.');
        return;
      }
      setLocating(true);
      const { coords } = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const next = { lat: coords.latitude, lng: coords.longitude };
      setPos(next);
      setAddressTouched(false);
      mapRef.current?.setCenter(next, 17);
    } catch {
      if (!silent) toast.error('Lokasi tidak ditemukan', 'Pastikan GPS aktif lalu coba lagi.');
    } finally {
      setLocating(false);
    }
  }

  const pickSuggestion = (r: GeocodingResult) => {
    const next = { lat: r.lat, lng: r.lon };
    setPos(next);
    setAddress(r.address);
    setAddressTouched(true);
    setQuery('');
    setSuggestions([]);
    mapRef.current?.setCenter(next, 17);
  };

  const toggle = (category: string) =>
    setWeights((w) => {
      const next = { ...w };
      if (next[category] !== undefined) delete next[category];
      else next[category] = 1;
      return next;
    });

  const setWeight = (category: string, value: number) =>
    setWeights((w) => ({ ...w, [category]: Math.min(MAX_KG, Math.max(STEP, Math.round(value * 10) / 10)) }));

  const errors = {
    items: selected.length === 0 ? 'Pilih minimal satu jenis sampah.' : null,
    address: address.trim().length < 5 ? 'Lengkapi alamat penjemputan.' : null,
    slot: slot === null ? 'Pilih jam penjemputan.' : null,
  };

  const review = () => {
    setShowErrors(true);
    const first = Object.values(errors).find(Boolean);
    if (first) { toast.error('Lengkapi data', first); return; }
    setConfirm(true);
  };

  const submit = async () => {
    const date = new Date(days[day]);
    date.setHours(slot!, 0, 0, 0);
    setSubmitting(true);
    try {
      const { data } = await api.post('/pickups', {
        items: selected.map(([category, w]) => ({ category, estimated_weight: w })),
        pickup_address: (note.trim() ? `${address.trim()} (${note.trim()})` : address.trim()).slice(0, 300),
        pickup_lat: pos.lat,
        pickup_lng: pos.lng,
        scheduled_at: date.toISOString(),
      });
      setConfirm(false);
      toast.success('Penjemputan dijadwalkan', 'Kami sedang mencarikan kurir untuk Anda.');
      router.replace(`/pickup/${data.id}`);
    } catch (err) {
      toast.error('Gagal membuat permintaan', getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Screen
        header={<AppBar title="Setor Sampah" subtitle="Penjemputan gratis ke lokasi Anda" />}
        footer={
          <View style={styles.footer}>
            <View style={styles.flex}>
              <Text variant="caption" tone="subtle">Estimasi ({formatNumber(totalKg, 1)} kg)</Text>
              <Text variant="heading" tone="primary">+{formatNumber(estimate)} poin</Text>
            </View>
            <Button title="Lanjutkan" iconRight="arrow-forward" onPress={review} />
          </View>
        }
      >
        {/* 1. Jenis sampah */}
        <StepTitle n={1} title="Jenis sampah" subtitle="Pilih satu atau beberapa kategori." />
        <View style={styles.grid}>
          {Object.keys(rates).map((c) => {
            const meta = CATEGORY_META[c] || { icon: 'cube' as const, color: colors.primary };
            const active = weights[c] !== undefined;
            return (
              <Pressable key={c} accessibilityRole="checkbox" accessibilityState={{ checked: active }}
                onPress={() => toggle(c)}
                style={[styles.cat, active && { borderColor: meta.color, backgroundColor: meta.color + '0F' }]}>
                <View style={[styles.catIcon, { backgroundColor: meta.color + '1A' }]}>
                  <Ionicons name={meta.icon} size={22} color={meta.color} />
                </View>
                <Text variant="subheading">{c}</Text>
                <Text variant="caption" tone="subtle">{formatNumber(rates[c])} poin/kg</Text>
                <View style={[styles.check, active && { backgroundColor: meta.color, borderColor: meta.color }]}>
                  {active && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                </View>
              </Pressable>
            );
          })}
        </View>
        {showErrors && errors.items && <Text variant="caption" tone="danger" style={styles.err}>{errors.items}</Text>}

        {selected.length > 0 && (
          <Card style={styles.weights}>
            <Text variant="bodySmall" weight="700" tone="muted" style={styles.weightsTitle}>Perkiraan berat</Text>
            {selected.map(([c, w]) => (
              <View key={c} style={styles.weightRow}>
                <Text variant="subheading" style={styles.flex}>{c}</Text>
                <Stepper value={w} onChange={(v) => setWeight(c, v)} />
              </View>
            ))}
            <Text variant="caption" tone="subtle">Berat final ditimbang kurir di lokasi dan Anda setujui sebelum poin masuk.</Text>
          </Card>
        )}

        {/* 2. Lokasi */}
        <StepTitle n={2} title="Lokasi penjemputan" subtitle="Geser peta hingga pin tepat di lokasi Anda." />
        <View style={styles.searchWrap}>
          <Input icon="search" placeholder="Cari alamat atau tempat" value={query} onChangeText={setQuery} autoCorrect={false} />
          {suggestions.length > 0 && (
            <Card padded={false} elevated style={styles.suggestions}>
              {suggestions.map((s, i) => (
                <Pressable key={`${s.lat}-${s.lon}-${i}`} onPress={() => pickSuggestion(s)}
                  style={({ pressed }) => [styles.suggestion, i > 0 && styles.suggestionBorder, pressed && { backgroundColor: colors.surfaceAlt }]}>
                  <Ionicons name="location-outline" size={18} color={colors.textSubtle} />
                  <View style={styles.flex}>
                    <Text variant="bodySmall" weight="600" numberOfLines={1}>{s.name}</Text>
                    <Text variant="caption" tone="subtle" numberOfLines={1}>{s.address}</Text>
                  </View>
                </Pressable>
              ))}
            </Card>
          )}
        </View>
        <View style={styles.mapWrap}>
          <LeafletMap ref={mapRef} center={DEFAULT_POS} zoom={15} picker style={styles.map}
            onMove={(p) => { setPos(p); setAddressTouched(false); }} />
          <Pressable accessibilityRole="button" accessibilityLabel="Gunakan lokasi saya" onPress={() => locateMe()} style={styles.gps}>
            <Ionicons name={locating ? 'hourglass-outline' : 'locate'} size={20} color={colors.primary} />
          </Pressable>
        </View>
        <Input
          label="Alamat lengkap"
          icon="home-outline"
          value={address}
          onChangeText={(t) => { setAddress(t); setAddressTouched(true); }}
          placeholder="Nama jalan, nomor rumah, RT/RW"
          multiline
          error={showErrors ? errors.address : null}
          containerStyle={styles.field}
        />
        <Input
          label="Patokan (opsional)"
          icon="flag-outline"
          value={note}
          onChangeText={setNote}
          placeholder="Contoh: pagar hijau, depan masjid"
          maxLength={80}
          containerStyle={styles.field}
        />

        {/* 3. Jadwal */}
        <StepTitle n={3} title="Jadwal penjemputan" subtitle="Senin–Sabtu, pukul 08.00–18.00." />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.days}>
          {days.map((d, i) => (
            <Pressable key={d.toISOString()} accessibilityRole="button" accessibilityState={{ selected: day === i }}
              onPress={() => setDay(i)} style={[styles.day, day === i && styles.daySelected]}>
              <Text variant="caption" weight="600" style={{ color: day === i ? colors.onPrimary : colors.textMuted }}>{formatDayLabel(d)}</Text>
              <Text variant="title" style={{ color: day === i ? colors.onPrimary : colors.text }}>{d.getDate()}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <View style={styles.slots}>
          {SLOTS.map((h) => (
            <Chip key={h} label={`${String(h).padStart(2, '0')}.00`} selected={slot === h}
              disabled={isSlotPast(days[day], h)} onPress={() => setSlot(h)} />
          ))}
        </View>
        {showErrors && errors.slot && <Text variant="caption" tone="danger" style={styles.err}>{errors.slot}</Text>}
      </Screen>

      <Dialog
        visible={confirm}
        tone="primary"
        icon="bicycle"
        title="Konfirmasi penjemputan"
        cancelLabel="Ubah"
        confirmLabel="Ajukan"
        loading={submitting}
        onCancel={() => setConfirm(false)}
        onConfirm={submit}
      >
        <View style={styles.summary}>
          {selected.map(([c, w]) => (
            <SummaryRow key={c} label={c} value={`${formatNumber(w, 1)} kg`} />
          ))}
          <SummaryRow label="Jadwal" value={`${formatDayLabel(days[day])}, ${days[day].getDate()} • ${String(slot ?? 0).padStart(2, '0')}.00`} />
          <SummaryRow label="Estimasi poin" value={`+${formatNumber(estimate)}`} strong />
          <Text variant="caption" tone="subtle" numberOfLines={2} style={{ marginTop: spacing.sm }}>{address}</Text>
        </View>
      </Dialog>
    </>
  );
}

function StepTitle({ n, title, subtitle }: { n: number; title: string; subtitle: string }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepNo}><Text variant="caption" weight="800" style={{ color: colors.onPrimary }}>{n}</Text></View>
      <View style={styles.flex}>
        <Text variant="heading">{title}</Text>
        <Text variant="bodySmall" tone="muted">{subtitle}</Text>
      </View>
    </View>
  );
}

function Stepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [text, setText] = useState(String(value));
  useEffect(() => { setText(String(value).replace('.', ',')); }, [value]);
  return (
    <View style={styles.stepper}>
      <Pressable accessibilityLabel="Kurangi berat" onPress={() => onChange(value - STEP)} style={styles.stepBtn} hitSlop={6}>
        <Ionicons name="remove" size={18} color={colors.text} />
      </Pressable>
      <TextInput
        value={text}
        onChangeText={setText}
        onEndEditing={() => {
          const n = parseFloat(text.replace(',', '.'));
          if (Number.isFinite(n) && n > 0) onChange(n);
          else setText(String(value).replace('.', ','));
        }}
        keyboardType="decimal-pad"
        style={styles.stepInput}
        accessibilityLabel="Berat dalam kilogram"
      />
      <Text variant="caption" tone="subtle">kg</Text>
      <Pressable accessibilityLabel="Tambah berat" onPress={() => onChange(value + STEP)} style={styles.stepBtn} hitSlop={6}>
        <Ionicons name="add" size={18} color={colors.text} />
      </Pressable>
    </View>
  );
}

function SummaryRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <Text variant="bodySmall" tone="muted">{label}</Text>
      <Text variant="bodySmall" weight={strong ? '800' : '600'} tone={strong ? 'primary' : 'default'}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  step: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.md },
  stepNo: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  cat: {
    width: '47.8%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.md + 2,
    gap: 2,
  },
  catIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  check: {
    position: 'absolute', top: spacing.md, right: spacing.md, width: 22, height: 22, borderRadius: 11,
    borderWidth: 1.5, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center',
  },
  err: { marginTop: spacing.sm },
  weights: { marginTop: spacing.md, gap: spacing.md },
  weightsTitle: { textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 11 },
  weightRow: { flexDirection: 'row', alignItems: 'center' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 },
  stepBtn: {
    width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface,
  },
  stepInput: {
    minWidth: 52, height: 36, textAlign: 'center', fontSize: 16, fontWeight: '700', color: colors.text,
    borderRadius: radius.sm, backgroundColor: colors.surfaceAlt, paddingHorizontal: spacing.xs,
  },
  searchWrap: { zIndex: 10, marginBottom: spacing.md },
  suggestions: { position: 'absolute', top: 56, left: 0, right: 0, zIndex: 20 },
  suggestion: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  suggestionBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  mapWrap: { borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  map: { height: 230 },
  gps: {
    position: 'absolute', right: spacing.md, bottom: spacing.md, width: 42, height: 42, borderRadius: 21,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
  field: { marginTop: spacing.md },
  days: { gap: spacing.sm, paddingBottom: spacing.xs },
  day: {
    width: 64, paddingVertical: spacing.md, borderRadius: radius.md, alignItems: 'center',
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  daySelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  summary: { alignSelf: 'stretch', marginTop: spacing.lg, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
});
