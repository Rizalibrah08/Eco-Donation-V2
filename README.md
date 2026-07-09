# 🌿 Eco-Donation Assistant

## 📝 Summary

Eco-Donation Assistant adalah platform mobile berbasis React Native yang mengintegrasikan manajemen sampah daur ulang dengan sistem donasi sosial, di mana pengguna dapat menyetorkan sampah yang dikonversi menjadi Poin Donasi dan menyalurkannya ke kampanye sosial. Sistem ini menggunakan mekanisme verifikasi on-site (QR Code) untuk memastikan transparansi dan mencegah fraud, serta terintegrasi dengan Every.org API untuk akses donasi ke organisasi NGO internasional.

---

## 🛠️ Stack / Teknologi

| Kategori | Teknologi | Keterangan |
|----------|-----------|------------|
| **Bahasa Pemrograman** | TypeScript / JavaScript | Frontend & Backend |
| **Mobile Framework** | React Native + Expo SDK 56 | Cross-platform (Android & iOS) |
| **Backend** | Express.js 5.x | REST API server |
| **Database** | SQLite 3 | Database lokal (server-side) |
| **Real-time** | Socket.io 4.x | Notifikasi & live tracking |
| **State Management** | Zustand | Manajemen state React Native |
| **Peta & Geocoding** | MapLibre Native + Photon API | Peta interaktif & pencarian lokasi |
| **API Eksternal** | Every.org API | Data kampanye donasi NGO internasional |
| **QR Code** | react-native-qrcode-svg | Generasi QR untuk verifikasi anti-fraud |
| **Routing** | Expo Router | Navigasi file-based |

---

## 🔄 Flow Aplikasi

### Arsitektur Sistem

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    User App      │◄───►│   Backend API   │◄───►│   Courier App   │
│  (React Native)  │     │  (Express.js)   │     │  (React Native) │
│                  │     │    + SQLite     │     │                  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  Every.org API  │
                    │  (External)     │
                    └─────────────────┘
```

### Alur Utama (Workflow)

```mermaid
graph TD
    A[1. Setor Sampah: User memilih kategori & input berat] --> B[2. Pilih Lokasi: User tentukan titik jemput via Maps]
    B --> C[3. Buat Tiket: Sistem buat order dengan status Waiting]
    C --> D[4. Dispatch: Kurir menerima tugas via notifikasi real-time]
    D --> E[5. Penjemputan: Kurir menuju lokasi via Google Maps]
    E --> F[6. Verifikasi: Kurir menimbang berat aktual di lokasi]
    F --> G[7. Generate QR: Courier App buat QR Code dinamis]
    G --> H[8. Scan QR: User memindai QR sebagai tanda tangan digital]
    H --> I[9. Poin Cair: Sistem konversi berat aktual ke poin]
    I --> J[10. Donasi: User salurkan poin ke kampanye sosial]
