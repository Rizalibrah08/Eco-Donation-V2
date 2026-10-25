import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import api, { getErrorMessage } from '../services/api';
import { searchAddress, reverseGeocode, GeocodingResult } from '../services/geocodingService';
import { useDebounce } from '../hooks/useDebounce';
import { useRates } from '../hooks/useRates';
import { LeafletMap, MapHandle, LatLng } from '../components/LeafletMap';
import {
  AppBar, Button, Card, CategoryTile, Dialog, Input, Screen, Text, categoryStyle, colors, fonts, radius, spacing, toast, Icon } from '../ui';
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
        header={<AppBar title="Setor sampah" subtitle="Penjemputan gratis ke lokasi Anda" />}
        footer={
          <View style={styles.footer}>
            <View style={styles.flex}>
              <Text variant="caption" tone="muted" tabular>Estimasi {formatNumber(totalKg, 1)} kg</Text>
              <Text variant="heading" tone="success" tabular>+{formatNumber(estimate)} poin</Text>
            </View>
            <Button title="Lanjutkan" onPress={review} style={styles.footerBtn} />
          </View>
        }
      >
        {/* Jenis sampah */}
        <SectionTitle title="Jenis sampah" subtitle="Pilih satu atau beberapa kategori." first />
        <View style={styles.grid}>
          {Object.keys(rates).map((c) => {
            const cat = categoryStyle(c);
            const active = weights[c] !== undefined;
            return (
              <Pressable key={c} accessibilityRole="checkbox" accessibilityState={{ checked: active }}
                onPress={() => toggle(c)}
                style={({ pressed }) => [
                  styles.cat,
                  active ? { backgroundColor: cat.bg, borderColor: cat.ink, borderWidth: 1.5 } : pressed && styles.pressed,
                ]}>
                <Icon name={cat.icon} size={22} color={cat.ink} />
                <Text variant="subheading" style={[styles.catName, active && { color: cat.ink }]} numberOfLines={1}>{c}</Text>
                <Text variant="caption" tabular style={{ color: active ? cat.ink : colors.textMuted }}>
                  {formatNumber(rates[c])} poin/kg
                </Text>
                <View style={[styles.check, active && { backgroundColor: cat.ink, borderColor: cat.ink }]}>
                  {active && <Icon name="checkmark" size={14} color="#FFFFFF" />}
                </View>
              </Pressable>
            );
          })}
        </View>
        {showErrors && errors.items && <Text variant="caption" tone="danger" style={styles.err}>{errors.items}</Text>}

        {selected.length > 0 && (
          <Card style={styles.weights}>
            {selected.map(([c, w]) => (
              <View key={c} style={styles.weightRow}>
                <CategoryTile name={c} size={32} />
                <Text variant="body" style={styles.flex} numberOfLines={1}>{c}</Text>
                <Stepper value={w} onChange={(v) => setWeight(c, v)} />
              </View>
            ))}
            <Text variant="caption" tone="muted">Berat final ditimbang kurir di lokasi dan Anda setujui sebelum poin masuk.</Text>
          </Card>
        )}

        {/* Lokasi */}
        <SectionTitle title="Lokasi penjemputan" subtitle="Geser peta hingga pin tepat di lokasi Anda." />
        <View style={styles.searchWrap}>
          <Input icon="search-outline" placeholder="Cari alamat atau tempat" value={query} onChangeText={setQuery} autoCorrect={false} />
          {suggestions.length > 0 && (
            <Card padded={false} style={styles.suggestions}>
              {suggestions.map((s, i) => (
                <Pressable key={`${s.lat}-${s.lon}-${i}`} onPress={() => pickSuggestion(s)}
                  style={({ pressed }) => [styles.suggestion, i > 0 && styles.suggestionBorder, pressed && styles.pressed]}>
                  <Icon name="location-outline" size={18} color={colors.textMuted} />
                  <View style={styles.flex}>
                    <Text variant="bodySmall" weight="600" numberOfLines={1}>{s.name}</Text>
                    <Text variant="caption" tone="muted" numberOfLines={1}>{s.address}</Text>
                  </View>
                </Pressable>
              ))}
            </Card>
          )}
        </View>
        <View style={styles.mapWrap}>
          <LeafletMap ref={mapRef} center={DEFAULT_POS} zoom={15} picker style={styles.map}
            onMove={(p) => { setPos(p); setAddressTouched(false); }} />
          <Pressable accessibilityRole="button" accessibilityLabel="Gunakan lokasi saya" onPress={() => locateMe()}
            style={({ pressed }) => [styles.gps, pressed && styles.pressed]}>
            <Icon name={locating ? 'hourglass-outline' : 'locate-outline'} size={20} color={colors.text} />
          </Pressable>
        </View>
        <Input
          label="Alamat lengkap"
          icon="location-outline"
          value={address}
          onChangeText={(t) => { setAddress(t); setAddressTouched(true); }}
          placeholder="Nama jalan, nomor rumah, RT/RW"
          multiline
          error={showErrors ? errors.address : null}
          containerStyle={styles.field}
        />
        <Input
          label="Patokan (opsional)"
          value={note}
          onChangeText={setNote}
          placeholder="Contoh: pagar hijau, depan masjid"
          maxLength={80}
          containerStyle={styles.field}
        />

        {/* Jadwal */}
        <SectionTitle title="Jadwal penjemputan" subtitle="Senin–Sabtu, pukul 08.00–18.00." />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.days}>
          {days.map((d, i) => {
            const on = day === i;
            return (
              <Pressable key={d.toISOString()} accessibilityRole="button" accessibilityState={{ selected: on }}
                onPress={() => setDay(i)} style={[styles.day, on && styles.daySelected]}>
                <Text variant="caption" style={{ color: on ? colors.onPrimary : colors.textMuted }}>{formatDayLabel(d)}</Text>
                <Text variant="heading" tabular style={[styles.dayNo, { color: on ? colors.onPrimary : colors.text }]}>{d.getDate()}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={styles.slots}>
          {SLOTS.map((h) => {
            const on = slot === h;
            const past = isSlotPast(days[day], h);
            return (
              <Pressable key={h} accessibilityRole="button" accessibilityState={{ selected: on, disabled: past }}
                disabled={past} onPress={() => setSlot(h)}
                style={({ pressed }) => [styles.slot, on && styles.slotSelected, pressed && !on && styles.pressed, past && styles.slotPast]}>
                <Text variant="bodySmall" weight={on ? '600' : '400'} tabular style={{ color: on ? colors.primary : colors.text }}>
                  {`${String(h).padStart(2, '0')}.00`}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {showErrors && errors.slot && <Text variant="caption" tone="danger" style={styles.err}>{errors.slot}</Text>}
      </Screen>

      <Dialog
        visible={confirm}
        tone="primary"
        icon="bicycle-outline"
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
          <Text variant="caption" tone="muted" numberOfLines={2} style={{ marginTop: spacing.sm }}>{address}</Text>
        </View>
      </Dialog>
    </>
  );
}

function SectionTitle({ title, subtitle, first }: { title: string; subtitle: string; first?: boolean }) {
  return (
    <View style={[styles.section, first && styles.sectionFirst]}>
      <Text variant="heading">{title}</Text>
      <Text variant="bodySmall" tone="muted">{subtitle}</Text>
    </View>
  );
}

function Stepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [text, setText] = useState(String(value));
  useEffect(() => { setText(String(value).replace('.', ',')); }, [value]);
  return (
    <View style={styles.stepper}>
      <Pressable accessibilityLabel="Kurangi berat" onPress={() => onChange(value - STEP)} style={styles.stepBtn} hitSlop={6}>
        <Icon name="remove" size={18} color={colors.text} />
      </Pressable>
      <View style={styles.stepValue}>
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
        <Text variant="caption" tone="muted">kg</Text>
      </View>
      <Pressable accessibilityLabel="Tambah berat" onPress={() => onChange(value + STEP)} style={styles.stepBtn} hitSlop={6}>
        <Icon name="add" size={18} color={colors.text} />
      </Pressable>
    </View>
  );
}

function SummaryRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <Text variant="bodySmall" tone="muted">{label}</Text>
      <Text variant="bodySmall" weight="600" tone={strong ? 'success' : 'default'} tabular>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { backgroundColor: colors.surfaceAlt },
  footer: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  footerBtn: { minWidth: 140 },
  section: { marginTop: spacing.xxl, marginBottom: spacing.md, gap: 2 },
  sectionFirst: { marginTop: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.md },
  cat: {
    width: '48.2%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  catName: { marginTop: spacing.md },
  check: {
    position: 'absolute', top: spacing.md, right: spacing.md, width: 22, height: 22, borderRadius: 11,
    borderWidth: 1.5, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center',
  },
  err: { marginTop: spacing.sm },
  weights: { marginTop: spacing.lg, gap: spacing.md },
  weightRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepper: {
    flexDirection: 'row', alignItems: 'center', height: 40, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface, paddingHorizontal: spacing.xs,
  },
  stepBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  stepValue: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minWidth: 60, gap: 2 },
  stepInput: {
    minWidth: 28, paddingVertical: 0, paddingHorizontal: 0, textAlign: 'right',
    fontSize: 15, fontFamily: fonts.semibold, color: colors.text, fontVariant: ['tabular-nums'],
  },
  searchWrap: { zIndex: 10, marginBottom: spacing.md },
  suggestions: { position: 'absolute', top: 56, left: 0, right: 0, zIndex: 20, overflow: 'hidden' },
  suggestion: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  suggestionBorder: { borderTopWidth: 1, borderTopColor: colors.rule },
  mapWrap: { borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  map: { height: 220 },
  gps: {
    position: 'absolute', right: spacing.md, bottom: spacing.md, width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
  },
  field: { marginTop: spacing.lg },
  days: { gap: spacing.sm, paddingBottom: spacing.xs },
  day: {
    width: 60, paddingVertical: spacing.sm + 2, borderRadius: 14, alignItems: 'center',
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  daySelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayNo: { marginTop: 2, fontSize: 18, lineHeight: 24 },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  slot: {
    width: '22.8%', height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  slotSelected: { backgroundColor: colors.primarySoft, borderColor: colors.primary, borderWidth: 1.5 },
  slotPast: { opacity: 0.4 },
  summary: { alignSelf: 'stretch', marginTop: spacing.lg, padding: spacing.md, borderRadius: 14, backgroundColor: colors.surfaceAlt },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
});
