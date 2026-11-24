import Link from "next/link";

export default function HomePage() {
  return (
    <div className="max-w-3xl mx-auto">
      {/* Hero */}
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-2xl mb-6">
          <span className="text-4xl">🪪</span>
        </div>
        <h1 className="text-4xl font-bold text-gray-800 mb-3">
          Pembaca Kartu Keluarga
        </h1>
        <p className="text-gray-500 text-lg max-w-xl mx-auto">
          Unggah foto KK, biarkan sistem membaca datanya otomatis, lalu simpan ke
          database — semuanya berjalan di komputer Anda sendiri.
        </p>
        <div className="flex gap-4 justify-center mt-8">
          <Link
            href="/upload"
            className="px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition shadow-sm"
          >
            Upload KK
          </Link>
          <Link
            href="/daftar-kk"
            className="px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-xl font-semibold hover:bg-gray-50 transition shadow-sm"
          >
            Lihat Daftar KK
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-6">
        {[
          {
            icon: "📷",
            title: "Scan Otomatis",
            desc: "Tesseract OCR membaca teks dari gambar KK JPG / PNG secara lokal.",
          },
          {
            icon: "✏️",
            title: "Edit Sebelum Simpan",
            desc: "Koreksi hasil pembacaan sebelum data masuk ke database.",
          },
          {
            icon: "🗄️",
            title: "Database Lokal",
            desc: "Data tersimpan ke SQLite di komputer Anda, tanpa cloud.",
          },
        ].map((f) => (
          <div
            key={f.title}
            className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm"
          >
            <div className="text-3xl mb-3">{f.icon}</div>
            <h3 className="font-semibold text-gray-800 mb-1">{f.title}</h3>
            <p className="text-sm text-gray-500">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* API Info */}
      <div className="mt-8 bg-gray-800 rounded-xl p-5 text-sm font-mono text-green-300">
        <p className="text-gray-400 mb-2 font-sans font-semibold text-xs uppercase tracking-wider">
          Backend
        </p>
        <p>
          <span className="text-gray-400">URL:</span>{" "}
          {process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:5000"}
        </p>
        <p className="mt-1">
          <span className="text-gray-400">Health:</span>{" "}
          <a
            href={`${process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:5000"}/api/health`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            /api/health
          </a>
        </p>
      </div>
    </div>
  );
}
