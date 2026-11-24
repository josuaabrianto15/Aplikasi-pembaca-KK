import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "kk_database.db")


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tbl_identitasKK (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nomor_kk TEXT NOT NULL UNIQUE,
            nama_kepala_keluarga TEXT NOT NULL,
            alamat TEXT,
            rt_rw TEXT,
            kode_pos TEXT,
            desa_kelurahan TEXT,
            kecamatan TEXT,
            kabupaten_kota TEXT,
            provinsi TEXT,
            dikeluarkan_tanggal TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tbl_anggotaKeluargaKK (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            kk_id INTEGER NOT NULL,
            no_urut INTEGER,
            nik TEXT,
            nama_lengkap TEXT,
            jenis_kelamin TEXT,
            tempat_lahir TEXT,
            tanggal_lahir TEXT,
            agama TEXT,
            pendidikan TEXT,
            jenis_pekerjaan TEXT,
            golongan_darah TEXT,
            status_perkawinan TEXT,
            tanggal_perkawinan TEXT,
            status_hubungan TEXT,
            kewarganegaraan TEXT,
            no_paspor TEXT,
            no_kitap TEXT,
            nama_ayah TEXT,
            nama_ibu TEXT,
            FOREIGN KEY (kk_id) REFERENCES tbl_identitasKK(id) ON DELETE CASCADE
        )
    """)

    conn.commit()
    conn.close()


def row_to_dict(row):
    if row is None:
        return None
    return dict(row)


def rows_to_list(rows):
    return [dict(r) for r in rows]
