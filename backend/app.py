import os
import uuid
import tempfile
from datetime import datetime

from dotenv import load_dotenv
load_dotenv()  # harus sebelum import modul lain yang baca env

from flask import Flask, request, jsonify
from flask_cors import CORS

from database import init_db, get_connection, row_to_dict, rows_to_list
from ocr_processor import process_image, get_scan_result, clear_scan
from validators import validate_identitas_kk, validate_anggota

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png"}
MAX_CONTENT_LENGTH = 10 * 1024 * 1024  # 10 MB
app.config["MAX_CONTENT_LENGTH"] = MAX_CONTENT_LENGTH

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def error_response(message: str, status: int = 400, details: dict = None):
    body = {"success": False, "message": message}
    if details:
        body["errors"] = details
    return jsonify(body), status


def success_response(data=None, message: str = "Berhasil", status: int = 200):
    body = {"success": True, "message": message}
    if data is not None:
        body["data"] = data
    return jsonify(body), status


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@app.route("/api/health", methods=["GET"])
def health():
    return success_response({"status": "ok", "timestamp": datetime.now().isoformat()})


# ---------------------------------------------------------------------------
# OCR / Scan
# ---------------------------------------------------------------------------

@app.route("/api/kk/scan", methods=["POST"])
def scan_kk():
    if "file" not in request.files:
        return error_response("File tidak ditemukan dalam request.")

    file = request.files["file"]
    if file.filename == "":
        return error_response("Nama file kosong.")

    if not allowed_file(file.filename):
        return error_response("Format file tidak didukung. Gunakan JPG, JPEG, atau PNG.")

    # Simpan sementara
    ext = file.filename.rsplit(".", 1)[1].lower()
    tmp_name = f"{uuid.uuid4()}.{ext}"
    tmp_path = os.path.join(UPLOAD_FOLDER, tmp_name)

    try:
        file.save(tmp_path)
        scan_id = process_image(tmp_path)
        return success_response({"scan_id": scan_id}, "Gambar berhasil diproses.")
    except Exception as e:
        return error_response(f"Gagal memproses gambar: {str(e)}", 500)
    finally:
        # Hapus file sementara setelah diproses
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


@app.route("/api/kk/scan/<scan_id>", methods=["GET"])
def get_scan(scan_id: str):
    result = get_scan_result(scan_id)
    if result is None:
        return error_response("Hasil scan tidak ditemukan atau sudah kedaluwarsa.", 404)
    return success_response(result)


# ---------------------------------------------------------------------------
# Identitas KK
# ---------------------------------------------------------------------------

@app.route("/api/kk", methods=["GET"])
def list_kk():
    q = request.args.get("q", "").strip()
    conn = get_connection()
    try:
        if q:
            rows = conn.execute(
                """
                SELECT id, nomor_kk, nama_kepala_keluarga, alamat, kecamatan,
                       kabupaten_kota, provinsi, created_at
                FROM tbl_identitasKK
                WHERE nomor_kk LIKE ? OR nama_kepala_keluarga LIKE ?
                ORDER BY created_at DESC
                """,
                (f"%{q}%", f"%{q}%"),
            ).fetchall()
        else:
            rows = conn.execute(
                """
                SELECT id, nomor_kk, nama_kepala_keluarga, alamat, kecamatan,
                       kabupaten_kota, provinsi, created_at
                FROM tbl_identitasKK
                ORDER BY created_at DESC
                """
            ).fetchall()
        return success_response(rows_to_list(rows))
    finally:
        conn.close()


@app.route("/api/kk", methods=["POST"])
def create_kk():
    body = request.get_json(force=True, silent=True) or {}

    identitas = body.get("identitas", {})
    anggota_list = body.get("anggota", [])
    scan_id = body.get("scan_id")

    # Validasi
    errors = validate_identitas_kk(identitas)
    if errors:
        return error_response("Data tidak valid.", 422, errors)

    # Periksa duplikasi nomor KK
    conn = get_connection()
    try:
        existing = conn.execute(
            "SELECT id FROM tbl_identitasKK WHERE nomor_kk = ?",
            (identitas["nomor_kk"].strip(),),
        ).fetchone()
        if existing:
            return error_response("Nomor KK sudah terdaftar.", 409)

        # Insert identitas
        cursor = conn.execute(
            """
            INSERT INTO tbl_identitasKK
                (nomor_kk, nama_kepala_keluarga, alamat, rt_rw, kode_pos,
                 desa_kelurahan, kecamatan, kabupaten_kota, provinsi, dikeluarkan_tanggal)
            VALUES (?,?,?,?,?,?,?,?,?,?)
            """,
            (
                identitas.get("nomor_kk", "").strip(),
                identitas.get("nama_kepala_keluarga", "").strip(),
                identitas.get("alamat", ""),
                identitas.get("rt_rw", ""),
                identitas.get("kode_pos", ""),
                identitas.get("desa_kelurahan", ""),
                identitas.get("kecamatan", ""),
                identitas.get("kabupaten_kota", ""),
                identitas.get("provinsi", ""),
                identitas.get("dikeluarkan_tanggal", ""),
            ),
        )
        kk_id = cursor.lastrowid

        # Insert anggota
        anggota_errors = []
        for idx, anggota in enumerate(anggota_list):
            a_errors = validate_anggota(anggota)
            if a_errors:
                anggota_errors.append({"index": idx, "errors": a_errors})
                continue
            _insert_anggota(conn, kk_id, anggota)

        conn.commit()

        # Hapus cache scan jika ada
        if scan_id:
            clear_scan(scan_id)

        new_kk = row_to_dict(
            conn.execute("SELECT * FROM tbl_identitasKK WHERE id = ?", (kk_id,)).fetchone()
        )
        response_data = {"kk": new_kk}
        if anggota_errors:
            response_data["anggota_errors"] = anggota_errors

        return success_response(response_data, "Data KK berhasil disimpan.", 201)
    finally:
        conn.close()


