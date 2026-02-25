# 🔑 Setup API Key untuk Sentiment Analysis

## Masalah
Semua review dianalisis sebagai **neutral** karena sistem belum punya **Gemini API Key**.

## Solusi

### 1. Dapatkan API Key Gemini (GRATIS)
1. Buka https://makersuite.google.com/app/apikey
2. Login dengan akun Google kamu  
3. Klik **"Create API Key"**
4. Copy API key yang dihasilkan

### 2. Masukkan API Key ke File `.env`
Buka file `.env` di root project dan ganti:
```
GEMINI_API_KEY=YOUR_API_KEY_HERE
```

Menjadi:
```
GEMINI_API_KEY=AIzaSy... (API key kamu yang actual)
```

### 3. Restart Backend Server
```bash
# Di terminal, stop server dengan Ctrl+C, lalu:
npm run server
```

### 4. Test Upload CSV
Sekarang saat kamu upload CSV, sistem akan:
- ✅ Mendeteksi sentiment **positive** untuk review seperti "enak banget", "mantap", "recommended"
- ✅ Mendeteksi sentiment **negative** untuk review seperti "kecewa", "lambat", "mahal banget"  
- ✅ Mendeteksi entity (Quality, Service, Price, Ambiance, dll)

## Catatan Penting
- API key Gemini gratis dengan quota 60 requests per menit
- Jangan commit file `.env` ke Git (sudah ada di `.gitignore`)
- Kalau masih semua netral setelah setup, coba **clear all data** dulu di Data Management

## Troubleshooting
Kalau masih error pas upload:
1. Pastikan file `.env` ada di root folder (sejajar dengan `server.ts`)
2. Cek apakah API key valid dengan test di Google AI Studio
3. Lihat log terminal backend untuk error message detail
