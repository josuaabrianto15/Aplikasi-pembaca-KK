# Aplikasi Pembaca Kartu Keluarga (KK)

Aplikasi web lokal untuk membaca data Kartu Keluarga menggunakan OCR (Tesseract), menyimpan data ke SQLite, dan mengelolanya melalui antarmuka Next.js.

---

## Teknologi

| Bagian     | Teknologi                               |
|------------|-----------------------------------------|
| Backend    | Python 3.10+, Flask, SQLite             |
| OCR        | pytesseract, OpenCV, Pillow             |
| Frontend   | Next.js 15, TypeScript, Tailwind CSS    |

---

## Prasyarat

### 1. Tesseract OCR

Tesseract **harus terinstall** di sistem sebelum backend dapat membaca gambar.

**Windows:**
1. Unduh installer dari: https://github.com/UB-Mannheim/tesseract/wiki
2. Jalankan installer, aktifkan bahasa **Indonesian (ind)** saat instalasi.
3. Tambahkan ke PATH, atau set `TESSERACT_CMD` di `backend/.env`.

**Linux (Ubuntu/Debian):**
```bash
sudo apt install tesseract-ocr tesseract-ocr-ind
```

**macOS (Homebrew):**
```bash
brew install tesseract
brew install tesseract-lang  # untuk bahasa Indonesia
```

### 2. Python 3.10+

Cek versi: `python --version`

### 3. Node.js 18+

Cek versi: `node --version`

---

## Instalasi & Menjalankan

### Backend (Flask)

```bash
cd backend

# 1. Salin file environment
copy .env.example .env

# 2. Edit .env jika Tesseract tidak ada di PATH
#    Set TESSERACT_CMD=C:\Program Files\Tesseract-OCR\tesseract.exe

# 3. Install dependensi Python
pip install -r requirements.txt

# 4. Jalankan server
python app.py
```

Backend akan berjalan di **http://127.0.0.1:5000**.

---

### Frontend (Next.js)

Buka terminal baru:

```bash
cd frontend

# 1. Install dependensi
npm install

# 2. Jalankan development server
npm run dev
```

Frontend akan berjalan di **http://localhost:3000**.

---

## Struktur Proyek

```
Aplikasi Pembaca KK/
├── backend/
│   ├── app.py              # Entry point Flask
│   ├── database.py         # Koneksi & inisialisasi SQLite
│   ├── ocr_processor.py    # Pra-proses gambar & ekstraksi teks OCR
│   ├── validators.py       # Validasi data
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── app/
│   │   ├── page.tsx             # Beranda
│   │   ├── upload/page.tsx      # Upload KK
│   │   ├── konfirmasi/page.tsx  # Konfirmasi hasil OCR
│   │   ├── daftar-kk/page.tsx   # Daftar semua KK
│   │   └── detail-kk/[id]/page.tsx  # Detail & edit KK
│   ├── components/         # Komponen UI bersama
│   ├── lib/api.ts          # Fungsi pemanggil API backend
│   ├── types/index.ts      # TypeScript types
│   └── .env.example
├── .gitignore
└── README.md
```

---

## Daftar Endpoint API

| Method | Endpoint               | Deskripsi                                |
|--------|------------------------|------------------------------------------|
| GET    | `/api/health`          | Cek status server                        |
| POST   | `/api/kk/scan`         | Upload gambar KK, jalankan OCR           |
| GET    | `/api/kk/scan/<id>`    | Ambil hasil OCR berdasarkan scan ID      |
| GET    | `/api/kk`              | Daftar semua KK (opsional: `?q=...`)     |
| POST   | `/api/kk`              | Simpan data KK baru ke database          |
| GET    | `/api/kk/<id>`         | Detail satu KK beserta anggota keluarga  |
| PUT    | `/api/kk/<id>`         | Perbarui identitas KK                    |
| DELETE | `/api/kk/<id>`         | Hapus KK beserta seluruh anggota         |
| POST   | `/api/anggota`         | Tambah anggota keluarga                  |
| PUT    | `/api/anggota/<id>`    | Perbarui data anggota                    |
| DELETE | `/api/anggota/<id>`    | Hapus anggota keluarga                   |

---

## Database

SQLite disimpan di `backend/kk_database.db` (dibuat otomatis saat pertama kali dijalankan).

Tabel:
- `tbl_identitasKK` — data identitas KK
- `tbl_anggotaKeluargaKK` — anggota keluarga, terhubung via foreign key `kk_id`

Cascade delete aktif: menghapus KK akan otomatis menghapus seluruh anggota keluarganya.

---

## Catatan

- Semua proses berjalan **100% lokal**; tidak ada koneksi ke cloud maupun API berbayar.
- Hasil OCR disimpan sementara di memori server; data hanya masuk database setelah pengguna menekan tombol **Simpan**.
- Kualitas pembacaan OCR sangat bergantung pada kualitas foto KK (pencahayaan, kemiringan, resolusi).