@app.route("/api/kk/<int:kk_id>", methods=["GET"])
def get_kk(kk_id: int):
    conn = get_connection()
    try:
        kk = row_to_dict(
            conn.execute("SELECT * FROM tbl_identitasKK WHERE id = ?", (kk_id,)).fetchone()
        )
        if not kk:
            return error_response("Data KK tidak ditemukan.", 404)

        anggota = rows_to_list(
            conn.execute(
                "SELECT * FROM tbl_anggotaKeluargaKK WHERE kk_id = ? ORDER BY no_urut",
                (kk_id,),
            ).fetchall()
        )
        return success_response({"kk": kk, "anggota": anggota})
    finally:
        conn.close()


@app.route("/api/kk/<int:kk_id>", methods=["PUT"])
def update_kk(kk_id: int):
    body = request.get_json(force=True, silent=True) or {}

    errors = validate_identitas_kk(body)
    if errors:
        return error_response("Data tidak valid.", 422, errors)

    conn = get_connection()
    try:
        existing = row_to_dict(
            conn.execute("SELECT * FROM tbl_identitasKK WHERE id = ?", (kk_id,)).fetchone()
        )
        if not existing:
            return error_response("Data KK tidak ditemukan.", 404)

        # Cek duplikasi nomor KK (kecuali diri sendiri)
        dup = conn.execute(
            "SELECT id FROM tbl_identitasKK WHERE nomor_kk = ? AND id != ?",
            (body.get("nomor_kk", "").strip(), kk_id),
        ).fetchone()
        if dup:
            return error_response("Nomor KK sudah digunakan oleh data lain.", 409)

        conn.execute(
            """
            UPDATE tbl_identitasKK SET
                nomor_kk = ?, nama_kepala_keluarga = ?, alamat = ?, rt_rw = ?,
                kode_pos = ?, desa_kelurahan = ?, kecamatan = ?,
                kabupaten_kota = ?, provinsi = ?, dikeluarkan_tanggal = ?
            WHERE id = ?
            """,
            (
                body.get("nomor_kk", "").strip(),
                body.get("nama_kepala_keluarga", "").strip(),
                body.get("alamat", ""),
                body.get("rt_rw", ""),
                body.get("kode_pos", ""),
                body.get("desa_kelurahan", ""),
                body.get("kecamatan", ""),
                body.get("kabupaten_kota", ""),
                body.get("provinsi", ""),
                body.get("dikeluarkan_tanggal", ""),
                kk_id,
            ),
        )
        conn.commit()
        updated = row_to_dict(
            conn.execute("SELECT * FROM tbl_identitasKK WHERE id = ?", (kk_id,)).fetchone()
        )
        return success_response(updated, "Data KK berhasil diperbarui.")
    finally:
        conn.close()


@app.route("/api/kk/<int:kk_id>", methods=["DELETE"])
def delete_kk(kk_id: int):
    conn = get_connection()
    try:
        existing = conn.execute(
            "SELECT id FROM tbl_identitasKK WHERE id = ?", (kk_id,)
        ).fetchone()
        if not existing:
            return error_response("Data KK tidak ditemukan.", 404)

        conn.execute("DELETE FROM tbl_identitasKK WHERE id = ?", (kk_id,))
        conn.commit()
        return success_response(message="Data KK beserta anggota keluarga berhasil dihapus.")
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Anggota Keluarga
# ---------------------------------------------------------------------------

def _insert_anggota(conn, kk_id: int, data: dict):
    conn.execute(
        """
        INSERT INTO tbl_anggotaKeluargaKK
            (kk_id, no_urut, nik, nama_lengkap, jenis_kelamin, tempat_lahir,
             tanggal_lahir, agama, pendidikan, jenis_pekerjaan, golongan_darah,
             status_perkawinan, tanggal_perkawinan, status_hubungan,
             kewarganegaraan, no_paspor, no_kitap, nama_ayah, nama_ibu)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """,
        (
            kk_id,
            data.get("no_urut"),
            data.get("nik", ""),
            data.get("nama_lengkap", ""),
            data.get("jenis_kelamin", ""),
            data.get("tempat_lahir", ""),
            data.get("tanggal_lahir", ""),
            data.get("agama", ""),
            data.get("pendidikan", ""),
            data.get("jenis_pekerjaan", ""),
            data.get("golongan_darah", ""),
            data.get("status_perkawinan", ""),
            data.get("tanggal_perkawinan", ""),
            data.get("status_hubungan", ""),
            data.get("kewarganegaraan", "WNI"),
            data.get("no_paspor", ""),
            data.get("no_kitap", ""),
            data.get("nama_ayah", ""),
            data.get("nama_ibu", ""),
        ),
    )


