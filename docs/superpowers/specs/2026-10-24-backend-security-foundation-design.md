# Sub-proyek 1 — Keamanan & Fondasi Backend

Tanggal: 2026-10-24
Status: Disetujui (desain) — menunggu review spec

## Konteks

Eco-Donation V2 terdiri dari `backend-api` (Express + SQLite), `user-app` dan `courier-app` (Expo SDK 56). Analisis awal menemukan:

- Tidak ada otorisasi: identitas diambil dari `req.body.user_id`/query, role tidak dicek (IDOR, donasi atas nama orang lain).
- Anti-fraud QR bisa dibypass: kurir dapat mengambil token via `GET /pickups/:id/qr` lalu `POST /verify` sendiri.
- Password SHA-256 tanpa salt; `JWT_SECRET` fallback hardcoded; socket `register_user` tanpa autentikasi.
- Operasi multi-langkah (donasi, verify) tanpa transaksi DB; callback bertingkat.
- Donasi ke kampanye Every.org tidak tersimpan di server (progres di AsyncStorage).
- URL backend di-hardcode berbeda di kedua app.

Ini adalah sub-proyek 1 dari 4 (1 Keamanan & fondasi → 2 Design system & UI/UX → 3 Fitur → 4 Cleanup & docs).

## Tujuan

1. Semua endpoint terautentikasi, berbasis role, dan memeriksa kepemilikan sumber daya.
2. Alur verifikasi anti-fraud yang benar: **kurir menampilkan QR, user memindai dan menyetujui**.
3. Operasi uang/poin atomik.
4. Backend terstruktur, tervalidasi, dan teruji otomatis.
5. Kedua app tetap berfungsi penuh dengan kontrak API baru (UI lama dipertahankan; perombakan visual di sub-proyek 2).

## Non-tujuan

- Perombakan UI/design system (sub-proyek 2).
- Live tracking, badge server-side, edit profil UI, katalog gabungan, notifikasi kurir di UI (sub-proyek 3). Endpoint pendukung yang kecil boleh disiapkan di sini bila disebut eksplisit di bawah.
- Mengganti SQLite/Express. Aplikasi harus tetap jalan di **Expo Go**.

## Keputusan

| Topik | Keputusan |
|---|---|
| Driver DB | `better-sqlite3` (sinkron, `db.transaction`) |
| Hash password | `bcryptjs` (cost 10) |
| Validasi | `zod` |
| Keamanan HTTP | `helmet`, `express-rate-limit` |
| Test | `jest` + `supertest`, DB `:memory:` |
| Arah QR | Kurir menampilkan, user memindai → layar konfirmasi → Setujui/Tolak |
| Kode verifikasi | 6 karakter dari alfabet `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, disimpan sebagai hash SHA-256, TTL 30 menit (env `TOKEN_TTL_MIN`), maks 5 percobaan salah |
| Minimal donasi | 1.000 poin, bilangan bulat |

## Arsitektur

```
backend-api/
  index.js                 ← createServer + listen
  seed.js
  .env.example
  src/
    app.js                 ← createApp({ db, notifier }) → express app (dipakai test)
    server.js              ← createServer(): http + socket.io + app
    config/env.js          ← PORT, JWT_SECRET, TOKEN_TTL_MIN, DB_PATH, NODE_ENV
    config/rates.js        ← RATES per kategori, CO2_PER_KG = 1.5, POINT_TO_RUPIAH = 1
    db/index.js            ← openDb(path): better-sqlite3, PRAGMA foreign_keys=ON, journal_mode=WAL
    db/schema.js           ← migrate(db): schema_version + migrasi berurutan
    middleware/auth.js     ← authenticate, requireRole(...roles)
    middleware/validate.js ← validate({ body, query, params }) dengan zod
    middleware/error.js    ← HttpError, notFound, errorHandler
    services/authService.js
    services/userService.js
    services/pickupService.js
    services/donationService.js
    services/campaignService.js
    services/notificationService.js
    routes/{auth,users,pickups,courier,campaigns,donations,notifications,config}.js
    socket.js              ← autentikasi JWT handshake + room
    utils/code.js          ← generateCode(), hashCode()
  tests/
