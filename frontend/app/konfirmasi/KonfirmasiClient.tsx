"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getScanResult, createKK } from "@/lib/api";
import type { AnggotaKeluarga, IdentitasKK, ScanResult } from "@/types";
import Alert from "@/components/Alert";
import LoadingSpinner from "@/components/LoadingSpinner";
import FormField from "@/components/FormField";

const emptyIdentitas = (): IdentitasKK => ({
  nomor_kk: "",
  nama_kepala_keluarga: "",
  alamat: "",
  rt_rw: "",
  kode_pos: "",
  desa_kelurahan: "",
  kecamatan: "",
  kabupaten_kota: "",
  provinsi: "",
  dikeluarkan_tanggal: "",
});

const emptyAnggota = (): AnggotaKeluarga => ({
  no_urut: undefined,
  nik: "",
  nama_lengkap: "",
  jenis_kelamin: "",
  tempat_lahir: "",
  tanggal_lahir: "",
  agama: "",
  pendidikan: "",
  jenis_pekerjaan: "",
  golongan_darah: "",
  status_perkawinan: "",
  tanggal_perkawinan: "",
  status_hubungan: "",
  kewarganegaraan: "WNI",
  no_paspor: "",
  no_kitap: "",
  nama_ayah: "",
  nama_ibu: "",
});

const JENIS_KELAMIN = [
  { value: "Laki-Laki", label: "Laki-Laki" },
  { value: "Perempuan", label: "Perempuan" },
];
const AGAMA = [
  { value: "Islam", label: "Islam" },
  { value: "Kristen", label: "Kristen" },
  { value: "Katolik", label: "Katolik" },
  { value: "Hindu", label: "Hindu" },
  { value: "Buddha", label: "Buddha" },
  { value: "Konghucu", label: "Konghucu" },
  { value: "Lainnya", label: "Lainnya" },
];
const STATUS_KAWIN = [
  { value: "Belum Kawin", label: "Belum Kawin" },
  { value: "Kawin", label: "Kawin" },
  { value: "Cerai Hidup", label: "Cerai Hidup" },
  { value: "Cerai Mati", label: "Cerai Mati" },
];
const GOLONGAN_DARAH = [
  { value: "A", label: "A" },
  { value: "B", label: "B" },
  { value: "AB", label: "AB" },
  { value: "O", label: "O" },
  { value: "Tidak Diketahui", label: "Tidak Diketahui" },
];
const KEWARGANEGARAAN = [
  { value: "WNI", label: "WNI" },
  { value: "WNA", label: "WNA" },
];
const STATUS_HUBUNGAN = [
  { value: "Kepala Keluarga", label: "Kepala Keluarga" },
  { value: "Istri", label: "Istri" },
  { value: "Anak", label: "Anak" },
  { value: "Menantu", label: "Menantu" },
  { value: "Cucu", label: "Cucu" },
  { value: "Orang Tua", label: "Orang Tua" },
  { value: "Mertua", label: "Mertua" },
  { value: "Famili Lain", label: "Famili Lain" },
  { value: "Pembantu", label: "Pembantu" },
  { value: "Lainnya", label: "Lainnya" },
];

