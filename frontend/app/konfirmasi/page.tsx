import { Suspense } from "react";
import KonfirmasiClient from "./KonfirmasiClient";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function KonfirmasiPage() {
  return (
    <Suspense fallback={<LoadingSpinner text="Memuat halaman konfirmasi..." />}>
      <KonfirmasiClient />
    </Suspense>
  );
}