```

Routes tipis: validasi → panggil service → `res.json`. Service menerima `db` dan `notifier` (dependency injection) sehingga dapat diuji tanpa HTTP. Service melempar `HttpError(status, code, message)`.

### Konfigurasi

- `JWT_SECRET` wajib bila `NODE_ENV=production` (server gagal start bila kosong). Di development, bila kosong, gunakan secret acak per proses dan tampilkan peringatan.
- `.env` dibaca dengan `dotenv`. `.env.example` di-commit.

## Skema database

Perubahan terhadap skema lama (seed menghapus DB, sehingga migrasi cukup membuat skema versi 1 baru):

- `users`, `couriers`: tetap; `password` berisi hash bcrypt.
- `pickup_orders`:
  - `status` ∈ `waiting | on_the_way | arrived | pending_verification | completed | cancelled` (CHECK constraint)
  - `pickup_lat REAL`, `pickup_lng REAL` (menggantikan `pickup_location` JSON)
  - `verification_code_hash TEXT`, `code_expires_at TEXT`, `code_attempts INTEGER DEFAULT 0`
  - hapus `verification_token`, `short_token`, `token_expires_at`
  - `accepted_at`, `arrived_at`, `weighed_at`, `completed_at`, `cancelled_at`, `cancelled_by TEXT`
- `pickup_items`: tetap; `estimated_weight > 0`.
- `campaigns`: tambah `source TEXT NOT NULL DEFAULT 'local' CHECK(source IN ('local','everyorg'))`, `external_id TEXT`, UNIQUE(`source`,`external_id`); `target_amount` boleh NULL untuk eksternal.
- `donations`: tetap (FK ke `campaigns.id` lokal, termasuk baris hasil upsert eksternal).
- `transactions`: tambah `ref_type`, `ref_id` (mis. `pickup`/12, `donation`/5).
- `notifications`: tambah `recipient_role TEXT NOT NULL DEFAULT 'user'`, `recipient_id INTEGER NOT NULL` (menggantikan `user_id`), `data TEXT` (JSON).
- `badges`: tetap (diisi di sub-proyek 3).
- Indeks: `pickup_orders(user_id)`, `pickup_orders(courier_id)`, `pickup_orders(status)`, `transactions(user_id, created_at)`, `notifications(recipient_role, recipient_id, is_read)`.

## Autentikasi & otorisasi

- JWT payload: `{ sub: number, role: 'user' | 'courier' }`, kedaluwarsa 7 hari.
- `authenticate` mengisi `req.auth = { id, role }`. Tidak ada endpoint yang membaca `user_id`/`courier_id` dari request untuk identitas.
- `requireRole(...)` → 403 `FORBIDDEN` bila role tidak cocok.
- Kepemilikan dicek di service; akses ditolak dengan **404** (bukan 403) untuk sumber daya milik orang lain agar tidak membocorkan keberadaan.

## Kontrak API

Semua path di bawah prefix `/api`. Format error:

```json
{ "error": { "code": "INSUFFICIENT_POINTS", "message": "Saldo poin tidak cukup." } }
```

Error validasi: `400 VALIDATION_ERROR` dengan `details` (array `{ path, message }`).

### Auth (publik, rate-limit 20 req / 15 menit / IP)

| Method | Path | Body | Respons |
|---|---|---|---|
| POST | `/auth/register` | `{ name, email, password(min 6), phone? }` | `201 { user, token }` |
| POST | `/auth/login` | `{ email, password }` | `{ user, token }` |
| POST | `/auth/courier/login` | `{ email, password }` | `{ courier, token }` |

Email dinormalisasi lowercase/trim. Email ganda → `409 EMAIL_TAKEN`. Kredensial salah → `401 INVALID_CREDENTIALS`.

### Users (role `user`)

| Method | Path | Keterangan |
|---|---|---|
| GET | `/users/me` | profil + statistik + badges |
| PATCH | `/users/me` | `{ name?, phone? }` (email tidak bisa diubah) |
| POST | `/users/me/password` | `{ current_password, new_password }` |
| GET | `/users/me/transactions?limit=20&offset=0` | limit maks 100 |
| GET | `/users/me/distribution` | berat per kategori dari order completed |
| GET | `/leaderboard?limit=10` | `{ entries: [{ rank, id, name, points }], me: { rank, points } }` (semua role terautentikasi; `me` null untuk kurir) |

### Kurir (role `courier`)

| Method | Path | Keterangan |
|---|---|---|
| GET | `/courier/me` | profil kurir + jumlah order selesai |
| GET | `/courier/tasks?scope=available\|mine` | `available` = `waiting` tanpa kurir; `mine` = milik kurir dan status ≠ completed/cancelled |

### Pickups

| Method | Path | Role | Aturan |
|---|---|---|---|
| POST | `/pickups` | user | `{ items: [{ category ∈ RATES, estimated_weight (0, 500] }] (1..4, kategori unik), pickup_address (1..300), pickup_lat [-90,90], pickup_lng [-180,180], scheduled_at ISO }`; `scheduled_at` tidak boleh di masa lalu (toleransi 5 menit). Emit `order:new` ke room `couriers`. → `201` order |
| GET | `/pickups?status=` | user | order milik user |
| GET | `/pickups/:id` | user/courier | pemilik, kurir yang ditugaskan, atau kurir mana pun bila status `waiting` tanpa kurir |
| POST | `/pickups/:id/accept` | courier | atomik: `WHERE status='waiting' AND courier_id IS NULL`; gagal → `409 ALREADY_TAKEN` |
| POST | `/pickups/:id/arrive` | courier (ditugaskan) | `on_the_way → arrived` |
| POST | `/pickups/:id/weigh` | courier (ditugaskan) | `{ items: [{ id, actual_weight (0, 500] }] }` harus mencakup semua item order. Dari `arrived` atau `pending_verification`. Set status `pending_verification`, buat kode baru, reset `code_attempts`. → `{ code, qr_payload, expires_at }` |
| POST | `/pickups/:id/code` | courier (ditugaskan) | status `pending_verification`; **selalu membuat kode baru** (kode lama tidak berlaku). → sama seperti weigh |
| GET | `/pickups/:id/verification` | user (pemilik) | status `pending_verification`; → `{ items: [{ category, estimated_weight, actual_weight, points }], total_points, total_kg, co2, expires_at }` — tanpa kode |
| POST | `/pickups/:id/approve` | user (pemilik) | `{ code }`; rate-limit 10 req / menit / user |
| POST | `/pickups/:id/reject` | user (pemilik) | `{ reason? }`; `pending_verification → arrived`, hapus kode |
| POST | `/pickups/:id/cancel` | user (pemilik, status `waiting`/`on_the_way`) atau courier (ditugaskan, status `on_the_way`/`arrived`) | `{ reason? }`; kurir yang membatalkan → order kembali `waiting` tanpa kurir; user → `cancelled` |

`qr_payload` = `ecodonation://verify?order=<id>&code=<CODE>`.

