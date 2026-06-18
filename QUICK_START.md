# ⚡ QUICK START - Real-Time Notification System

## 🚀 Dalam 5 Menit

### 1. Backend Start
```bash
cd backend-api
npm install
npm start
# Output: "Server running on http://0.0.0.0:3000"
```

### 2. User App Start (Terminal 2)
```bash
cd user-app
npm install
npm start
# Tekan 'w' untuk web
# Login: satrio@email.com / 123456
```

### 3. Courier App Start (Terminal 3)
```bash
cd courier-app
npm install
npm start
# Tekan 'w' untuk web
# Login: andi@kurir.com / 123456
```

---

## 🧪 Instan Test (Copy-Paste Flow)

### Scenario: User Confirm → Courier Accept → Scan → Complete

**User App:**
1. Home → "Setor Sampah"
2. Pilih: Botol Plastik, 2 Kg
3. Alamat: "Jl. Test 123"
4. Click "Konfirmasi Penjemputan"
5. ✅ Banner: "Permintaan Diterima!"

**Courier App:**
1. Dashboard → Click Order
2. Click "Terima & Menuju Lokasi"
3. ✅ User notified: "Kurir Andi menerima..."

**Courier App (lanjut):**
1. Input weight: 2 Kg
2. Click "Generate QR Verifikasi"
3. ✅ QR code muncul

**User App:**
1. Riwayat tab → lihat order
2. ✅ Button "SCAN QR SEKARANG" prompt
3. Click button → Scan page
4. Paste QR token atau scan
5. ✅ Success! Points cair

---

## 📱 Notifications Muncul Di

| Event | Where | Look For |
|-------|-------|----------|
| Order Confirmed | Home banner | Green check icon, 5 sec auto-dismiss |
| Courier Accepted | Home banner | Blue checkmark, courier name |
| Courier Near | Home banner | Orange location icon, ETA |
| Ready Scan | Riwayat + banner | Purple QR icon + prominent button |
| History | Riwayat → Notifikasi tab | All past notifications |

---

## 🔗 Connections Status

Check if working:
```bash
# Terminal 1 (Backend logs)
"User 1 registered with socket abc123"
"Courier 1 registered with socket def456"

# Browser Console (User App)
"Socket connected: abc123"

# Browser Console (Courier App)
"Courier socket connected: def456"
```

---

## ✅ Success Indicators

- [ ] No red errors in terminal
- [ ] Notification banner slides down from top
- [ ] Riwayat tab updates without refresh
- [ ] "SCAN QR SEKARANG" button shows saat status ready
- [ ] Notification history tab has entries
- [ ] Points increased after successful scan

---

## ❌ If Something Wrong

| Issue | Fix |
|-------|-----|
| Socket not connecting | Check backend running on port 3000 |
| Notification not showing | Check browser console for errors |
| Location not tracking | Courier app needs permission grant |
| No SCAN button | Order status harus "pending_verification" |
| Network error | Backend URL check di socketService.ts |

---

## 📚 Detailed Guides

- Full Setup: `NOTIFICATION_SETUP.md`
- Architecture: `IMPLEMENTATION_SUMMARY.md`
- Database Schema: See in NOTIFICATION_SETUP.md

---

**That's it! Happy testing! 🎉**