```

### Fase Sistem

| Fase | Deskripsi | Komponen |
|------|-----------|----------|
| **Fase 1: Permintaan** | User input multi-kategori sampah, estimasi berat, pilih lokasi & jadwal | User App → Backend |
| **Fase 2: Penjemputan** | Kurir terima tugas, live tracking GPS, notifikasi ETA | Backend ↔ Courier App ↔ User App |
| **Fase 3: Verifikasi** | Penimbangan on-site, generate QR, scan QR sebagai digital signature | Courier App → User App → Backend |
| **Fase 4: Donasi** | User pilih kampanye, alokasi poin, konversi ke Rupiah | User App → Backend → Every.org API |
| **Fase 5: Dampak** | Kalkulasi jejak karbon, update portfolio dampak, badge pencapaian | Backend → User App |

---

## 🏗️ Komponen Sistem

| Komponen | Tech Stack | Fungsi |
|----------|------------|--------|
| `user-app` | Expo (React Native) | Setor sampah, donasi, leaderboard, notifikasi real-time |
| `courier-app` | Expo (React Native) | Penerimaan order, navigasi, verifikasi berat & QR |
| `backend-api` | Express + SQLite | REST API, WebSocket server, validasi koordinat |

---

## ✨ Sorotan Fitur & Implementasi Teknis

### 1. 🗺️ Fitur Peta, Geocoding, & Navigasi Kurir
Sistem navigasi dirancang dengan arsitektur berakurasi tinggi:
- **Pencarian Autocomplete & Penentuan Lokasi (User App)**: Menggunakan **MapLibre Native** dengan *tile server* dari **OpenFreeMap** dan **Photon API** untuk *geocoding*. Pengguna dapat mengetikkan sebagian nama tempat (mis: "UI Depok") untuk mendapatkan saran alamat (*autocomplete*) secara instan dengan teknik *debounce* 300ms.
- **Peta Interaktif (Draggable)**: Pengguna dapat menggeser peta (*draggable*) untuk mengatur posisi pin dengan sangat akurat. Lokasi ini kemudian di-*reverse geocode* untuk mendapatkan nama jalan otomatis.
- **Validasi Koordinat Ketat (Backend)**: Backend memvalidasi koordinat lokasi (latitude: -90 s/d 90, longitude: -180 s/d 180) serta mendeteksi *swapped coordinates* (titik lintang dan bujur terbalik) untuk mencegah misnavigasi. Peringatan akan muncul jika alamat berada di luar wilayah Indonesia.
- **Deep-Linking Navigasi Kurir (Courier App)**: Melalui tombol cerdas "Buka di Google Maps", kurir akan langsung diarahkan menuju rute penjemputan di **Google Maps** (Android) atau **Apple Maps** (iOS). Jika native app tidak terdeteksi, navigasi diarahkan sebagai *fallback* ke browser web secara mulus.

### 2. 🔔 Sistem Notifikasi Real-Time (Socket.io)
Dilengkapi dengan sistem notifikasi dua arah (*real-time*) berbasis *WebSocket* (tanpa Firebase):
- **Live Update Pesanan**: Pengguna langsung menerima notifikasi ketika permintaan pesanan diterima kurir tanpa perlu me-*refresh* aplikasi.
- **Estimasi Jarak (ETA)**: Sistem membaca *update* lokasi kurir setiap 30 detik secara latar belakang dan memberi notifikasi progres penjemputan otomatis (contoh: "Kurir tiba dalam ~5 menit" untuk jarak < 500m).
- **Panduan UI Otomatis**: Saat kurir selesai menimbang sampah, aplikasi akan memunculkan *prompt* khusus **"Pindai QR Sekarang"** di riwayat pengguna.

### 3. 🔐 Sistem Keamanan & Verifikasi (Anti-Fraud)
Untuk mencegah laporan fiktif pencairan poin sampah:
- Penimbangan wajib dilakukan langsung di lokasi (*on-site*).
- Courier App menghasilkan **Token/QR Code 6-digit** yang berlaku maksimal selama 30 menit.
- User App diwajibkan untuk memindai Token tersebut sebagai persetujuan (digital signature) sebelum poin donasi dicairkan.

### 4. 🎨 Desain Antarmuka Modern & Dinamis
- **Dashboard Statistik**: Menggunakan *card* elegan dengan *shadow* dan latar gradien.
- **Status Warna Dinamis**: Status ditandai dengan gradasi warna yang mudah dipahami: Menunggu (Merah/Alert), Verifikasi (Kuning), On The Way (Biru).
- **Feedback Interaktif**: Semua elemen klik memiliki animasi reaksi (*active opacity*) untuk *User Experience* yang responsif.

### 5. 🏆 Gamifikasi & Integrasi API Eksternal
- Sistem pencapaian berupa lencana (*Badges*) interaktif dengan _progress bar_ (contoh: Donatur Aktif).
- Selain API Backend (SQLite Lokal), aplikasi terintegrasi dengan **Every.org API** yang memungkinkan pengguna berdonasi kepada organisasi NGO internasional, tidak sebatas panti asuhan lokal.

---

## 💰 Sistem Poin & Dampak Lingkungan

| Kategori Sampah | Nilai per Kg |
|-----------------|--------------|
| Botol Plastik | 800 poin |
| Kertas | 600 poin |
| Kaleng | 1.000 poin |
| Botol Kaca | 500 poin |

**Konversi:** 1 Poin = Rp 1  
**Dampak Lingkungan:** Setiap 1 Kg sampah ≈ 1.5 Kg pengurangan emisi gas rumah kaca (CO₂).

---

## 🚀 Instalasi & Menjalankan Aplikasi

### Prasyarat
- Node.js ≥ 18
- npm
- Aplikasi **Expo Go** terinstal di smartphone penguji

### 1. Menyiapkan Backend API & Database
```bash
git clone https://github.com/Rizalibrah08/Eco-Donation-V2.git
cd Eco-Donation-V2/backend-api

npm install
npm run seed    # Melakukan inisialisasi basis data (dummy data)
npm start       # Menjalankan server Express di http://localhost:3000
```
> *(Skrip internal seperti `npm run migrate` atau `node check-all-coordinates.js` dapat digunakan sewaktu-waktu untuk audit struktur database lokasi).*

### 2. Menjalankan User App
Buka jendela terminal (tab) baru:
```bash
cd user-app
npm install
npx expo start
```
*Gunakan Expo Go di smartphone Anda untuk memindai kode QR.*

### 3. Menjalankan Courier App
Buka terminal baru:
```bash
cd courier-app
npm install
npx expo start --port 8082
```
*Gunakan Expo Go di smartphone Anda untuk memindai kode QR.*

---

## ⚙️ Konfigurasi Jaringan (Penting!)

Jika aplikasi diuji langsung melalui ponsel, **pastikan laptop server dan ponsel berada pada 1 jaringan WiFi yang sama**. 
Update IP alamat backend di file layanan aplikasi (`user-app/src/services/api.ts` dan `courier-app/src/services/api.ts`):
```typescript
const BASE_URL = Platform.OS === 'web'
  ? 'http://localhost:3000/api'
  : 'http://192.168.1.X:3000/api'; // Ganti '192.168.1.X' dengan IPv4 komputer Anda
```

### Akun Demo Uji Coba

| Peran | Email | Kata Sandi |
|------|-------|----------|
| User | `satrio@email.com` | `123456` |
| User | `budi@email.com` | `123456` |
| Kurir| `andi@kurir.com` | `123456` |
| Kurir| `bima@kurir.com` | `123456` |

---

## 👥 Tentang Proyek & Lisensi
Proyek **Eco-Donation Assistant** ini dikembangkan sebagai tugas akhir dan eksplorasi terpadu pada mata kuliah **Pemrograman Mobile** Semester 6.  
Mengedepankan *clean architecture*, penggunaan teknologi mandiri bebas biaya (*open-source MapLibre & Photon API*), serta interaktivitas *real-time WebSocket*.
