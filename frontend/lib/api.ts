import type {
  ApiResponse,
  IdentitasKK,
  AnggotaKeluarga,
  ScanResult,
  KKListItem,
  KKDetail,
} from "@/types";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:5000";

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  const json: ApiResponse<T> = await res.json();
  return json;
}

// ── Health ───────────────────────────────────────────────────────────────────

export async function checkHealth() {
  return request("/api/health");
}

// ── OCR ──────────────────────────────────────────────────────────────────────

export async function scanKK(file: File): Promise<ApiResponse<{ scan_id: string }>> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${BASE_URL}/api/kk/scan`, {
    method: "POST",
    body: formData,
  });
  return res.json();
}

export async function getScanResult(
  scanId: string
): Promise<ApiResponse<ScanResult>> {
  return request(`/api/kk/scan/${scanId}`);
}

// ── KK List ──────────────────────────────────────────────────────────────────

export async function listKK(
  q?: string
): Promise<ApiResponse<KKListItem[]>> {
  const params = q ? `?q=${encodeURIComponent(q)}` : "";
  return request(`/api/kk${params}`);
}

// ── KK CRUD ──────────────────────────────────────────────────────────────────

export async function createKK(payload: {
  identitas: IdentitasKK;
  anggota: AnggotaKeluarga[];
  scan_id?: string;
}): Promise<ApiResponse<{ kk: IdentitasKK }>> {
  return request("/api/kk", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getKK(id: number): Promise<ApiResponse<KKDetail>> {
  return request(`/api/kk/${id}`);
}

export async function updateKK(
  id: number,
  data: IdentitasKK
): Promise<ApiResponse<IdentitasKK>> {
  return request(`/api/kk/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteKK(id: number): Promise<ApiResponse> {
  return request(`/api/kk/${id}`, { method: "DELETE" });
}

// ── Anggota ──────────────────────────────────────────────────────────────────

export async function createAnggota(
  data: AnggotaKeluarga & { kk_id: number }
): Promise<ApiResponse<AnggotaKeluarga>> {
  return request("/api/anggota", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateAnggota(
  id: number,
  data: AnggotaKeluarga
): Promise<ApiResponse<AnggotaKeluarga>> {
  return request(`/api/anggota/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteAnggota(id: number): Promise<ApiResponse> {
  return request(`/api/anggota/${id}`, { method: "DELETE" });
}
