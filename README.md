# DATAKU

Sistem Manajemen Proyek & Keuangan Mandor.

Aplikasi web modern untuk mandor dan kontraktor bangunan dalam mencatat proyek, memantau keuangan (dana masuk & pengeluaran), mengelola stok material, mencatat upah tukang mingguan, serta menyusun laporan harian dan rekap proyek.

---

## Tech Stack

- **Vite** (Build Tool & Dev Server)
- **React 19 & TypeScript** (Frontend SPA)
- **Tailwind CSS** (Styling Neo-Brutalist)
- **Supabase** (Database & Storage)
- **GitHub Actions** (CI/CD Pipeline)
- **GitHub Pages** (Static Hosting)

---

## Local Development

1. Kloning repository dan pasang dependensi:
   ```bash
   npm install
   ```

2. Buat file `.env` berdasarkan `.env.example`:
   ```bash
   cp .env.example .env
   ```

3. Masukkan konfigurasi Supabase Anda pada `.env`:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
   ```

4. Jalankan development server:
   ```bash
   npm run dev
   ```

---

## Production Build

Jalankan perintah berikut untuk menguji build produksi lokal:

```bash
npm run build
```

Hasil build akan berada di direktori `dist/`. Anda dapat menguji preview build dengan:

```bash
npm run preview
```

---

## Environment Variables

Aplikasi membutuhkan variabel lingkungan berikut:

- `VITE_SUPABASE_URL`: URL instance Supabase Anda (contoh: `https://xxxx.supabase.co`).
- `VITE_SUPABASE_PUBLISHABLE_KEY`: Publishable Key (`sb_publishable_...` atau anon key) untuk otentikasi client Supabase.
- `VITE_BASE_PATH` *(Opsional)*: Base path untuk routing (default otomatis mendeteksi repository GitHub Pages).

> **Peringatan Keamanan**: Jangan pernah memasukkan `service_role` key, database password, atau private credential ke dalam frontend.

---

## Deployment ke GitHub Pages

Aplikasi ini telah dikonfigurasi untuk otomatis di-build dan di-deploy ke GitHub Pages menggunakan GitHub Actions setiap kali ada perubahan pada branch `main`.

### 1. Masukkan GitHub Secrets

Di repository GitHub Anda:
1. Masuk ke tab **Settings** → **Secrets and variables** → **Actions**.
2. Klik tombol **New repository secret**.
3. Tambahkan secret pertama:
   - **Name**: `VITE_SUPABASE_URL`
   - **Value**: Masukkan URL Supabase Anda.
4. Tambahkan secret kedua:
   - **Name**: `VITE_SUPABASE_PUBLISHABLE_KEY`
   - **Value**: Masukkan publishable key Supabase Anda.

### 2. Aktifkan GitHub Pages

1. Masuk ke tab **Settings** → **Pages** di repository GitHub Anda.
2. Pada bagian **Build and deployment** → **Source**, pilih:
   **GitHub Actions**.
3. Simpan perubahan.

### 3. Push ke Branch `main`

Push kode ke GitHub:
```bash
git add .
git commit -m "Setup DATAKU deployment"
git push origin main
```

Workflow GitHub Actions di `.github/workflows/deploy.yml` akan berjalan secara otomatis:
1. **Checkout code**
2. **Setup Node.js 20 LTS & Cache**
3. **Install dependencies**
4. **Build production SPA** dengan environment Supabase
5. **Deploy hasil build (`dist/`) ke GitHub Pages**
