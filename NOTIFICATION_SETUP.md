# 🔔 Eco-Donation Real-Time Notification System - Setup Guide

## 📋 Implementasi Selesai (Tasks 1-6)

Sistem notifikasi real-time dan guided prompts telah sepenuhnya diimplementasikan dengan WebSocket, tanpa Firebase.

---

## 🚀 Setup & Installation

### Backend Setup

1. **Install Dependencies**
   ```bash
   cd backend-api
   npm install
   ```
   - `socket.io` sudah ditambahkan ke package.json

2. **Database Migration**
   - Database schema sudah di-update secara otomatis saat app start:
     - `pickup_orders` table: +3 columns (latitude, longitude, last_location_update)
     - `notifications` table: baru (id, user_id, order_id, type, title, message, read, created_at)

3. **Start Backend**
   ```bash
   npm start
   ```
   - Server berjalan di `http://localhost:3000`
   - Socket.io listening di port yang sama

### User App Setup

1. **Install Dependencies**
   ```bash
   cd user-app
   npm install
   ```
   - `socket.io-client` sudah ditambahkan

2. **Configure Backend URL** (jika diperlukan)
   - Edit `src/services/api.ts` untuk ubah backend URL jika testing di physical device
   - Default: `localhost:3000` (web), `10.0.2.2:3000` (Android Emulator)

3. **Start User App**
   ```bash
   npm start
   # atau
   npx expo start --web
   ```

### Courier App Setup

1. **Install Dependencies**
   ```bash
   cd courier-app
   npm install
   ```
   - `socket.io-client` dan `expo-location` sudah ditambahkan

2. **Request Permissions**
   - App akan request location permission saat courier menerima task

3. **Start Courier App**
   ```bash
   npm start
   # atau
   npx expo start --web
   ```

---

## 📊 Notification Types

| Type | Trigger | User Receives | Icon |
|------|---------|--------|------|
| `order_confirmed` | User confirm setor | ✅ Permintaan diterima | ✓ |
| `courier_accepted` | Courier accept task | ✅ Kurir terima pesanan | ✓ |
| `courier_near` | Distance < 500m | ✅ Kurir dekat (ETA) | 📍 |
| `courier_arrived` | Distance < 100m | ✅ Kurir sampai | ⚠️ |
| `ready_to_scan` | Courier weigh items | ✅ Siap scan QR | 📱 |

---

## 🧪 Testing Flow (Manual)

### Prerequisites
- Backend running
- User App running (2 instances atau 1 browser + 1 emulator)
- Courier App running
- Database populated dengan demo data (`npm run seed`)

### Test Steps

**Step 1: User Confirm Setor**
1. Login user-app dengan `satrio@email.com` / `123456`
2. Go to home tab → "Setor Sampah"
3. Input kategori, berat, alamat
4. Click "Konfirmasi Penjemputan"

**Expected:**
- ✅ Notification banner muncul: "Permintaan diterima!"
- ✅ Status di riwayat → "Menunggu Kurir"
- ✅ Notification tersimpan di history (Riwayat > Notifikasi)

---

**Step 2: Courier Accept & Start Tracking**
1. Login courier-app dengan `andi@kurir.com` / `123456`
2. Go to dashboard → lihat task list
3. Click task yang dibuat user sebelumnya
4. Click "Terima & Menuju Lokasi"

**Expected:**
- ✅ Location tracking started (indicator: "Melacak lokasi...")
- ✅ User notified: "Kurir [Andi] telah menerima pesanan"
- ✅ User riwayat status berubah → "Kurir Menuju"

---

**Step 3: Simulate Location Updates**
1. Courier app terus tracking lokasi (30 sec interval)
2. Backend menerima location updates via POST /pickups/:id/location

**Expected (di User App):**
- ✅ Saat distance < 500m: "Kurir tiba dalam ~X menit"
- ✅ Saat distance < 100m: "Kurir sudah sampai!"

*Note: Distance calculation saat ini placeholder (random). Untuk production, implementasikan proper haversine formula dengan real alamat coordinates.*

---

**Step 4: Courier Generate QR**
1. Input berat aktual untuk setiap item di courier app
2. Click "Generate QR Verifikasi"

**Expected:**
- ✅ QR code muncul di courier app
- ✅ User notified: "Kurir telah menimbang barang. Pindai QR..."
- ✅ User riwayat → prominent "🔥 PINDAI QR SEKARANG" button muncul

---

**Step 5: User Scan QR**
1. User app: riwayat → lihat order dengan status "Siap Verifikasi"
2. Click "SCAN QR SEKARANG" button
3. Scan QR dari courier app screen
4. (atau manual paste token jika camera tidak bekerja)

**Expected:**
- ✅ POST /pickups/:id/verify succeeds
- ✅ Order status → "completed"
- ✅ User notified: "Selesai! +XXXX Poin diterima"
- ✅ Points added to user balance
- ✅ Notification history persists

---

## 📱 Notification History

**Location:** User App → Riwayat tab → "Notifikasi" tab

