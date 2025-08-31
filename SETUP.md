# Setup Guide - Sistem Absensi SMA Adabiah 1 Padang

## Gambaran Umum

Sistem absensi berbasis web untuk siswa SMA Adabiah 1 Padang yang menggunakan foto selfie dan data siswa untuk mencatat kehadiran. Data absensi akan dikirim langsung ke grup Telegram yang ditentukan.

## Fitur Utama

- 📸 Ambil foto selfie untuk verifikasi kehadiran
- 📝 Input data siswa (nama, NIS, kelas)
- ✅ Validasi form dengan error handling
- 📱 Design responsive untuk mobile dan desktop
- 🤖 Integrasi Telegram Bot untuk notifikasi absensi
- 🇮🇩 Interface dalam Bahasa Indonesia

## Prerequisites

- Node.js (versi 18 atau lebih baru)
- NPM atau Bun
- Telegram Bot Token
- Akun Telegram untuk menerima notifikasi

## Instalasi

### 1. Clone dan Install Dependencies

```bash
cd absensi
npm install
```

### 2. Setup Telegram Bot

#### a. Buat Bot Telegram

1. Buka Telegram dan cari @BotFather
2. Ketik `/newbot` dan ikuti instruksi
3. Berikan nama untuk bot Anda (contoh: "Absensi SMA Adabiah 1 Bot")
4. Berikan username untuk bot (contoh: "AbsensiAdabiah1Bot")
5. Salin **Bot Token** yang diberikan

#### b. Dapatkan Chat ID

1. Buat grup Telegram atau gunakan chat pribadi untuk menerima notifikasi
2. Tambahkan bot ke grup tersebut (jika menggunakan grup)
3. Kirim pesan ke bot atau grup
4. Buka browser dan kunjungi:
   ```
   https://api.telegram.org/bot<BOT_TOKEN>/getUpdates
   ```
   (ganti <BOT_TOKEN> dengan token bot Anda)
5. Cari `"chat":{"id":` dalam response JSON
6. Salin nomor Chat ID (biasanya dimulai dengan tanda minus untuk grup)

### 3. Konfigurasi Environment Variables

1. Salin file `.env.example` menjadi `.env`:
   ```bash
   cp .env.example .env
   ```
2. Edit file `.env` dan isi dengan data yang benar:
   ```env
   TELEGRAM_BOT_TOKEN=1234567890:ABCDefGhIjKlMnOpQrStUvWxYz
   TELEGRAM_CHAT_ID=-1001234567890
   ```

### 4. Menjalankan Aplikasi

#### Development Mode

```bash
npm run dev
```

Aplikasi akan berjalan di http://localhost:5173

#### Production Build

```bash
npm run build
npm run preview
```

## Cara Penggunaan

### Untuk Siswa:

1. Buka website absensi di browser
2. Isi data diri:
   - Nama lengkap
   - NIS (Nomor Induk Siswa)
   - Pilih kelas
   - Pilih jenis absensi (Masuk/Pulang)
3. Klik "Aktifkan Kamera" untuk mengambil selfie
4. Ambil foto selfie dengan jelas
5. Klik "Kirim Absensi" untuk mengirim data

### Format Pesan Telegram:

```
🏫 ABSENSI SMA ADABIAH 1 PADANG

📍 MASUK

👤 Nama: Ahmad Rizki
🎓 Kelas: XI IPA 2
🆔 NIS: 1234567890
⏰ Waktu: 27/08/2024, 07.30.15

#Absensi #SMAAdabiah1Padang #MASUK
```

## Struktur Project

```
absensi/
├── src/
│   ├── lib/
│   │   └── components/
│   │       ├── Camera.svelte          # Komponen kamera
│   │       └── StudentForm.svelte     # Form data siswa
│   └── routes/
│       ├── +page.svelte              # Halaman utama
│       └── api/
│           └── attendance/
│               └── +server.ts        # API endpoint
├── .env.example                      # Template environment variables
├── package.json                      # Dependencies
└── SETUP.md                         # Panduan setup ini
```

## Troubleshooting

### Masalah Umum:

**1. "Telegram Bot belum dikonfigurasi"**

- Pastikan file `.env` sudah dibuat dan berisi `TELEGRAM_BOT_TOKEN` serta `TELEGRAM_CHAT_ID`
- Restart server development setelah menambahkan environment variables

**2. "Chat ID tidak valid"**

- Pastikan bot sudah ditambahkan ke grup (jika menggunakan grup)
- Pastikan Chat ID benar dan dalam format yang tepat
- Untuk grup, Chat ID biasanya dimulai dengan tanda minus (-)

**3. Kamera tidak bisa diakses**

- Pastikan browser memiliki izin untuk mengakses kamera
- Gunakan HTTPS jika deploy ke production
- Pastikan tidak ada aplikasi lain yang sedang menggunakan kamera

**4. Foto tidak muncul di pesan Telegram**

- Cek ukuran file foto (maksimal 10MB untuk Telegram)
- Pastikan format foto adalah JPEG/PNG

### Debug Mode:

Untuk melihat log debug, buka Developer Console di browser (F12) saat menggunakan aplikasi.

## Keamanan

- Jangan share Bot Token kepada orang lain
- Gunakan HTTPS untuk production
- Validasi data input di server dan client
- Batasi akses API jika diperlukan

## Dukungan

Jika mengalami masalah, silakan:

1. Cek troubleshooting guide di atas
2. Periksa console browser untuk error messages
3. Pastikan semua environment variables sudah benar