**Transisi status** (selain di atas → `409 INVALID_STATUS`):

```
waiting → on_the_way (accept) | cancelled (user cancel)
on_the_way → arrived (arrive) | cancelled (user cancel) | waiting (courier cancel)
arrived → pending_verification (weigh) | waiting (courier cancel)
pending_verification → completed (approve) | arrived (reject) | pending_verification (weigh ulang / code)
```

**Approve** (dalam satu `db.transaction`):

1. Ambil order; bukan milik user → 404; status ≠ `pending_verification` → `409 INVALID_STATUS`.
2. Kode kedaluwarsa → `410 CODE_EXPIRED`.
3. `hashCode(code.toUpperCase().trim()) !== verification_code_hash` → `code_attempts += 1`; bila mencapai 5, hapus kode dan respons `423 CODE_LOCKED` (kurir harus membuat kode baru via `/code`); selain itu `400 INVALID_CODE` dengan `remaining_attempts`. (Increment ini harus tersimpan — dilakukan di luar transaksi yang di-rollback.)
4. Hitung poin: `Σ round(actual_weight × RATES[category])`, `total_kg = Σ actual_weight`, `co2 = total_kg × CO2_PER_KG`.
5. `UPDATE pickup_orders SET status='completed', completed_at=now, verification_code_hash=NULL WHERE id=? AND status='pending_verification'` — `changes=0` → 409.
6. Update statistik user; insert `transactions` (`type='setor'`, `ref_type='pickup'`).
7. Setelah commit: emit `order:completed` ke user dan kurir. Hook `onPickupCompleted(userId)` (no-op, untuk badge di sub-proyek 3).

