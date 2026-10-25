import React, { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppBar, Button, Card, Screen, Text, colors, radius, spacing } from '../ui';

const FAQS = [
  {
    question: 'Bagaimana cara menyetor sampah?',
    answer:
      'Di Beranda, tekan "Setor Sampah". Pilih kategori dan perkiraan berat, tentukan lokasi serta jadwal penjemputan, lalu kirim. Kurir terdekat akan mengambil permintaan Anda dan Anda bisa memantau posisinya secara langsung.',
  },
  {
    question: 'Bagaimana poin dihitung?',
    answer:
      'Kurir menimbang sampah di lokasi Anda. Poin dihitung dari berat aktual dikali tarif tiap kategori. Anda melihat rinciannya sebelum menyetujui, jadi tidak ada poin yang masuk tanpa persetujuan Anda.',
  },
  {
    question: 'Bagaimana cara menyetujui hasil timbangan?',
    answer:
      'Setelah menimbang, kurir menampilkan QR di HP-nya. Tekan "Pindai QR" lalu arahkan kamera ke QR tersebut, periksa rinciannya, dan tekan Setujui. Bila kamera bermasalah, masukkan 6 karakter kode yang tampil di bawah QR.',
  },
  {
    question: 'Bagaimana jika berat timbangan tidak sesuai?',
    answer:
      'Tekan Tolak pada layar persetujuan dan tuliskan alasannya. Kurir akan diminta menimbang ulang bersama Anda sebelum kode baru dibuat.',
  },
  {
    question: 'Poin saya digunakan untuk apa?',
    answer:
      'Poin tidak ditukar dengan hadiah atau voucher. Poin Anda didonasikan ke kampanye sosial dan lingkungan pilihan Anda di tab "Donasi". Setiap poin dikonversi menjadi rupiah dan tercatat di riwayat donasi.',
  },
  {
    question: 'Apa itu lencana?',
    answer:
      'Lencana adalah penghargaan atas kontribusi Anda, misalnya total kilogram yang disetor atau jumlah donasi. Setiap lencana memiliki tingkat perunggu, perak, dan emas yang bisa dilihat di Profil.',
  },
  {
    question: 'Bisakah saya membatalkan penjemputan?',
    answer:
      'Bisa, selama kurir belum tiba di lokasi. Buka detail penjemputan lalu tekan "Batalkan penjemputan".',
  },
];

export default function HelpScreen() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <Screen header={<AppBar title="Pusat bantuan" />}>
      <Card style={styles.contact}>
        <View style={styles.contactIcon}>
          <Ionicons name="headset" size={26} color={colors.primary} />
        </View>
        <View style={styles.flex}>
          <Text variant="subheading">Butuh bantuan langsung?</Text>
          <Text variant="bodySmall" tone="muted">Tim kami membalas email pada hari kerja.</Text>
        </View>
      </Card>
      <Button
        title="Kirim email ke tim dukungan"
        icon="mail-outline"
        variant="secondary"
        style={styles.contactBtn}
        onPress={() => Linking.openURL('mailto:support@ecodonation.com?subject=Bantuan%20Aplikasi')}
      />

      <Text variant="heading" style={styles.section}>Pertanyaan umum</Text>
      <Card padded={false} style={styles.list}>
        {FAQS.map((faq, i) => {
          const expanded = open === i;
          return (
            <View key={faq.question} style={i > 0 && styles.rowBorder}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded }}
                onPress={() => setOpen(expanded ? null : i)}
                style={({ pressed }) => [styles.q, pressed && styles.pressed]}
              >
                <Text variant="subheading" tone={expanded ? 'primary' : 'default'} style={styles.flex}>
                  {faq.question}
                </Text>
                <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18}
                  color={expanded ? colors.primary : colors.textSubtle} />
              </Pressable>
              {expanded && (
                <Text variant="bodySmall" tone="muted" style={styles.a}>{faq.answer}</Text>
              )}
            </View>
          );
        })}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  contact: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.primarySoft, borderColor: colors.primarySoft },
  contactIcon: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  contactBtn: { marginTop: spacing.md },
  section: { marginTop: spacing.xxl, marginBottom: spacing.md },
  list: { overflow: 'hidden' },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  q: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  pressed: { backgroundColor: colors.surfaceAlt },
  a: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, marginTop: -spacing.xs, borderRadius: radius.sm },
});
