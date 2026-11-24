import re


def validate_nomor_kk(value: str) -> str | None:
    """Kembalikan pesan error jika tidak valid, None jika valid."""
    if not value or not value.strip():
        return "Nomor KK wajib diisi."
    digits = re.sub(r"\D", "", value.strip())
    if len(digits) != 16:
        return "Nomor KK harus terdiri dari 16 digit."
    return None


def validate_nik(value: str) -> str | None:
    if not value or not value.strip():
        return None  # NIK tidak wajib
    digits = re.sub(r"\D", "", value.strip())
    if len(digits) != 16:
        return "NIK harus terdiri dari 16 digit."
    return None


def validate_identitas_kk(data: dict) -> dict:
    """
    Validasi payload identitas KK.
    Kembalikan dict berisi field -> pesan_error. Kosong berarti valid.
    """
    errors = {}

    err = validate_nomor_kk(data.get("nomor_kk", ""))
    if err:
        errors["nomor_kk"] = err

    if not data.get("nama_kepala_keluarga", "").strip():
        errors["nama_kepala_keluarga"] = "Nama kepala keluarga wajib diisi."

    return errors


def validate_anggota(data: dict) -> dict:
    errors = {}

    err = validate_nik(data.get("nik", ""))
    if err:
        errors["nik"] = err

    return errors