→ `{ points_earned, total_kg, co2, balance }`.

### Campaigns & donasi

| Method | Path | Role | Keterangan |
|---|---|---|---|
| GET | `/campaigns?category=&search=` | semua | hanya `source='local'` |
| GET | `/campaigns/:id` | semua | kampanye lokal |
| GET | `/campaigns/:id/stats` | semua | `{ collected_points, donor_count }` |
| GET | `/campaigns/external/everyorg/:externalId/stats` | semua | 0 bila belum ada baris |
| POST | `/donations` | user | lihat di bawah |

`POST /donations` body (zod discriminated union):

- `{ campaign_id: int, points: int ≥ 1000 }`, atau
- `{ source: 'everyorg', external_id (1..64), title (1..200), image_url? (url), points: int ≥ 1000 }`

Dalam satu transaksi: (eksternal → upsert ke `campaigns` berdasarkan `(source, external_id)`), `UPDATE users SET points = points - ? ... WHERE id=? AND points >= ?` (changes=0 → `400 INSUFFICIENT_POINTS`), update `collected_amount`, `donor_count` (+1 hanya jika donasi pertama user ke kampanye ini), insert `donations`, insert `transactions` (`type='donasi'`, poin negatif). Kampanye lokal tidak ditemukan → 404. → `201 { donation_id, balance }`.

### Notifikasi & config

| Method | Path | Keterangan |
|---|---|---|
| GET | `/notifications?limit=30` | milik penerima saat ini (role+id), terbaru dulu, `unread_count` |
| POST | `/notifications/read` | `{ ids?: int[] }` — kosong = tandai semua |
| GET | `/config/rates` | publik: `{ rates, co2_per_kg, point_to_rupiah, min_donation }` |
| GET | `/health` | publik |

## Socket.io

- Handshake: `io(url, { auth: { token } })`. Middleware memverifikasi JWT; gagal → `connect_error` "UNAUTHORIZED".
- Room: `user:{id}` atau `courier:{id}`; kurir juga join `couriers`.
- Event server → client (payload selalu `{ orderId, ...data, notification }` di mana `notification = { id, type, title, message, created_at }`):

| Event | Penerima | Pemicu |
|---|---|---|
| `order:new` | room `couriers` | user membuat order |
| `order:accepted` | user | accept |
| `order:arrived` | user | arrive |
| `order:weighed` | user | weigh (payload tanpa kode; user diarahkan ke layar scan) |
| `order:rejected` | kurir | reject |
| `order:cancelled` | pihak lain | cancel |
| `order:completed` | user & kurir | approve |
| `order:taken` | room `couriers` | accept (agar daftar available kurir lain diperbarui) |

Notifikasi untuk user/kurir tertentu disimpan di tabel `notifications`; broadcast `order:new`/`order:taken` tidak disimpan.

## Perubahan aplikasi (fungsional, UI lama dipertahankan)

### Bersama (kedua app)

- `src/config.ts`: `API_URL` dari `process.env.EXPO_PUBLIC_API_URL`; fallback `http://<host dari Constants.expoConfig.hostUri>:3000`; web → `http://localhost:3000`. `.env.example` per app.
- `api.ts` memakai `API_URL + '/api'`; helper `getErrorMessage(err)` membaca `error.message` format baru.
- `socketService.ts`: koneksi tunggal dengan `auth: { token }`, `connect(token)`/`disconnect()`/`on(event, cb)` yang mengembalikan fungsi unsubscribe. Diinisialisasi sekali di root layout ketika token ada.
- Store auth menyimpan `{ user, token }`; data profil di-refresh dari `/users/me` atau `/courier/me`.

### user-app

