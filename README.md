# 🌿 Eco-Donation Assistant

**Platform mobile berbasis React Native yang mengintegrasikan manajemen sampah daur ulang dengan sistem donasi sosial.**

Eco-Donation Assistant memfasilitasi pengguna untuk menyetorkan sampah daur ulang yang dikonversi menjadi **Poin Donasi**, kemudian disalurkan ke kampanye sosial, panti asuhan, dan inisiatif kemanusiaan lainnya. Sistem ini dirancang dengan mekanisme verifikasi on-site untuk memastikan transparansi dan mencegah fraud.

![Expo](https://img.shields.io/badge/Expo-SDK_54-000020?logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native-0.81-61DAFB?logo=react&logoColor=white)
![Express](https://img.shields.io/badge/Express-5.x-000000?logo=express&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-4.x-010101?logo=socket.io&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand-State_Management-764ABC)

---

## 📋 Deskripsi Sistem

Eco-Donation Assistant terdiri dari **3 komponen** yang saling terintegrasi:

| Komponen | Teknologi | Deskripsi |
|----------|-----------|-----------|
| `user-app` | Expo (React Native) | Aplikasi pengguna untuk setor sampah, donasi, dan tracking |
| `courier-app` | Expo (React Native) | Aplikasi kurir untuk penjemputan dan verifikasi berat |
| `backend-api` | Express + SQLite | REST API sebagai pusat data dan logika bisnis |

---

## ✨ Fitur Utama

### 👤 User App
- **Sistem Poin Daur Ulang**: Konversi sampah menjadi poin dengan rate transparan per kategori
- **Maps & Geocoding**: Pencarian lokasi dengan autocomplete + peta interaktif (MapLibre + OpenFreeMap)
- **Verifikasi On-Site**: Token-based verification untuk mencegah fraud
- **Katalog Kampanye**: Jelajahi dan donasikan poin ke berbagai kampanye sosial
- **Real-time Notifications**: Update status penjemputan dan poin masuk secara langsung
- **Impact Portfolio**: Visualisasi dampak lingkungan dari kontribusi daur ulang
- **Leaderboard & Gamifikasi**: Sistem peringkat dan koleksi lencana pencapaian
- **Riwayat Transaksi**: Tracking lengkap mutasi poin dan donasi
- **Profile Management**: Pengaturan akun dan pusat bantuan terintegrasi

### 🚚 Courier App
- **Task Management**: Dashboard tugas penjemputan real-time
- **Weighing System**: Input berat aktual dengan timbangan digital on-site
- **Token Generator**: Generate verification token untuk user
- **Status Tracking**: Update status penjemputan secara bertahap

### 🔐 Security & Transparency
- Token verification dengan expiry 30 menit
- Perhitungan poin berdasarkan berat aktual, bukan estimasi
- Audit trail lengkap untuk setiap transaksi
- Separated concerns antara user dan courier apps

---

## 🏗️ Arsitektur

```
┌─────────────┐     HTTP/REST     ┌──────────────┐     HTTP/REST     ┌──────────────┐
│  User App   │ ◄──────────────► │  Backend API  │ ◄──────────────► │ Courier App  │
│  (Expo Go)  │                   │  (Express)    │                   │  (Expo Web)  │
└─────────────┘                   └──────┬───────┘                   └──────────────┘
                                         │
                                   ┌─────┴─────┐
                                   │  SQLite   │
                                   │  Database │
                                   └───────────┘
```

---

## 🔄 Alur Kerja Sistem

```
1. SETOR SAMPAH          2. PENJEMPUTAN           3. VERIFIKASI            4. DONASI
┌──────────────┐      ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│ User memilih │      │ Kurir terima │      │ Kurir timbang│      │ User pilih   │
│ kategori &   │─────►│ tugas &      │─────►│ & generate   │─────►│ kampanye &   │
│ input berat  │      │ menuju lokasi│      │ token        │      │ salurkan poin│
└──────────────┘      └──────────────┘      └──────┬───────┘      └──────────────┘
                                                    │
                                              ┌─────┴─────┐
                                              │ User scan │
                                              │ token →   │
                                              │ Poin cair │
                                              └───────────┘
```

---

## 🚀 Instalasi & Menjalankan

### Prasyarat

- Node.js ≥ 18
- npm
- Expo Go (di smartphone) atau browser untuk web

### 1. Clone Repository

```bash
git clone <repository-url>
cd eco-donation-assistant
```

### 2. Backend API

```bash
cd backend-api
npm install
npm run seed    # Inisialisasi database dengan data demo
npm start       # Server berjalan di http://localhost:3000
```

### 3. User App

```bash
cd user-app
npm install
npx expo start
```

Scan QR code dengan Expo Go (smartphone) atau tekan `w` untuk web.

### 4. Courier App

```bash
cd courier-app
npm install
npx expo start --port 8082
```

Tekan `w` untuk membuka di browser (recommended untuk testing).

---

## ⚙️ Konfigurasi Jaringan

Jika menjalankan User App di **smartphone fisik** via Expo Go, pastikan:

1. Smartphone dan laptop terhubung ke **WiFi yang sama**
2. Edit `user-app/services/api.ts` — ganti IP dengan IP laptop:

```typescript
const BASE_URL = Platform.OS === 'web'
  ? 'http://localhost:3000/api'
  : 'http://<IP_LAPTOP>:3000/api';  // contoh: 192.168.1.6
```

Cek IP laptop: `ipconfig` (Windows) atau `ifconfig` (Mac/Linux).

---

## 🗺️ Maps & Geocoding

Sistem peta dan geocoding Eco-Donation menggunakan teknologi **100% gratis** tanpa API key:

### **Komponen:**
- **MapLibre Native**: Open-source renderer untuk vector tiles
- **OpenFreeMap**: Free tile server dengan unlimited usage
- **Photon API**: Free geocoding & autocomplete dari Komoot

### **Setup:**
Tidak ada konfigurasi tambahan! Maps dan search address bekerja **out-of-the-box**.

### **Fitur:**
✅ Search autocomplete lokasi (min 3 karakter)
✅ Reverse geocoding untuk display alamat real-time
✅ Button "Gunakan Lokasi Saya" dengan GPS
✅ Draggable map dengan center marker precision
✅ Loading states & offline error handling

### **Fair Use Policy:**
- Photon API: Max 1 request/second (auto-handled dengan debounce 300ms)
- OpenFreeMap: Unlimited, dioptimalkan untuk mobile usage

### **Troubleshooting:**
- **Layar hitam?** Pastikan koneksi internet aktif, MapLibre butuh download tiles
- **Search tidak muncul?** Ketik minimal 3 karakter untuk trigger autocomplete
- **Koordinat tidak akurat?** Drag map dan tunggu hingga marker center stabil

---

## 🔐 Akun Demo

| Role | Email | Password |
|------|-------|----------|
| User | `satrio@email.com` | `123456` |
| User | `budi@email.com` | `123456` |
| Courier | `andi@kurir.com` | `123456` |
| Courier | `bima@kurir.com` | `123456` |

---

## 📁 Struktur Proyek

```
├── backend-api/
│   ├── index.js              # Entry point server
│   ├── db.js                 # Database schema & initialization
│   ├── seed.js               # Script populate data demo
│   ├── package.json
│   └── routes/
│       ├── auth.js           # Login & Register
│       ├── users.js          # Profile, transactions, leaderboard
│       ├── pickups.js        # Pickup orders & QR verification
│       ├── campaigns.js      # Katalog donasi
│       └── donations.js      # Proses donasi
│
├── user-app/
│   ├── app/
│   │   ├── (auth)/           # Login & Register screens
│   │   ├── (tabs)/           # Tab navigation (Home, Katalog, Riwayat, Profil)
│   │   ├── setor/            # Halaman setor sampah
│   │   ├── donasi/           # Detail kampanye donasi
│   │   ├── scan/             # Scan QR verifikasi
│   │   ├── settings/         # Pengaturan akun
│   │   └── faq/              # Pusat bantuan
│   ├── store/                # Zustand state management
│   └── services/             # API service layer
│
├── courier-app/
│   ├── app/
│   │   ├── (tabs)/           # Dashboard & Profile
│   │   └── task/             # Detail tugas & input berat
│   ├── store/                # Zustand state management
│   └── services/             # API service layer
│
└── .gitignore
```

---

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/api/auth/login` | Login user |
| POST | `/api/auth/register` | Register user baru |
| POST | `/api/auth/courier/login` | Login courier |

### Users
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/users/:id` | Profil & saldo user |
| PUT | `/api/users/:id` | Update profil user |
| GET | `/api/users/:id/transactions` | Riwayat mutasi poin |
| GET | `/api/users/:id/leaderboard` | Papan peringkat |
| GET | `/api/users/:id/distribution` | Distribusi kategori sampah |

### Pickup Orders
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/api/pickups` | Buat order penjemputan |
| GET | `/api/pickups?user_id=X` | List orders by user |
| GET | `/api/pickups/:id` | Detail order |
| PATCH | `/api/pickups/:id/status` | Update status order |
| POST | `/api/pickups/:id/weigh` | Kurir submit berat aktual → generate token |
| GET | `/api/pickups/:id/qr` | Get QR/token data |
| POST | `/api/pickups/:id/verify` | User verifikasi token |
| GET | `/api/pickups/courier/:id/tasks` | Tugas untuk kurir |

### Campaigns & Donations
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/campaigns` | List kampanye (filter: category, search) |
| GET | `/api/campaigns/:id` | Detail kampanye |
| POST | `/api/donations` | Salurkan poin ke kampanye |

---

## 💰 Sistem Poin

| Kategori Sampah | Rate per Kg |
|-----------------|-------------|
| Botol Plastik | 800 poin |
| Kertas | 600 poin |
| Kaleng | 1.000 poin |
| Botol Kaca | 500 poin |

**Konversi:** 1 Poin = Rp 1

**Impact:** 1 Kg sampah = 1.5 Kg pengurangan CO₂

---

## 🛡️ Sistem Anti-Fraud

Verifikasi dilakukan secara **on-site** untuk mencegah kecurangan berat:

1. Kurir menimbang sampah dengan timbangan digital di lokasi pengguna
2. Kurir memasukkan berat aktual di Courier App
3. Sistem generate **verification token** (berlaku 30 menit)
4. Pengguna memasukkan token di User App sebagai "tanda tangan digital"
5. Poin dihitung berdasarkan **berat aktual**, bukan estimasi

---

## 🧪 Testing Flow End-to-End

1. **User App** — Login → Setor Sampah → Pilih kategori & berat → Konfirmasi
2. **Courier App** — Login → Terima tugas → Input berat aktual → Generate token
3. **User App** — Buka Scan QR → Paste token dari kurir → Verifikasi → Poin masuk
4. **User App** — Katalog → Pilih kampanye → Donasi → Saldo berkurang

---

## 🛠️ Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Mobile Framework | Expo SDK 54 / React Native 0.81 |
| Routing | expo-router (file-based) |
| State Management | Zustand + persist (AsyncStorage) |
| Maps & Tiles | MapLibre Native + OpenFreeMap (free, no API key) |
| Geocoding | Photon API by Komoot (free, no API key) |
| Location Services | expo-location |
| Backend | Express 5 |
| Database | SQLite3 |
| Real-time Communication | Socket.io 4.x |
| UI Components | React Native core + Ionicons |
| Gradient | expo-linear-gradient |

---

## 👥 Tim Pengembang

Proyek ini dikembangkan sebagai tugas mata kuliah **Pemrograman Mobile** Semester 6.

---

## 📝 Changelog

### v1.3.0 (Juni 2026) - Latest
- 🗺️ **Major: Implementasi Maps Module dengan MapLibre Native**
  - Fix layar hitam Android dengan migrasi dari react-native-maps ke MapLibre
  - Integrasi OpenFreeMap (free vector tiles, no API key required)
  - Tambah fitur search autocomplete lokasi dengan Photon Geocoding API
  - Tambah reverse geocoding untuk display alamat real-time
  - Tambah button "Gunakan Lokasi Saya" dengan expo-location
  - Draggable map dengan center marker untuk precision lokasi
  - Loading states dan error handling untuk koneksi internet
- 🎯 UX Improvement: Koordinat dan alamat ditampilkan real-time saat drag map
- 🚀 Performance: Vector tiles lebih smooth daripada raster tiles

### v1.2.0 (Juni 2026)
- ✨ Implementasi sistem notifikasi real-time dengan Socket.io
- 🎨 Perbaikan konsistensi UI: migrasi simbol Rupiah (Rp) ke Poin
- 🏆 Penambahan modal interaktif untuk detail lencana dan progress pencapaian
- ⚙️ Aktivasi modul Pengaturan Akun dengan sinkronisasi API `PUT /users`
- 📚 Integrasi Pusat Bantuan (FAQ) ke navigasi profil
- 🐛 Fix: Responsivitas Bottom Navigation Bar dan Input Box
- 🐛 Fix: Clipping issues pada berbagai ukuran layar perangkat

### v1.1.0
- 🚀 Implementasi sistem verifikasi token on-site
- 📊 Penambahan Impact Portfolio dan distribusi kategori sampah
- 🎮 Sistem gamifikasi: Leaderboard dan Badges
- 🔐 Mekanisme anti-fraud dengan verifikasi kurir

### v1.0.0
- 🎉 Rilis awal sistem Eco-Donation Assistant
- 📱 User App dan Courier App terpisah
- 🌐 REST API backend dengan SQLite
- ♻️ Sistem konversi sampah ke poin dasar

---

## 📄 Lisensi

Proyek ini dibuat untuk keperluan akademik.

---

## 📊 Hasil Analisis Sistem & Rekomendasi (Update Terbaru)

Berdasarkan analisis menyeluruh terhadap arsitektur, basis kode, dan alur kerja sistem Eco-Donation, berikut adalah evaluasi sistem:

### ✅ Kekuatan Sistem Saat Ini
1. **Arsitektur Terpisah & Terfokus**: Pemisahan `user-app` (untuk pengguna umum) dan `courier-app` (untuk mitra penjemput) adalah praktik yang sangat baik (*Separation of Concerns*). Ini menjaga setiap aplikasi tetap ringan dan sesuai spesifikasinya.
2. **Keamanan Transaksi (*Anti-Fraud*)**: Metode verifikasi fisik di mana kurir menghasilkan token dan pengguna menginputkannya untuk mendapatkan poin adalah solusi yang tangguh guna mencegah klaim fiktif.
3. **Penerapan *Real-Time***: Penggunaan `socket.io` di *frontend* memungkinkan pembaruan notifikasi poin secara *real-time* tanpa keharusan pengguna me-*refresh* aplikasi.
4. **Gamifikasi (*Engagement*)**: Integrasi fitur Papan Peringkat (Leaderboard), *Impact Portfolio*, dan koleksi Lencana (Badges) memberikan insentif psikologis yang bagus agar pengguna terus berpartisipasi dalam daur ulang.

### 🚀 Peningkatan & *Bug Fixes* yang Telah Diterapkan
- **Sinkronisasi Sistem Poin (UX)**: Mengubah komponen UI pada halaman Kampanye dan Profil yang sebelumnya menggunakan simbol Rupiah (Rp) menjadi Poin, memastikan konsistensi logika ekonomi aplikasi bahwa pengguna menyumbang menggunakan Poin Daur Ulang.
- **Interaksi *Progress* Pencapaian**: Penambahan antarmuka *Modal* interaktif pada menu Profil, memungkinkan pengguna melihat detail, syarat, dan persentase progres menuju penyelesaian lencana.
- **Navigasi & Ekstensibilitas Profil**: Mengaktifkan modul Pengaturan Akun dan Pusat Bantuan yang sebelumnya tidak bisa diakses, dan mengintegrasikan sinkronisasi API `PUT /users` dengan *store* Zustand lokal.
- **Responsivitas Antarmuka**: Memperbaiki isu tampilan terpotong (*clipping*) pada *Bottom Navigation Bar* dan *Input Box* agar sesuai dengan standar antarmuka responsif di berbagai perangkat.

### 💡 Rekomendasi Pengembangan Lanjutan (*Future Work*)
1. **Peningkatan Keamanan *Backend***: Query autentikasi saat ini terlihat menggunakan logika pemeriksaan *plaintext*. Sangat disarankan untuk segera mengimplementasikan *password hashing* (misal menggunakan *bcrypt*) pada `backend-api` sebelum rilis ke tahap produksi.
2. **Penanganan *Error* & Layanan *Offline***: Tambahkan kemampuan penyimpanan data sementara (*caching/offline support*) lebih lanjut di aplikasi *mobile* agar data fundamental (seperti Riwayat dan FAQ) tetap dapat diakses meski koneksi internet tidak stabil.
3. **Validasi Input API**: Terapkan *library* validasi tambahan (seperti `Joi` atau `Zod`) di *middleware* Express.js untuk memastikan setiap data permintaan (*request payload*) tidak menyebabkan anomali pada SQLite.
