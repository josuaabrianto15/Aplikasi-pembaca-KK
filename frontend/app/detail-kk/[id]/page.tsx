import { Suspense } from "react";
import DetailKKClient from "./DetailKKClient";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function DetailKKPage() {
  return (
    <Suspense fallback={<LoadingSpinner text="Memuat detail KK..." />}>
      <DetailKKClient />
    </Suspense>
  );
}