- Semua pemanggilan diganti ke endpoint `/me` dan tanpa `user_id`.
- `setor.tsx`: kirim `pickup_lat/pickup_lng`, `scheduled_at` ISO; estimasi poin memakai `/config/rates`.
- **Layar baru `scan.tsx`**: `CameraView` (expo-camera, versi disesuaikan ke SDK 56) memindai `ecodonation://verify?...`; input manual 6 karakter sebagai alternatif. Setelah kode didapat → `GET /pickups/:id/verification` → layar konfirmasi rincian (item, berat, poin) → **Setujui** (`/approve`) atau **Tolak** (`/reject`).
- `pickup-detail.tsx`: tidak lagi menampilkan QR; saat status `pending_verification` tampil tombol "Pindai QR Kurir". Tombol batalkan untuk status `waiting`/`on_the_way`.
- Kampanye Every.org: donasi mengirim payload eksternal; progres komunitas dari endpoint stats (hapus AsyncStorage `@community_points_*`).
- `settings.tsx`: memakai `PATCH /users/me` (email read-only) dan `POST /users/me/password`.
- Profil: leaderboard dari `/leaderboard`.

### courier-app

- Tab tugas: dua bagian "Tersedia" (`scope=available`) dan "Tugas Saya" (`scope=mine`); refresh otomatis via socket `order:new`/`order:taken`/`order:cancelled`/`order:rejected` + `useFocusEffect`.
- `task/[id].tsx`: tombol berurutan sesuai status — Terima → Saya Sudah Tiba → Input Berat → tampilkan **QR + kode 6 karakter + hitung mundur**, tombol "Buat Kode Baru" (`/code`). Menunggu `order:completed` → modal sukses. Hapus scanner kamera dan input token.
- Penanganan 409 `ALREADY_TAKEN` dengan pesan yang jelas.

## Seed

- Password bcrypt; akun demo tetap (`satrio@email.com`, `budi@email.com`, `andi@kurir.com`, `bima@kurir.com`, sandi `123456`).
- Order contoh mencakup status `waiting`, `on_the_way`, `arrived`, dan `completed` (tanpa kode statis; kode dibuat saat weigh).
- Kampanye lokal tetap; tanggal deadline digeser ke masa depan relatif terhadap tanggal seed.

## Pengujian

Backend (`npm test`, Jest + supertest, `createApp` dengan DB `:memory:` dan notifier palsu yang merekam event):

1. Auth: register sukses/duplikat/validasi; login user/kurir; token kurir ditolak di endpoint user (403) dan sebaliknya; tanpa token → 401.
2. Otorisasi: user B mendapat 404 untuk order user A; kurir tidak dapat `approve`; kurir yang tidak ditugaskan tidak dapat `weigh`/`code`.
3. Accept bersamaan: dua kurir accept order yang sama → satu 200, satu 409.
4. Alur penuh: create → accept → arrive → weigh → verification → approve → poin, statistik, transaksi benar; event notifier terekam.
5. Kode: salah (400 + sisa percobaan), 5× salah → 423 dan `/code` membuat kode baru yang valid; kedaluwarsa → 410 (waktu dimock); `/code` membatalkan kode lama; approve dua kali → 409.
6. Reject → status `arrived`, weigh ulang berhasil.
7. Cancel: aturan role/status; kurir cancel → kembali `waiting`.
8. Donasi: lokal sukses; eksternal upsert (dua donasi → satu baris kampanye, `donor_count` benar); saldo kurang → 400 dan tidak ada perubahan apa pun (rollback); < 1000 → 400.
9. Validasi: koordinat di luar rentang, kategori tidak dikenal, berat ≤ 0, `scheduled_at` lampau.
10. Socket: koneksi tanpa token ditolak; dengan token bergabung ke room yang benar.

Aplikasi: `npx tsc --noEmit` lulus di kedua app; uji manual alur penuh (user setor → kurir terima/tiba/timbang → user scan & setujui → poin bertambah → donasi ke kampanye Every.org → stats bertambah).

## Kriteria selesai

- Semua test backend lulus; `tsc --noEmit` lulus di kedua app.
- Tidak ada endpoint yang menerima identitas dari body/query.
- Alur manual end-to-end berjalan di Expo Go (atau web) dengan backend lokal.
- README bagian instalasi diperbarui minimal untuk `.env` dan `npm test` (pembaruan README menyeluruh di sub-proyek 4).
