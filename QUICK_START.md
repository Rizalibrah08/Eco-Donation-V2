# 🚀 Quick Start Guide - Maps Module Testing

## Prerequisites
- Node.js >= 18
- Expo Go app di smartphone
- Smartphone dan laptop di WiFi yang sama

## Step 1: Start Backend API

```bash
cd backend-api
npm start
```

Backend akan berjalan di `http://localhost:3000`

## Step 2: Configure Network (Smartphone Only)

Jika testing di smartphone fisik via Expo Go:

1. Cek IP laptop:
   ```bash
   # Windows
   ipconfig
   
   # Mac/Linux
   ifconfig
   ```

2. Edit `user-app/src/services/api.ts`:
   ```typescript
   const BASE_URL = Platform.OS === 'web'
     ? 'http://localhost:3000/api'
     : 'http://192.168.1.6:3000/api';  // <-- Ganti dengan IP laptop Anda
   ```

## Step 3: Start User App

```bash
cd user-app
npm start
```

Options:
- **Smartphone:** Scan QR code dengan Expo Go
- **Web Browser:** Tekan `w`

## Step 4: Test Maps Feature

### Login
- Email: `satrio@email.com`
- Password: `123456`

### Navigate to Setor Sampah
1. Tap tab "Home"
2. Tap card "Setor Sampah"

### Test Search Autocomplete 🔍
1. Lihat input "Cari Lokasi Penjemputan"
2. Ketik: **"UI Depok"** (minimal 3 karakter)
3. Wait 300ms → dropdown suggestions muncul
4. Tap salah satu suggestion
5. ✅ Map zoom ke lokasi dengan smooth animation

**Expected:**
- Dropdown shows 5 results (if Photon API available)
- Map animates to selected location
- Reverse geocode updates address display

### Test Draggable Map 📍
1. Lihat peta dengan marker merah di tengah
2. **Drag peta** ke berbagai arah
3. Observe:
   - Marker tetap di center (tidak ikut gerak)
   - Koordinat update real-time
   - Address update setelah stop dragging (debounced 500ms)

**Expected:**
- Smooth panning
- Coordinates: `-6.xxxxxx, 106.xxxxxx`
- Address: `Jl. ..., Kota, ...`

### Test Current Location 🧭
1. Tap button **"Lokasi Saya"** (pojok kanan atas map)
2. Grant location permission jika diminta
3. ✅ Map zoom ke lokasi GPS Anda

**Expected:**
- Permission dialog (first time)
- Loading indicator
- Map animates to your GPS coordinates
- Address updates automatically

### Complete Form & Submit
1. Isi **Detail Barang:**
   - Kategori: Botol Plastik
   - Berat: 2 (Kg)

2. **Detail Alamat Lengkap:**
   ```
   Jl. Sudirman No. 12, Kost Biru Kamar 4
   ```

3. **Jadwal Penjemputan:**
   - Date: Besok
   - Time: 10:00

4. Tap **"Konfirmasi Penjemputan"**

**Expected:**
- Modal konfirmasi muncul
- Setelah OK → Success modal
- Navigate ke tab "Riwayat"
- Order baru muncul dengan status "Pending"

### Verify Backend
Check backend console:
```
POST /api/pickups
Body: {
  user_id: 1,
  pickup_address: "...",
  latitude: -6.xxxxxx,
  longitude: 106.xxxxxx,
  scheduled_at: "2026-06-22 10:00",
  items: [...]
}
```

✅ Koordinat tersimpan dengan benar!

---

## 🐛 Troubleshooting

### Issue: Map layar hitam

**Solutions:**
1. **Check internet connection** (MapLibre butuh download tiles)
2. Wait 5-10 detik untuk first load
3. Pull down untuk refresh
4. Restart app

### Issue: Search tidak muncul hasil

**Solutions:**
1. Ketik minimal **3 karakter**
2. Wait 300ms (debounce)
3. Check internet connection
4. Photon API mungkin rate limited → drag map manual

### Issue: "Lokasi Saya" tidak bekerja

**Solutions:**
1. Grant location permission di Settings
2. Check GPS enabled di device
3. Test di outdoor (better GPS signal)

### Issue: Coordinates tidak update

**Solutions:**
1. Drag map lagi (pastikan drag selesai)
2. Wait 500ms untuk debounce
3. Check console untuk errors

---

## 📊 Feature Checklist

Use this to verify all features work:

- [ ] Map loads dengan OpenFreeMap tiles
- [ ] No layar hitam (vector tiles smooth)
- [ ] Search autocomplete shows dropdown (min 3 chars)
- [ ] Select suggestion → map zoom works
- [ ] Draggable map dengan center marker precision
- [ ] Coordinates update real-time saat drag
- [ ] Reverse geocode display address
- [ ] "Lokasi Saya" button works dengan GPS
- [ ] Loading indicators muncul saat loading
- [ ] Offline error handling (disconnect WiFi)
- [ ] Form submit dengan koordinat akurat
- [ ] Backend receive latitude & longitude

---

## 🎯 Expected vs Actual

| Feature | Expected | Actual |
|---------|----------|--------|
| Map tiles | OpenFreeMap vector | ✅ |
| Search min chars | 3 | ✅ |
| Debounce delay | 300ms | ✅ |
| Reverse geocode delay | 500ms | ✅ |
| Center marker | Static overlay | ✅ |
| Current location | expo-location GPS | ✅ |
| Coordinates format | 6 decimals | ✅ |

---

## 📸 Screenshots (Manual Capture)

Please capture:
1. Map loaded dengan OpenFreeMap tiles
2. Search dropdown dengan suggestions
3. Location info card dengan address + coordinates
4. Success modal setelah submit

---

## ✅ Success Criteria

All must pass:
- ✅ Map tidak hitam di Android
- ✅ Search autocomplete functional
- ✅ Draggable map works
- ✅ Coordinates accurate (6 decimals)
- ✅ Reverse geocode shows address
- ✅ Current location works
- ✅ Backend receives koordinat

---

## 🎉 Jika Semua Tests Pass

**CONGRATULATIONS!** 🎊

Maps Module implementation **100% SUKSES**!

System sekarang memiliki:
- ✅ Professional-grade maps dengan MapLibre
- ✅ Search autocomplete seperti Gojek/Grab
- ✅ Draggable precision positioning
- ✅ GPS integration
- ✅ 100% gratis, no API key

**Ready untuk production deployment!**

---

**Last Updated:** 2026-06-21  
**Testing Time:** ~10 minutes  
**Difficulty:** Easy 🟢
