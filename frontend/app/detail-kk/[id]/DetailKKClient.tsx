"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { getKK, updateKK, deleteKK, createAnggota, updateAnggota, deleteAnggota } from "@/lib/api";
import type { AnggotaKeluarga, IdentitasKK } from "@/types";
import Alert from "@/components/Alert";
import ConfirmDialog from "@/components/ConfirmDialog";
import FormField from "@/components/FormField";
import LoadingSpinner from "@/components/LoadingSpinner";

const emptyAnggota = (): AnggotaKeluarga => ({
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

const JENIS_KELAMIN = [{ value: "Laki-Laki", label: "Laki-Laki" }, { value: "Perempuan", label: "Perempuan" }];
const AGAMA = [{ value: "Islam", label: "Islam" }, { value: "Kristen", label: "Kristen" }, { value: "Katolik", label: "Katolik" }, { value: "Hindu", label: "Hindu" }, { value: "Buddha", label: "Buddha" }, { value: "Konghucu", label: "Konghucu" }, { value: "Lainnya", label: "Lainnya" }];
const STATUS_KAWIN = [{ value: "Belum Kawin", label: "Belum Kawin" }, { value: "Kawin", label: "Kawin" }, { value: "Cerai Hidup", label: "Cerai Hidup" }, { value: "Cerai Mati", label: "Cerai Mati" }];
const GOLONGAN_DARAH = [{ value: "A", label: "A" }, { value: "B", label: "B" }, { value: "AB", label: "AB" }, { value: "O", label: "O" }, { value: "Tidak Diketahui", label: "Tidak Diketahui" }];
const KEWARGANEGARAAN = [{ value: "WNI", label: "WNI" }, { value: "WNA", label: "WNA" }];
const STATUS_HUBUNGAN = [{ value: "Kepala Keluarga", label: "Kepala Keluarga" }, { value: "Istri", label: "Istri" }, { value: "Anak", label: "Anak" }, { value: "Menantu", label: "Menantu" }, { value: "Cucu", label: "Cucu" }, { value: "Orang Tua", label: "Orang Tua" }, { value: "Mertua", label: "Mertua" }, { value: "Famili Lain", label: "Famili Lain" }, { value: "Pembantu", label: "Pembantu" }, { value: "Lainnya", label: "Lainnya" }];

type Mode = "view" | "editKK" | "addAnggota" | "editAnggota";

export default function DetailKKClient() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const kkId = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [identitas, setIdentitas] = useState<IdentitasKK | null>(null);
  const [anggotaList, setAnggotaList] = useState<AnggotaKeluarga[]>([]);
  const [mode, setMode] = useState<Mode>("view");
  const [editingAnggotaId, setEditingAnggotaId] = useState<number | null>(null);

  const [identitasForm, setIdentitasForm] = useState<IdentitasKK | null>(null);
  const [anggotaForm, setAnggotaForm] = useState<AnggotaKeluarga>(emptyAnggota());

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<null | "kk" | number>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getKK(kkId);
      if (res.success && res.data) {
        setIdentitas(res.data.kk);
        setAnggotaList(res.data.anggota ?? []);
      } else {
        setError(res.message || "Gagal memuat data.");
      }
    } catch {
      setError("Tidak dapat menghubungi server backend.");
    } finally {
      setLoading(false);
    }
  }, [kkId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (searchParams.get("saved") === "1") {
      setSuccess("Data KK berhasil disimpan!");
    }
  }, [searchParams]);

  // ── Edit Identitas ────────────────────────────────────────────────────────

  function startEditKK() {
    setIdentitasForm({ ...identitas! });
    setFieldErrors({});
    setMode("editKK");
  }

  function handleIdentitasChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setIdentitasForm((prev) => prev ? { ...prev, [name]: value } : prev);
    setFieldErrors((prev) => { const c = { ...prev }; delete c[name]; return c; });
  }

  async function saveIdentitas() {
    if (!identitasForm) return;
    const errors: Record<string, string> = {};
    if (!identitasForm.nomor_kk.trim()) errors.nomor_kk = "Nomor KK wajib diisi.";
    else if (identitasForm.nomor_kk.replace(/\D/g, "").length !== 16) errors.nomor_kk = "Nomor KK harus 16 digit.";
    if (!identitasForm.nama_kepala_keluarga.trim()) errors.nama_kepala_keluarga = "Nama kepala keluarga wajib diisi.";
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }

    setSaving(true);
    try {
      const res = await updateKK(kkId, identitasForm);
      if (res.success && res.data) {
        setIdentitas(res.data as IdentitasKK);
        setSuccess("Data KK berhasil diperbarui.");
        setMode("view");
      } else {
        if (res.errors) setFieldErrors(res.errors);
        setError(res.message || "Gagal memperbarui.");
      }
    } catch {
      setError("Tidak dapat menghubungi server.");
    } finally {
      setSaving(false);
    }
  }

  // ── Anggota Form ─────────────────────────────────────────────────────────

  function startAddAnggota() {
    setAnggotaForm({ ...emptyAnggota(), no_urut: anggotaList.length + 1 });
    setEditingAnggotaId(null);
    setFieldErrors({});
    setMode("addAnggota");
  }

  function startEditAnggota(a: AnggotaKeluarga) {
    setAnggotaForm({ ...a });
    setEditingAnggotaId(a.id ?? null);
    setFieldErrors({});
    setMode("editAnggota");
  }

  function handleAnggotaChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setAnggotaForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => { const c = { ...prev }; delete c[name]; return c; });
  }

  function validateAnggotaForm(): boolean {
    const errors: Record<string, string> = {};
    if (anggotaForm.nik && anggotaForm.nik.replace(/\D/g, "").length !== 16) {
      errors.nik = "NIK harus 16 digit.";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function saveAnggota() {
    if (!validateAnggotaForm()) return;
    setSaving(true);
    try {
      if (mode === "addAnggota") {
        const res = await createAnggota({ ...anggotaForm, kk_id: kkId });
        if (!res.success) {
          if (res.errors) setFieldErrors(res.errors);
          setError(res.message || "Gagal menyimpan.");
          return;
        }
        if (res.data) setAnggotaList((prev) => [...prev, res.data as AnggotaKeluarga]);
        setSuccess("Anggota keluarga berhasil ditambahkan.");
      } else if (editingAnggotaId !== null) {
        const res = await updateAnggota(editingAnggotaId, anggotaForm);
        if (!res.success) {
          if (res.errors) setFieldErrors(res.errors);
          setError(res.message || "Gagal menyimpan.");
          return;
        }
        if (res.data) {
          setAnggotaList((prev) =>
            prev.map((a) => (a.id === editingAnggotaId ? (res.data as AnggotaKeluarga) : a))
          );
        }
        setSuccess("Data anggota berhasil diperbarui.");
      }
      setMode("view");
    } catch {
      setError("Tidak dapat menghubungi server.");
    } finally {
      setSaving(false);
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async function handleDeleteKK() {
    setDeleting(true);
    try {
      const res = await deleteKK(kkId);
      if (res.success) {
        router.push("/daftar-kk");
      } else {
        setError(res.message || "Gagal menghapus.");
      }
    } catch {
      setError("Tidak dapat menghubungi server.");
    } finally {
      setDeleting(false);
      setConfirmDelete(null);
    }
  }

  async function handleDeleteAnggota(id: number) {
    setDeleting(true);
    try {
      const res = await deleteAnggota(id);
      if (res.success) {
        setAnggotaList((prev) => prev.filter((a) => a.id !== id));
        setSuccess("Anggota keluarga berhasil dihapus.");
      } else {
        setError(res.message || "Gagal menghapus.");
      }
    } catch {
      setError("Tidak dapat menghubungi server.");
    } finally {
      setDeleting(false);
      setConfirmDelete(null);
    }
  }

  if (loading) return <LoadingSpinner text="Memuat detail KK..." />;
  if (!identitas) return (
    <div className="text-center py-16">
      <p className="text-gray-500">Data tidak ditemukan.</p>
      <button onClick={() => router.push("/daftar-kk")} className="mt-4 text-green-600 underline text-sm">
        Kembali ke daftar
      </button>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-5">
        <button onClick={() => router.push("/daftar-kk")} className="hover:text-green-700">
          Daftar KK
        </button>
        <span>›</span>
        <span className="text-gray-800 font-medium">{identitas.nomor_kk}</span>
      </div>

      {error && <div className="mb-4"><Alert variant="error" onClose={() => setError(null)}>{error}</Alert></div>}
      {success && <div className="mb-4"><Alert variant="success" onClose={() => setSuccess(null)}>{success}</Alert></div>}

      {/* ── Identitas KK ──────────────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-5">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Identitas Kartu Keluarga</h2>
          {mode === "view" && (
            <div className="flex gap-2">
              <button onClick={startEditKK} className="text-sm px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition">
                Edit
              </button>
              <button onClick={() => setConfirmDelete("kk")} className="text-sm px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition">
                Hapus KK
              </button>
            </div>
          )}
        </div>

        {mode === "editKK" && identitasForm ? (
          <div className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Nomor KK" name="nomor_kk" value={identitasForm.nomor_kk} onChange={handleIdentitasChange} required hint="16 digit" error={fieldErrors.nomor_kk} />
              <FormField label="Nama Kepala Keluarga" name="nama_kepala_keluarga" value={identitasForm.nama_kepala_keluarga} onChange={handleIdentitasChange} required error={fieldErrors.nama_kepala_keluarga} />
              <div className="sm:col-span-2">
                <FormField label="Alamat" name="alamat" value={identitasForm.alamat} onChange={handleIdentitasChange} as="textarea" />
              </div>
              <FormField label="RT/RW" name="rt_rw" value={identitasForm.rt_rw} onChange={handleIdentitasChange} />
              <FormField label="Kode Pos" name="kode_pos" value={identitasForm.kode_pos} onChange={handleIdentitasChange} />
              <FormField label="Desa/Kelurahan" name="desa_kelurahan" value={identitasForm.desa_kelurahan} onChange={handleIdentitasChange} />
              <FormField label="Kecamatan" name="kecamatan" value={identitasForm.kecamatan} onChange={handleIdentitasChange} />
              <FormField label="Kabupaten/Kota" name="kabupaten_kota" value={identitasForm.kabupaten_kota} onChange={handleIdentitasChange} />
              <FormField label="Provinsi" name="provinsi" value={identitasForm.provinsi} onChange={handleIdentitasChange} />
              <FormField label="Tanggal Dikeluarkan" name="dikeluarkan_tanggal" value={identitasForm.dikeluarkan_tanggal} onChange={handleIdentitasChange} />
            </div>
            <div className="flex gap-3 justify-end mt-5">
              <button onClick={() => setMode("view")} className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                Batal
              </button>
              <button onClick={saveIdentitas} disabled={saving} className="px-5 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60 flex items-center gap-2">
                {saving && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Simpan Perubahan
              </button>
            </div>
          </div>
        ) : (
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {([
              ["Nomor KK", identitas.nomor_kk],
              ["Nama Kepala Keluarga", identitas.nama_kepala_keluarga],
              ["Alamat", identitas.alamat],
              ["RT/RW", identitas.rt_rw],
              ["Kode Pos", identitas.kode_pos],
              ["Desa/Kelurahan", identitas.desa_kelurahan],
              ["Kecamatan", identitas.kecamatan],
              ["Kabupaten/Kota", identitas.kabupaten_kota],
              ["Provinsi", identitas.provinsi],
              ["Tanggal Dikeluarkan", identitas.dikeluarkan_tanggal],
              ["Dibuat", identitas.created_at],
            ] as [string, string | undefined][]).map(([label, value]) => (
              <div key={label}>
                <p className="text-xs text-gray-400 font-semibold">{label}</p>
                <p className="text-gray-800 mt-0.5">{value || <span className="text-gray-400 italic">—</span>}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Anggota Keluarga ───────────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-5">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">
            Anggota Keluarga ({anggotaList.length} orang)
          </h2>
          {mode === "view" && (
            <button onClick={startAddAnggota} className="text-sm px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
              + Tambah
            </button>
          )}
        </div>

        {/* Add / Edit Anggota Form */}
        {(mode === "addAnggota" || mode === "editAnggota") && (
          <div className="p-5 bg-green-50 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">
              {mode === "addAnggota" ? "Tambah Anggota Baru" : "Edit Data Anggota"}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <FormField label="No. Urut" name="no_urut" value={String(anggotaForm.no_urut ?? "")} onChange={handleAnggotaChange} type="number" />
              <FormField label="NIK" name="nik" value={anggotaForm.nik} onChange={handleAnggotaChange} hint="16 digit" error={fieldErrors.nik} />
              <FormField label="Nama Lengkap" name="nama_lengkap" value={anggotaForm.nama_lengkap} onChange={handleAnggotaChange} />
              <FormField label="Jenis Kelamin" name="jenis_kelamin" value={anggotaForm.jenis_kelamin} onChange={handleAnggotaChange} as="select" options={JENIS_KELAMIN} />
              <FormField label="Tempat Lahir" name="tempat_lahir" value={anggotaForm.tempat_lahir} onChange={handleAnggotaChange} />
              <FormField label="Tanggal Lahir" name="tanggal_lahir" value={anggotaForm.tanggal_lahir} onChange={handleAnggotaChange} />
              <FormField label="Agama" name="agama" value={anggotaForm.agama} onChange={handleAnggotaChange} as="select" options={AGAMA} />
              <FormField label="Pendidikan" name="pendidikan" value={anggotaForm.pendidikan} onChange={handleAnggotaChange} />
              <FormField label="Jenis Pekerjaan" name="jenis_pekerjaan" value={anggotaForm.jenis_pekerjaan} onChange={handleAnggotaChange} />
              <FormField label="Golongan Darah" name="golongan_darah" value={anggotaForm.golongan_darah} onChange={handleAnggotaChange} as="select" options={GOLONGAN_DARAH} />
              <FormField label="Status Perkawinan" name="status_perkawinan" value={anggotaForm.status_perkawinan} onChange={handleAnggotaChange} as="select" options={STATUS_KAWIN} />
              <FormField label="Tanggal Perkawinan" name="tanggal_perkawinan" value={anggotaForm.tanggal_perkawinan} onChange={handleAnggotaChange} />
              <FormField label="Status Hubungan" name="status_hubungan" value={anggotaForm.status_hubungan} onChange={handleAnggotaChange} as="select" options={STATUS_HUBUNGAN} />
              <FormField label="Kewarganegaraan" name="kewarganegaraan" value={anggotaForm.kewarganegaraan} onChange={handleAnggotaChange} as="select" options={KEWARGANEGARAAN} />
              <FormField label="No. Paspor" name="no_paspor" value={anggotaForm.no_paspor} onChange={handleAnggotaChange} />
              <FormField label="No. KITAP" name="no_kitap" value={anggotaForm.no_kitap} onChange={handleAnggotaChange} />
              <FormField label="Nama Ayah" name="nama_ayah" value={anggotaForm.nama_ayah} onChange={handleAnggotaChange} />
              <FormField label="Nama Ibu" name="nama_ibu" value={anggotaForm.nama_ibu} onChange={handleAnggotaChange} />
            </div>
            <div className="flex gap-3 justify-end mt-5">
              <button onClick={() => setMode("view")} className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                Batal
              </button>
              <button onClick={saveAnggota} disabled={saving} className="px-5 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60 flex items-center gap-2">
                {saving && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {mode === "addAnggota" ? "Tambahkan" : "Simpan"}
              </button>
            </div>
          </div>
        )}

        {/* Anggota list */}
        {anggotaList.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">
            Belum ada anggota keluarga.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {anggotaList.map((a, idx) => (
              <div key={a.id ?? idx} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="shrink-0 w-7 h-7 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center mt-0.5">
                      {a.no_urut ?? idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-800">{a.nama_lengkap || "—"}</p>
                      <p className="text-xs text-gray-500 font-mono">{a.nik || "NIK belum diisi"}</p>
                      <div className="flex flex-wrap gap-2 mt-1.5">
                        {a.status_hubungan && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{a.status_hubungan}</span>
                        )}
                        {a.jenis_kelamin && (
                          <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{a.jenis_kelamin}</span>
                        )}
                        {a.agama && (
                          <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">{a.agama}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {mode === "view" && (
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => startEditAnggota(a)} className="text-xs px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition">
                        Edit
                      </button>
                      <button onClick={() => setConfirmDelete(a.id!)} className="text-xs px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition">
                        Hapus
                      </button>
                    </div>
                  )}
                </div>

                {/* Detail fields */}
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-2 text-xs pl-10">
                  {([
                    ["Tempat/Tgl Lahir", a.tempat_lahir && a.tanggal_lahir ? `${a.tempat_lahir}, ${a.tanggal_lahir}` : a.tempat_lahir || a.tanggal_lahir],
                    ["Pekerjaan", a.jenis_pekerjaan],
                    ["Pendidikan", a.pendidikan],
                    ["Gol. Darah", a.golongan_darah],
                    ["Status Kawin", a.status_perkawinan],
                    ["Kewarganegaraan", a.kewarganegaraan],
                    ["Nama Ayah", a.nama_ayah],
                    ["Nama Ibu", a.nama_ibu],
                  ] as [string, string | undefined][]).filter(([, v]) => v).map(([label, value]) => (
                    <div key={label}>
                      <p className="text-gray-400 font-semibold">{label}</p>
                      <p className="text-gray-700">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Confirm Dialogs */}
      <ConfirmDialog
        open={confirmDelete === "kk"}
        title="Hapus Kartu Keluarga"
        message="Seluruh data identitas dan anggota keluarga dalam KK ini akan dihapus permanen. Lanjutkan?"
        confirmLabel={deleting ? "Menghapus..." : "Ya, Hapus"}
        danger
        onConfirm={handleDeleteKK}
        onCancel={() => setConfirmDelete(null)}
      />
      <ConfirmDialog
        open={typeof confirmDelete === "number"}
        title="Hapus Anggota Keluarga"
        message="Data anggota ini akan dihapus permanen. Lanjutkan?"
        confirmLabel={deleting ? "Menghapus..." : "Ya, Hapus"}
        danger
        onConfirm={() => typeof confirmDelete === "number" && handleDeleteAnggota(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
