"use client";

import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Alert from "@/components/Alert";
import LoadingSpinner from "@/components/LoadingSpinner";
import { scanKK } from "@/lib/api";

const ACCEPTED = ["image/jpeg", "image/jpg", "image/png"];
const MAX_SIZE = 10 * 1024 * 1024;

export default function UploadPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFileSelect(selected: File | null) {
    setError(null);
    if (!selected) return;

    if (!ACCEPTED.includes(selected.type)) {
      setError("Format file tidak didukung. Gunakan JPG, JPEG, atau PNG.");
      return;
    }
    if (selected.size > MAX_SIZE) {
      setError("Ukuran file terlalu besar. Maksimum 10 MB.");
      return;
    }

    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    handleFileSelect(dropped ?? null);
  }

  async function handleScan() {
    if (!file) return;
    setLoading(true);
    setError(null);

    try {
      const res = await scanKK(file);
      if (!res.success || !res.data?.scan_id) {
        setError(res.message || "Gagal memproses gambar.");
        return;
      }
      router.push(`/konfirmasi?scan_id=${res.data.scan_id}`);
    } catch {
      setError("Tidak dapat menghubungi server backend. Pastikan backend sudah berjalan di http://127.0.0.1:5000");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setFile(null);
    setPreview(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Upload Kartu Keluarga</h1>
        <p className="text-gray-500 text-sm mt-1">
          Unggah foto KK dalam format JPG, JPEG, atau PNG untuk dibaca otomatis.
        </p>
      </div>

      {error && (
        <div className="mb-4">
          <Alert variant="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        </div>
      )}

      {/* Drop zone */}
      {!file ? (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-2xl bg-white hover:border-green-400 hover:bg-green-50 transition cursor-pointer p-12 text-center"
        >
          <div className="text-5xl mb-4">📁</div>
          <p className="text-gray-600 font-medium">
            Klik atau seret gambar KK ke sini
          </p>
          <p className="text-gray-400 text-sm mt-1">
            JPG, JPEG, PNG · Maks. 10 MB
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".jpg,.jpeg,.png"
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
          />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Preview */}
          <div className="relative bg-gray-100 flex items-center justify-center min-h-64 max-h-96 overflow-hidden">
            {preview && (
              <Image
                src={preview}
                alt="Preview KK"
                width={700}
                height={450}
                className="object-contain max-h-96 w-auto"
                unoptimized
              />
            )}
          </div>

          {/* File info */}
          <div className="p-4 border-t border-gray-100 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-700 truncate">{file.name}</p>
              <p className="text-xs text-gray-400">
                {(file.size / 1024).toFixed(0)} KB
              </p>
            </div>
            <button
              onClick={handleReset}
              className="text-sm text-red-500 hover:text-red-700 shrink-0"
            >
              Ganti File
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      {file && (
        <div className="mt-5 flex justify-end">
          <button
            onClick={handleScan}
            disabled={loading}
            className="px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                Memproses...
              </>
            ) : (
              "Mulai Scan OCR"
            )}
          </button>
        </div>
      )}

      {loading && (
        <div className="mt-4">
          <LoadingSpinner text="Sedang membaca gambar dengan Tesseract OCR..." />
        </div>
      )}

      {/* Tips */}
      <div className="mt-8 bg-green-50 border border-green-200 rounded-xl p-4">
        <p className="text-sm font-semibold text-green-800 mb-2">💡 Tips untuk hasil OCR terbaik</p>
        <ul className="text-sm text-green-700 space-y-1 list-disc list-inside">
          <li>Foto diambil tegak lurus, tidak miring</li>
          <li>Pencahayaan merata, hindari bayangan</li>
          <li>Resolusi cukup, teks terlihat jelas</li>
          <li>Hindari glare atau pantulan cahaya</li>
        </ul>
      </div>
    </div>
  );
}
