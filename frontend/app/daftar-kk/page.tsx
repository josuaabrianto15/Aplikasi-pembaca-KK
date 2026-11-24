"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { listKK, deleteKK } from "@/lib/api";
import type { KKListItem } from "@/types";
import Alert from "@/components/Alert";
import ConfirmDialog from "@/components/ConfirmDialog";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function DaftarKKPage() {
  const [data, setData] = useState<KKListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<KKListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listKK(debouncedSearch || undefined);
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.message || "Gagal memuat data.");
      }
    } catch {
      setError("Tidak dapat menghubungi server backend.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await deleteKK(deleteTarget.id);
      if (res.success) {
        setSuccess(`Data KK ${deleteTarget.nomor_kk} berhasil dihapus.`);
        setData((prev) => prev.filter((d) => d.id !== deleteTarget.id));
      } else {
        setError(res.message || "Gagal menghapus data.");
      }
    } catch {
      setError("Tidak dapat menghubungi server backend.");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Daftar Kartu Keluarga</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {data.length > 0 ? `${data.length} data ditemukan` : "Belum ada data"}
          </p>
        </div>
        <Link
          href="/upload"
          className="px-4 py-2.5 bg-green-600 text-white text-sm rounded-xl font-semibold hover:bg-green-700 transition text-center"
        >
          + Upload KK Baru
        </Link>
      </div>

      {error && (
        <div className="mb-4">
          <Alert variant="error" onClose={() => setError(null)}>{error}</Alert>
        </div>
      )}
      {success && (
        <div className="mb-4">
          <Alert variant="success" onClose={() => setSuccess(null)}>{success}</Alert>
        </div>
      )}

      {/* Search */}
      <div className="mb-5">
        <div className="relative max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nomor KK atau nama kepala keluarga..."
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <LoadingSpinner text="Memuat data..." />
      ) : data.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
          <div className="text-5xl mb-4">📋</div>
          <p className="text-gray-600 font-medium">Belum ada data KK</p>
          <p className="text-gray-400 text-sm mt-1">
            {search ? "Tidak ada hasil untuk pencarian ini." : "Upload KK pertama Anda sekarang."}
          </p>
          {!search && (
            <Link href="/upload" className="inline-block mt-4 px-5 py-2 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition">
              Upload KK
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Nomor KK</th>
                  <th className="px-4 py-3">Nama Kepala Keluarga</th>
                  <th className="px-4 py-3 hidden md:table-cell">Alamat</th>
                  <th className="px-4 py-3 hidden lg:table-cell">Kecamatan</th>
                  <th className="px-4 py-3">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.map((kk) => (
                  <tr key={kk.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 font-mono text-xs text-gray-700 whitespace-nowrap">
                      {kk.nomor_kk}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {kk.nama_kepala_keluarga}
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell max-w-xs truncate">
                      {kk.alamat || "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">
                      {kk.kecamatan || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Link
                          href={`/detail-kk/${kk.id}`}
                          className="px-3 py-1.5 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition font-medium"
                        >
                          Lihat Detail
                        </Link>
                        <button
                          onClick={() => setDeleteTarget(kk)}
                          className="px-3 py-1.5 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition font-medium"
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Hapus Data KK"
        message={`Anda akan menghapus KK ${deleteTarget?.nomor_kk} atas nama ${deleteTarget?.nama_kepala_keluarga}. Seluruh anggota keluarga terkait juga akan dihapus. Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel={deleting ? "Menghapus..." : "Ya, Hapus"}
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