export default function KonfirmasiClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const scanId = searchParams.get("scan_id");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [rawText, setRawText] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  const [identitas, setIdentitas] = useState<IdentitasKK>(emptyIdentitas());
  const [anggotaList, setAnggotaList] = useState<AnggotaKeluarga[]>([emptyAnggota()]);
  const [expandedAnggota, setExpandedAnggota] = useState<number | null>(0);

  const fetchScan = useCallback(async () => {
    if (!scanId) {
      setError("scan_id tidak ditemukan. Kembali ke halaman upload.");
      setLoading(false);
      return;
    }
    try {
      const res = await getScanResult(scanId);
      if (!res.success || !res.data) {
        setError(res.message || "Gagal mengambil hasil scan.");
        setLoading(false);
        return;
      }
      const data = res.data as ScanResult;
      setIdentitas({ ...emptyIdentitas(), ...data.identitas });
      if (data.anggota && data.anggota.length > 0) {
        setAnggotaList(data.anggota.map((a) => ({ ...emptyAnggota(), ...a })));
      }
      setRawText(data.raw_text ?? null);
    } catch {
      setError("Tidak dapat menghubungi server backend.");
    } finally {
      setLoading(false);
    }
  }, [scanId]);

  useEffect(() => {
    fetchScan();
  }, [fetchScan]);

  function handleIdentitasChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setIdentitas((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => { const c = { ...prev }; delete c[name]; return c; });
  }

  function handleAnggotaChange(
    index: number,
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setAnggotaList((prev) =>
      prev.map((a, i) => (i === index ? { ...a, [name]: value } : a))
    );
    setFieldErrors((prev) => { const c = { ...prev }; delete c[`anggota_${index}_${name}`]; return c; });
  }

  function addAnggota() {
    setAnggotaList((prev) => {
      const newList = [...prev, emptyAnggota()];
      setExpandedAnggota(newList.length - 1);
      return newList;
    });
  }

  function removeAnggota(index: number) {
    setAnggotaList((prev) => prev.filter((_, i) => i !== index));
    setExpandedAnggota(null);
  }

  function validateForm(): boolean {
    const errors: Record<string, string> = {};

    if (!identitas.nomor_kk.trim()) {
      errors.nomor_kk = "Nomor KK wajib diisi.";
    } else if (identitas.nomor_kk.replace(/\D/g, "").length !== 16) {
      errors.nomor_kk = "Nomor KK harus 16 digit.";
    }
    if (!identitas.nama_kepala_keluarga.trim()) {
      errors.nama_kepala_keluarga = "Nama kepala keluarga wajib diisi.";
    }

    anggotaList.forEach((a, i) => {
      if (a.nik && a.nik.replace(/\D/g, "").length !== 16) {
        errors[`anggota_${i}_nik`] = "NIK harus 16 digit.";
      }
    });

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSave() {
    if (!validateForm()) return;
    setSaving(true);
    setError(null);

    try {
      const res = await createKK({
        identitas,
        anggota: anggotaList,
        scan_id: scanId ?? undefined,
      });
      if (!res.success) {
        if (res.errors) setFieldErrors(res.errors);
        setError(res.message || "Gagal menyimpan data.");
        return;
      }
      const kkData = res.data as { kk: { id: number } };
      router.push(`/detail-kk/${kkData.kk.id}?saved=1`);
    } catch {
      setError("Tidak dapat menghubungi server backend.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingSpinner text="Mengambil hasil OCR..." />;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Konfirmasi Hasil OCR</h1>
        <p className="text-gray-500 text-sm mt-1">
          Periksa dan perbaiki data sebelum disimpan ke database.
        </p>
      </div>

      {error && (
        <div className="mb-4">
          <Alert variant="error" onClose={() => setError(null)}>{error}</Alert>
        </div>
      )}

      {/* Identitas KK */}
      <section className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-5">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Identitas Kartu Keluarga</h2>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            label="Nomor KK"
            name="nomor_kk"
            value={identitas.nomor_kk}
            onChange={handleIdentitasChange}
            required
            hint="16 digit"
            error={fieldErrors.nomor_kk}
          />
          <FormField
            label="Nama Kepala Keluarga"
            name="nama_kepala_keluarga"
            value={identitas.nama_kepala_keluarga}
            onChange={handleIdentitasChange}
            required
            error={fieldErrors.nama_kepala_keluarga}
          />
          <div className="sm:col-span-2">
            <FormField
              label="Alamat"
              name="alamat"
              value={identitas.alamat}
              onChange={handleIdentitasChange}
              as="textarea"
            />
          </div>
          <FormField label="RT/RW" name="rt_rw" value={identitas.rt_rw} onChange={handleIdentitasChange} />
          <FormField label="Kode Pos" name="kode_pos" value={identitas.kode_pos} onChange={handleIdentitasChange} />
          <FormField label="Desa/Kelurahan" name="desa_kelurahan" value={identitas.desa_kelurahan} onChange={handleIdentitasChange} />
          <FormField label="Kecamatan" name="kecamatan" value={identitas.kecamatan} onChange={handleIdentitasChange} />
          <FormField label="Kabupaten/Kota" name="kabupaten_kota" value={identitas.kabupaten_kota} onChange={handleIdentitasChange} />
          <FormField label="Provinsi" name="provinsi" value={identitas.provinsi} onChange={handleIdentitasChange} />
          <FormField label="Tanggal Dikeluarkan" name="dikeluarkan_tanggal" value={identitas.dikeluarkan_tanggal} onChange={handleIdentitasChange} />
        </div>
      </section>

      {/* Anggota Keluarga */}
      <section className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-5">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">
            Anggota Keluarga ({anggotaList.length} orang)
          </h2>
          <button
            onClick={addAnggota}
            className="text-sm px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            + Tambah Anggota
          </button>
        </div>

        <div className="divide-y divide-gray-100">
          {anggotaList.map((anggota, index) => (
            <div key={index} className="p-4">
              {/* Accordion header */}
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() =>
                  setExpandedAnggota(expandedAnggota === index ? null : index)
                }
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      {anggota.nama_lengkap || <span className="text-gray-400 italic">Belum ada nama</span>}
                    </p>
                    <p className="text-xs text-gray-400">{anggota.nik || "NIK belum diisi"}</p>
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  <button
                    onClick={(e) => { e.stopPropagation(); removeAnggota(index); }}
                    className="text-xs text-red-500 hover:text-red-700 px-2 py-1"
                  >
                    Hapus
                  </button>
                  <span className="text-gray-400 text-sm">{expandedAnggota === index ? "▲" : "▼"}</span>
                </div>
              </div>

              {/* Expanded form */}
              {expandedAnggota === index && (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <FormField
                    label="No. Urut"
                    name="no_urut"
                    value={String(anggota.no_urut ?? "")}
                    onChange={(e) => handleAnggotaChange(index, e)}
                    type="number"
                  />
                  <FormField
                    label="NIK"
                    name="nik"
                    value={anggota.nik}
                    onChange={(e) => handleAnggotaChange(index, e)}
                    hint="16 digit"
                    error={fieldErrors[`anggota_${index}_nik`]}
                  />
                  <FormField
                    label="Nama Lengkap"
                    name="nama_lengkap"
                    value={anggota.nama_lengkap}
                    onChange={(e) => handleAnggotaChange(index, e)}
                  />
                  <FormField
                    label="Jenis Kelamin"
                    name="jenis_kelamin"
                    value={anggota.jenis_kelamin}
                    onChange={(e) => handleAnggotaChange(index, e)}
                    as="select"
                    options={JENIS_KELAMIN}
                  />
                  <FormField
                    label="Tempat Lahir"
                    name="tempat_lahir"
                    value={anggota.tempat_lahir}
                    onChange={(e) => handleAnggotaChange(index, e)}
                  />
                  <FormField
                    label="Tanggal Lahir"
                    name="tanggal_lahir"
                    value={anggota.tanggal_lahir}
                    onChange={(e) => handleAnggotaChange(index, e)}
                  />
                  <FormField
                    label="Agama"
                    name="agama"
                    value={anggota.agama}
                    onChange={(e) => handleAnggotaChange(index, e)}
                    as="select"
                    options={AGAMA}
                  />
                  <FormField
                    label="Pendidikan"
                    name="pendidikan"
                    value={anggota.pendidikan}
                    onChange={(e) => handleAnggotaChange(index, e)}
                  />
                  <FormField
                    label="Jenis Pekerjaan"
                    name="jenis_pekerjaan"
                    value={anggota.jenis_pekerjaan}
                    onChange={(e) => handleAnggotaChange(index, e)}
                  />
                  <FormField
                    label="Golongan Darah"
                    name="golongan_darah"
                    value={anggota.golongan_darah}
                    onChange={(e) => handleAnggotaChange(index, e)}
                    as="select"
                    options={GOLONGAN_DARAH}
                  />
                  <FormField
                    label="Status Perkawinan"
                    name="status_perkawinan"
                    value={anggota.status_perkawinan}
                    onChange={(e) => handleAnggotaChange(index, e)}
                    as="select"
                    options={STATUS_KAWIN}
                  />
                  <FormField
                    label="Tanggal Perkawinan"
                    name="tanggal_perkawinan"
                    value={anggota.tanggal_perkawinan}
                    onChange={(e) => handleAnggotaChange(index, e)}
                  />
                  <FormField
                    label="Status Hubungan"
                    name="status_hubungan"
                    value={anggota.status_hubungan}
                    onChange={(e) => handleAnggotaChange(index, e)}
                    as="select"
                    options={STATUS_HUBUNGAN}
                  />
                  <FormField
                    label="Kewarganegaraan"
                    name="kewarganegaraan"
                    value={anggota.kewarganegaraan}
                    onChange={(e) => handleAnggotaChange(index, e)}
                    as="select"
                    options={KEWARGANEGARAAN}
                  />
                  <FormField label="No. Paspor" name="no_paspor" value={anggota.no_paspor} onChange={(e) => handleAnggotaChange(index, e)} />
                  <FormField label="No. KITAP" name="no_kitap" value={anggota.no_kitap} onChange={(e) => handleAnggotaChange(index, e)} />
                  <FormField label="Nama Ayah" name="nama_ayah" value={anggota.nama_ayah} onChange={(e) => handleAnggotaChange(index, e)} />
                  <FormField label="Nama Ibu" name="nama_ibu" value={anggota.nama_ibu} onChange={(e) => handleAnggotaChange(index, e)} />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Raw OCR Text */}
      {rawText && (
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-5">
          <button
            onClick={() => setShowRaw(!showRaw)}
            className="w-full px-5 py-4 flex items-center justify-between text-left"
          >
            <span className="font-semibold text-gray-800 text-sm">
              Teks OCR Mentah
            </span>
            <span className="text-gray-400 text-sm">{showRaw ? "▲" : "▼"}</span>
          </button>
          {showRaw && (
            <div className="px-5 pb-5">
              <pre className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-4 whitespace-pre-wrap font-mono max-h-60 overflow-y-auto">
                {rawText}
              </pre>
            </div>
          )}
        </section>
      )}

      {/* Actions */}
      <div className="flex gap-3 justify-end pb-8">
        <button
          onClick={() => router.push("/upload")}
          className="px-5 py-2.5 text-sm border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition"
        >
          Kembali
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 text-sm bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {saving ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
              Menyimpan...
            </>
          ) : (
            "Simpan ke Database"
          )}
        </button>
      </div>
    </div>
  );
}
