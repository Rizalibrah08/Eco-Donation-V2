import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api, { getErrorMessage } from '../../services/api';
import { browseNonprofits, searchNonprofits, GlobalNonprofit } from '../../services/everyOrg';
import { useDebounce } from '../../hooks/useDebounce';
import { CampaignCard } from '../../components/CampaignCard';
import { GlobalCard } from '../../components/GlobalCard';
import {
  Chip, EmptyState, Input, Segmented, SkeletonCard, Text, colors, spacing,
} from '../../ui';
import type { Campaign } from '../../lib/types';

const CATEGORIES = ['Semua', 'Pendidikan', 'Lingkungan', 'Bencana Alam', 'Panti Asuhan'];
type Tab = 'local' | 'global';

export default function KatalogScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('local');
  const [query, setQuery] = useState('');
  const debounced = useDebounce(query, 400);

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.md }]}>
      <View style={styles.header}>
        <Text variant="title">Salurkan Donasi</Text>
        <Text variant="bodySmall" tone="muted" style={styles.sub}>Tukarkan poin Anda untuk kampanye sosial pilihan.</Text>
        <Segmented
          value={tab}
          onChange={(v) => { setTab(v); setQuery(''); }}
          options={[{ value: 'local', label: 'Kampanye Lokal' }, { value: 'global', label: 'Organisasi Global' }]}
          style={styles.segment}
        />
        <Input
          icon="search"
          placeholder={tab === 'local' ? 'Cari kampanye atau penyelenggara' : 'Cari organisasi lingkungan (Inggris)'}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          autoCorrect={false}
        />
      </View>
      {tab === 'local' ? (
        <LocalList search={debounced} onOpen={(id) => router.push(`/campaign/${id}`)} />
      ) : (
        <GlobalList search={debounced} onOpen={(id) => router.push(`/campaign/global/${encodeURIComponent(id)}`)} />
      )}
    </View>
  );
}

function LocalList({ search, onOpen }: { search: string; onOpen: (id: number) => void }) {
  const [category, setCategory] = useState('Semua');
  const [items, setItems] = useState<Campaign[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const { data } = await api.get<Campaign[]>('/campaigns', { params: { category, search: search || undefined } });
      setItems(data);
    } catch (err) {
      setError(getErrorMessage(err));
      setItems([]);
    }
  }, [category, search]);

  useEffect(() => { setItems(null); load(); }, [load]);

  return (
    <FlatList
      data={items || []}
      keyExtractor={(c) => String(c.id)}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      refreshing={refreshing}
      onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }}
      ListHeaderComponent={
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {CATEGORIES.map((c) => <Chip key={c} label={c} selected={category === c} onPress={() => setCategory(c)} />)}
        </ScrollView>
      }
      renderItem={({ item }) => <CampaignCard campaign={item} onPress={() => onOpen(item.id)} />}
      ListEmptyComponent={
        items === null ? (
          <View>{[0, 1].map((i) => <SkeletonCard key={i} lines={4} />)}</View>
        ) : error ? (
          <EmptyState icon="cloud-offline-outline" title="Gagal memuat" message={error} actionLabel="Coba lagi" onAction={load} />
        ) : (
          <EmptyState icon="search-outline" title="Kampanye tidak ditemukan" message="Coba kata kunci atau kategori lain." />
        )
      }
    />
  );
}

function GlobalList({ search, onOpen }: { search: string; onOpen: (id: string) => void }) {
  const [items, setItems] = useState<GlobalNonprofit[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const page = useRef(1);
  const hasMore = useRef(true);

  const loadFirst = useCallback(async () => {
    setItems(null);
    setError(null);
    page.current = 1;
    try {
      if (search.trim().length >= 3) {
        setItems(await searchNonprofits(search.trim()));
        hasMore.current = false;
      } else {
        const res = await browseNonprofits(1);
        setItems(res.items);
        hasMore.current = res.hasMore;
      }
    } catch {
      setError('Tidak dapat memuat data dari Every.org. Periksa koneksi internet Anda.');
      setItems([]);
    }
  }, [search]);

  useEffect(() => { loadFirst(); }, [loadFirst]);

  const loadMore = async () => {
    if (loadingMore || !hasMore.current || !items?.length || search.trim().length >= 3) return;
    setLoadingMore(true);
    try {
      const res = await browseNonprofits(page.current + 1);
      page.current += 1;
      hasMore.current = res.hasMore;
      setItems((prev) => {
        const seen = new Set((prev || []).map((p) => p.id));
        return [...(prev || []), ...res.items.filter((i) => !seen.has(i.id))];
      });
    } catch {
      hasMore.current = false;
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <FlatList
      data={items || []}
      keyExtractor={(c) => c.id}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      onEndReached={loadMore}
      onEndReachedThreshold={0.4}
      ListHeaderComponent={
        <Text variant="caption" tone="subtle" style={styles.note}>
          Data organisasi dari Every.org. Donasi poin dicatat oleh Eco-Donation dan disalurkan secara berkala.
        </Text>
      }
      renderItem={({ item }) => <GlobalCard item={item} onPress={() => onOpen(item.id)} />}
      ListFooterComponent={loadingMore ? <SkeletonCard lines={2} /> : null}
      ListEmptyComponent={
        items === null ? (
          <View>{[0, 1].map((i) => <SkeletonCard key={i} lines={3} />)}</View>
        ) : error ? (
          <EmptyState icon="cloud-offline-outline" title="Gagal memuat" message={error} actionLabel="Coba lagi" onAction={loadFirst} />
        ) : (
          <EmptyState icon="search-outline" title="Organisasi tidak ditemukan" message="Coba kata kunci lain dalam bahasa Inggris." />
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  sub: { marginTop: 2 },
  segment: { marginVertical: spacing.lg },
  chips: { gap: spacing.sm, paddingBottom: spacing.lg },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl },
  note: { marginBottom: spacing.md },
});
