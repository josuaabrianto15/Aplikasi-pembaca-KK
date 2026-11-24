import re
import os
import uuid
import cv2
import numpy as np
import pytesseract
from PIL import Image
from dotenv import load_dotenv

load_dotenv()

TESSERACT_CONFIG = "--oem 3 --psm 6 -l ind+eng"

# In-memory scan cache (tidak disimpan permanen ke DB)
_scan_cache: dict[str, dict] = {}


def _set_tesseract_cmd():
    """Set path Tesseract dari env setiap kali dipanggil."""
    cmd = os.environ.get("TESSERACT_CMD", "")
    if cmd:
        pytesseract.pytesseract.tesseract_cmd = cmd


def preprocess_image(image_path: str) -> np.ndarray:
    """Pra-proses gambar agar teks lebih mudah dibaca Tesseract."""
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Tidak dapat membaca gambar: {image_path}")

    # Resize jika terlalu kecil
    h, w = img.shape[:2]
    if w < 1000:
        scale = 1000 / w
        img = cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)

    # Grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Denoising
    denoised = cv2.fastNlMeansDenoising(gray, h=10)

    # Adaptive threshold untuk meningkatkan kontras teks
    thresh = cv2.adaptiveThreshold(
        denoised, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY, 31, 10
    )

    return thresh


def run_ocr(image_path: str) -> str:
    """Jalankan OCR dan kembalikan teks mentah."""
    _set_tesseract_cmd()
    processed = preprocess_image(image_path)
    pil_img = Image.fromarray(processed)
    text = pytesseract.image_to_string(pil_img, config=TESSERACT_CONFIG)
    return text


def clean_text(text: str) -> str:
    return text.strip()


def extract_field(text: str, patterns: list[str]) -> str:
    """Coba beberapa pola regex dan kembalikan hasil pertama yang cocok."""
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
        if match:
            return clean_text(match.group(1))
    return ""


def extract_digits_only(value: str) -> str:
    return re.sub(r"\D", "", value)


def parse_kk_text(raw_text: str) -> dict:
    """
    Parse teks OCR menjadi struktur data KK.
    Pola ini dirancang untuk format KK Indonesia standar.
    """
    lines = [l.strip() for l in raw_text.splitlines() if l.strip()]
    text = raw_text

    # --- Nomor KK ---
    nomor_kk = extract_field(text, [
        r"nomor\s*kartu\s*keluarga[:\s]+(\d[\d\s\-]{10,20})",
        r"no\.?\s*kk[:\s]+(\d[\d\s\-]{10,20})",
        r"(?:^|\n)\s*(\d{16})\s*(?:\n|$)",
    ])
    if nomor_kk:
        nomor_kk = extract_digits_only(nomor_kk)[:16]

    # --- Nama Kepala Keluarga ---
    nama_kk = extract_field(text, [
        r"nama\s+kepala\s+keluarga[:\s]+(.+?)(?:\n|$)",
        r"kepala\s+keluarga[:\s]+(.+?)(?:\n|$)",
    ])

    # --- Alamat ---
    alamat = extract_field(text, [
        r"alamat[:\s]+(.+?)(?:\n|$)",
        r"jl\.?\s+(.+?)(?:\n|$)",
    ])

    rt_rw = extract_field(text, [
        r"rt[/\s]rw[:\s]+(\d+\s*/\s*\d+)",
        r"\brt\.?\s*(\d+)\s*/\s*rw\.?\s*(\d+)",
    ])

    kode_pos = extract_field(text, [
        r"kode\s+pos[:\s]+(\d{5})",
        r"\b(\d{5})\b",
    ])

    desa = extract_field(text, [
        r"desa[/\s]kelurahan[:\s]+(.+?)(?:\n|$)",
        r"kelurahan[:\s]+(.+?)(?:\n|$)",
        r"desa[:\s]+(.+?)(?:\n|$)",
    ])

    kecamatan = extract_field(text, [
        r"kecamatan[:\s]+(.+?)(?:\n|$)",
    ])

    kabupaten = extract_field(text, [
        r"kabupaten[/\s]kota[:\s]+(.+?)(?:\n|$)",
        r"kabupaten[:\s]+(.+?)(?:\n|$)",
        r"kota[:\s]+(.+?)(?:\n|$)",
    ])

    provinsi = extract_field(text, [
        r"provinsi[:\s]+(.+?)(?:\n|$)",
        r"propinsi[:\s]+(.+?)(?:\n|$)",
    ])

    dikeluarkan = extract_field(text, [
        r"dikeluarkan\s+(?:di\s+.+?,?\s+)?(?:pada\s+tanggal\s+)?(.+?)(?:\n|$)",
        r"tanggal\s+dikeluarkan[:\s]+(.+?)(?:\n|$)",
    ])

    identitas = {
        "nomor_kk": nomor_kk,
        "nama_kepala_keluarga": nama_kk,
        "alamat": alamat,
        "rt_rw": rt_rw,
        "kode_pos": kode_pos,
        "desa_kelurahan": desa,
        "kecamatan": kecamatan,
        "kabupaten_kota": kabupaten,
        "provinsi": provinsi,
        "dikeluarkan_tanggal": dikeluarkan,
    }

    # --- Anggota Keluarga ---
    anggota_list = parse_anggota(lines, text)

    return {
        "identitas": identitas,
        "anggota": anggota_list,
        "raw_text": raw_text,
    }