**Features:**
- Menampilkan 20 notifikasi terbaru
- Sorted by timestamp (newest first)
- Icon + title + message + time
- Persisted di AsyncStorage (across app restarts)
- Tap notification (future feature) untuk navigate ke order detail

---

## 🔧 Backend Architecture

### Socket.io Flow

```
┌─────────────────┐
│   User App      │
├─────────────────┤
│ socket.emit     │
│ ('register_     │
│  user', userId) │
└────────┬────────┘
         │
         │ WS Connection
         ▼
┌─────────────────────────────────────┐
│   Backend (index.js)                │
├─────────────────────────────────────┤
│ io.on('connection', (socket) => {   │
│   socket.on('register_user', id) {  │
│     notificationService             │
│     .registerUserSocket(id, socket) │
│   }                                 │
│ }                                   │
└────────┬────────────────────────────┘
         │
         │ emit('notification', data)
         ▼
┌─────────────────────────────────────┐
│   User App (notification listener)  │
├─────────────────────────────────────┤
│ socket.on('notification', (data) => │
│   addNotification(data)             │
│   show banner (5 sec)               │
│ }                                   │
└─────────────────────────────────────┘
```

### NotificationService Methods

- `emitOrderConfirmed(orderId, userId, address)` - saat user confirm
- `emitCourierAccepted(orderId, userId, courierName)` - saat courier accept
- `emitCourierNear(orderId, userId, distance)` - saat distance < 500m
- `emitCourierArrived(orderId, userId)` - saat distance < 100m
- `emitReadyToScan(orderId, userId)` - saat QR generated

Semua events:
- ✅ Logged ke database (`notifications` table)
- ✅ Emitted via socket ke user (real-time)
- ✅ Include timestamp + metadata

---

## 🎯 Key Features Implemented

✅ **Real-Time Notifications**
- WebSocket bidirectional communication
- User-specific targeting (registered socket)
- Multiple event types with custom payloads

✅ **Notification Persistence**
- AsyncStorage: 20 last notifications
- Database: Full history for analytics
- Survives app restart

✅ **Guided Prompts**
- Auto-show "SCAN QR SEKARANG" button when ready
- Status-based conditional rendering
- One-click navigation to scan page

✅ **Location Tracking**
- Background location updates (courier)
- Distance calculation (placeholder)
- Auto-trigger near/arrived notifications

✅ **Animated UI**
- Notification banner with slide animation
- Auto-dismiss after 5 seconds
- Tap-to-dismiss option
- Status badge colors

---

## ⚠️ Known Limitations & Future Improvements

### Phase 1 (Current)

❌ Distance Calculation
- Currently: Random placeholder (0-3000m)
- TODO: Implement proper haversine formula with real address coordinates

❌ Background Location (iOS)
- Requires background mode permissions
- Configure in app.json for production

❌ Push Notifications
- Currently: In-app toast only
- TODO: Add native push (Firebase FCM alternative)

❌ ETA Calculation
- Currently: Simple distance / speed estimate
- TODO: Use real maps API (Google Maps, Mapbox) untuk accurate ETA

### Phase 2 (Future)

- Map widget with live courier tracking
- Real-time distance/ETA display
- Delivery route optimization
- Courier geofencing (auto-status update)
- Notification preferences (mute, sound, vibration)
- Analytics dashboard

---

## 🐛 Troubleshooting

### Notification Not Received

**Check:**
1. Backend running: `npm start` di backend-api
2. Socket connection: Check browser console for "Socket connected" log
3. User logged in: useNotifications hook only works if user exists
4. Firewall: Port 3000 accessible between client & server

**Debug:**
```bash
# Terminal backend-api
# Harusnya terlihat:
# "User 1 registered with socket abc123"
# "User disconnected: abc123"
```

---

### Location Not Updating (Courier)

**Check:**
1. Location permission granted: App request saat click "Terima & Menuju"
2. Task status = "on_the_way": Prerequisite untuk start tracking
3. Background location: Enabled in device settings

**Debug:**
```bash
# Courier app console should show:
# "Location update: lat/lng"
# POST /pickups/:id/location sent every 30 sec
```

---

### Scan QR Not Working

**Fallback:**
- Copy QR payload dari courier app console
- Paste ke token input field di user app scan page
- Manual verification still works

---

## 📝 Database Schema Changes

### pickup_orders (added columns)
```sql
ALTER TABLE pickup_orders ADD COLUMN latitude REAL;
ALTER TABLE pickup_orders ADD COLUMN longitude REAL;
ALTER TABLE pickup_orders ADD COLUMN last_location_update DATETIME;
```

### notifications (new table)
```sql
CREATE TABLE notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  order_id INTEGER,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (order_id) REFERENCES pickup_orders(id)
);
```

---

## 🎓 Next Steps

Untuk Task 7-8 (Integration Testing & E2E):

1. **Test dengan multiple users simultaneously** - Verify socket targeting correct users
2. **Test network failures** - Check reconnection logic works
3. **Test location accuracy** - Verify distance-based triggers
4. **Load testing** - Multiple concurrent pickups
5. **Performance profiling** - Socket message frequency impact

---

**Status:** ✅ 6/8 Tasks Completed - Ready for Testing!