@app.route("/api/anggota", methods=["POST"])
def create_anggota():
    body = request.get_json(force=True, silent=True) or {}

    kk_id = body.get("kk_id")
    if not kk_id:
        return error_response("kk_id wajib diisi.")

    errors = validate_anggota(body)
    if errors:
        return error_response("Data tidak valid.", 422, errors)

    conn = get_connection()
    try:
        kk = conn.execute(
            "SELECT id FROM tbl_identitasKK WHERE id = ?", (kk_id,)
        ).fetchone()
        if not kk:
            return error_response("Data KK tidak ditemukan.", 404)

        _insert_anggota(conn, kk_id, body)
        conn.commit()

        new_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
        anggota = row_to_dict(
            conn.execute(
                "SELECT * FROM tbl_anggotaKeluargaKK WHERE id = ?", (new_id,)
            ).fetchone()
        )
        return success_response(anggota, "Anggota keluarga berhasil ditambahkan.", 201)
    finally:
        conn.close()


@app.route("/api/anggota/<int:anggota_id>", methods=["PUT"])
def update_anggota(anggota_id: int):
    body = request.get_json(force=True, silent=True) or {}

    errors = validate_anggota(body)
    if errors:
        return error_response("Data tidak valid.", 422, errors)

    conn = get_connection()
    try:
        existing = conn.execute(
            "SELECT id FROM tbl_anggotaKeluargaKK WHERE id = ?", (anggota_id,)
        ).fetchone()
        if not existing:
            return error_response("Data anggota tidak ditemukan.", 404)

        conn.execute(
            """
            UPDATE tbl_anggotaKeluargaKK SET
                no_urut = ?, nik = ?, nama_lengkap = ?, jenis_kelamin = ?,
                tempat_lahir = ?, tanggal_lahir = ?, agama = ?, pendidikan = ?,
                jenis_pekerjaan = ?, golongan_darah = ?, status_perkawinan = ?,
                tanggal_perkawinan = ?, status_hubungan = ?, kewarganegaraan = ?,
                no_paspor = ?, no_kitap = ?, nama_ayah = ?, nama_ibu = ?
            WHERE id = ?
            """,
            (
                body.get("no_urut"),
                body.get("nik", ""),
                body.get("nama_lengkap", ""),
                body.get("jenis_kelamin", ""),
                body.get("tempat_lahir", ""),
                body.get("tanggal_lahir", ""),
                body.get("agama", ""),
                body.get("pendidikan", ""),
                body.get("jenis_pekerjaan", ""),
                body.get("golongan_darah", ""),
                body.get("status_perkawinan", ""),
                body.get("tanggal_perkawinan", ""),
                body.get("status_hubungan", ""),
                body.get("kewarganegaraan", "WNI"),
                body.get("no_paspor", ""),
                body.get("no_kitap", ""),
                body.get("nama_ayah", ""),
                body.get("nama_ibu", ""),
                anggota_id,
            ),
        )
        conn.commit()
        updated = row_to_dict(
            conn.execute(
                "SELECT * FROM tbl_anggotaKeluargaKK WHERE id = ?", (anggota_id,)
            ).fetchone()
        )
        return success_response(updated, "Data anggota berhasil diperbarui.")
    finally:
        conn.close()


@app.route("/api/anggota/<int:anggota_id>", methods=["DELETE"])
def delete_anggota(anggota_id: int):
    conn = get_connection()
    try:
        existing = conn.execute(
            "SELECT id FROM tbl_anggotaKeluargaKK WHERE id = ?", (anggota_id,)
        ).fetchone()
        if not existing:
            return error_response("Data anggota tidak ditemukan.", 404)

        conn.execute(
            "DELETE FROM tbl_anggotaKeluargaKK WHERE id = ?", (anggota_id,)
        )
        conn.commit()
        return success_response(message="Data anggota berhasil dihapus.")
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Error handlers
# ---------------------------------------------------------------------------

@app.errorhandler(413)
def request_entity_too_large(e):
    return error_response("Ukuran file terlalu besar. Maksimum 10 MB.", 413)


@app.errorhandler(404)
def not_found(e):
    return error_response("Endpoint tidak ditemukan.", 404)


@app.errorhandler(500)
def internal_error(e):
    return error_response("Terjadi kesalahan internal server.", 500)


if __name__ == "__main__":
    init_db()
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    print(f"🚀 Backend berjalan di http://127.0.0.1:{port}")
    app.run(host="127.0.0.1", port=port, debug=debug)