def parse_anggota(lines: list[str], text: str) -> list[dict]:
    """
    Mencoba mengekstrak baris-baris anggota keluarga.
    Format KK Indonesia: tabel dengan kolom no urut, NIK, nama, dsb.
    """
    anggota_list = []

    # Cari blok tabel anggota – biasanya setelah kata "No. Urut" atau "NIK"
    table_start = -1
    for i, line in enumerate(lines):
        if re.search(r"no\.?\s*urut|nik\s*anggota|daftar\s*anggota", line, re.IGNORECASE):
            table_start = i
            break

    if table_start == -1:
        # Coba ambil baris yang mengandung NIK 16 digit
        nik_lines = [l for l in lines if re.search(r"\b\d{16}\b", l)]
        for idx, line in enumerate(nik_lines):
            nik = re.search(r"\b(\d{16})\b", line)
            nama = ""
            # Baris berikutnya kemungkinan nama
            pos = lines.index(line) if line in lines else -1
            if pos != -1 and pos + 1 < len(lines):
                nama = lines[pos + 1]
            anggota_list.append({
                "no_urut": idx + 1,
                "nik": nik.group(1) if nik else "",
                "nama_lengkap": nama,
                "jenis_kelamin": "",
                "tempat_lahir": "",
                "tanggal_lahir": "",
                "agama": "",
                "pendidikan": "",
                "jenis_pekerjaan": "",
                "golongan_darah": "",
                "status_perkawinan": "",
                "tanggal_perkawinan": "",
                "status_hubungan": "",
                "kewarganegaraan": "WNI",
                "no_paspor": "",
                "no_kitap": "",
                "nama_ayah": "",
                "nama_ibu": "",
            })
        return anggota_list

    # Parse baris setelah header tabel
    no_urut = 0
    i = table_start + 1
    while i < len(lines):
        line = lines[i]
        # Baris nomor urut biasanya dimulai dengan angka kecil
        m = re.match(r"^(\d{1,2})\s+(\d{16})?\s*(.*)$", line)
        if m:
            no_urut = int(m.group(1))
            nik = m.group(2) or ""
            rest = m.group(3).strip()
            nama = rest if rest else (lines[i + 1] if i + 1 < len(lines) else "")

            jk = ""
            ttl = ""
            if i + 1 < len(lines):
                next_line = lines[i + 1]
                if re.search(r"\blaki|perempuan\b", next_line, re.IGNORECASE):
                    jk = "Laki-Laki" if re.search(r"laki", next_line, re.IGNORECASE) else "Perempuan"
                # Coba ekstrak tempat/tanggal lahir
                ttl_m = re.search(r"([A-Za-z\s]+),\s*(\d{1,2}[-/]\d{1,2}[-/]\d{4})", next_line)
                if ttl_m:
                    ttl = ttl_m.group(0)

            anggota_list.append({
                "no_urut": no_urut,
                "nik": nik,
                "nama_lengkap": nama,
                "jenis_kelamin": jk,
                "tempat_lahir": "",
                "tanggal_lahir": "",
                "agama": "",
                "pendidikan": "",
                "jenis_pekerjaan": "",
                "golongan_darah": "",
                "status_perkawinan": "",
                "tanggal_perkawinan": "",
                "status_hubungan": "",
                "kewarganegaraan": "WNI",
                "no_paspor": "",
                "no_kitap": "",
                "nama_ayah": "",
                "nama_ibu": "",
            })
        i += 1

    return anggota_list


def process_image(image_path: str) -> str:
    """
    Proses gambar KK: jalankan OCR, parse hasilnya, simpan ke cache.
    Kembalikan scan_id.
    """
    raw_text = run_ocr(image_path)
    parsed = parse_kk_text(raw_text)
    scan_id = str(uuid.uuid4())
    _scan_cache[scan_id] = parsed
    return scan_id


def get_scan_result(scan_id: str) -> dict | None:
    return _scan_cache.get(scan_id)


def clear_scan(scan_id: str):
    _scan_cache.pop(scan_id, None)
