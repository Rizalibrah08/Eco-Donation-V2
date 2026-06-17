# 🌿 Eco-Donation Assistant

Platform mobile yang memfasilitasi pengguna untuk menyetorkan sampah daur ulang dan mengonversinya menjadi **Poin Donasi** yang dapat disalurkan ke kampanye sosial dan panti asuhan.

![Expo](https://img.shields.io/badge/Expo-SDK_54-000020?logo=expo)
![React Native](https://img.shields.io/badge/React_Native-0.81-61DAFB?logo=react)
![Express](https://img.shields.io/badge/Express-5.x-000000?logo=express)
![SQLite](https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite)

---

## 📋 Deskripsi Sistem

Eco-Donation Assistant terdiri dari **3 komponen** yang saling terintegrasi:

| Komponen | Teknologi | Deskripsi |
|----------|-----------|-----------|
| `user-app` | Expo (React Native) | Aplikasi pengguna untuk setor sampah, donasi, dan tracking |
| `courier-app` | Expo (React Native) | Aplikasi kurir untuk penjemputan dan verifikasi berat |
| `backend-api` | Express + SQLite | REST API sebagai pusat data dan logika bisnis |

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
| Backend | Express 5 |
| Database | SQLite3 |
| UI Components | React Native core + Ionicons |
| Gradient | expo-linear-gradient |

---

## 👥 Tim Pengembang

Proyek ini dikembangkan sebagai tugas mata kuliah **Pemrograman Mobile** Semester 6.

---

## 📄 Lisensi

Proyek ini dibuat untuk keperluan akademik.
