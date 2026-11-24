export interface IdentitasKK {
  id?: number;
  nomor_kk: string;
  nama_kepala_keluarga: string;
  alamat: string;
  rt_rw: string;
  kode_pos: string;
  desa_kelurahan: string;
  kecamatan: string;
  kabupaten_kota: string;
  provinsi: string;
  dikeluarkan_tanggal: string;
  created_at?: string;
}

export interface AnggotaKeluarga {
  id?: number;
  kk_id?: number;
  no_urut?: number;
  nik: string;
  nama_lengkap: string;
  jenis_kelamin: string;
  tempat_lahir: string;
  tanggal_lahir: string;
  agama: string;
  pendidikan: string;
  jenis_pekerjaan: string;
  golongan_darah: string;
  status_perkawinan: string;
  tanggal_perkawinan: string;
  status_hubungan: string;
  kewarganegaraan: string;
  no_paspor: string;
  no_kitap: string;
  nama_ayah: string;
  nama_ibu: string;
}

export interface ScanResult {
  identitas: IdentitasKK;
  anggota: AnggotaKeluarga[];
  raw_text?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string>;
}

export interface KKListItem {
  id: number;
  nomor_kk: string;
  nama_kepala_keluarga: string;
  alamat: string;
  kecamatan: string;
  kabupaten_kota: string;
  provinsi: string;
  created_at: string;
}

export interface KKDetail {
  kk: IdentitasKK;
  anggota: AnggotaKeluarga[];
}
