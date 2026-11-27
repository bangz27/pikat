import type { AddressFields, VerificationStatus } from './types';

export const STATUS_LABEL: Record<VerificationStatus, string> = {
  unverified: 'ยังไม่ยืนยัน',
  verified: 'ยืนยันแล้ว',
  needs_review: 'ต้องตรวจสอบ',
};

export const FIELD_LABEL: Record<keyof AddressFields | 'latitude' | 'longitude' | 'verification_status', string> = {
  house_no: 'บ้านเลขที่',
  village: 'หมู่บ้าน / หมู่',
  soi: 'ซอย',
  street: 'ถนน',
  subdistrict: 'ตำบล / แขวง',
  district: 'อำเภอ / เขต',
  province: 'จังหวัด',
  postal_code: 'รหัสไปรษณีย์',
  landmark: 'จุดสังเกต',
  notes: 'หมายเหตุตำแหน่ง',
  source: 'แหล่งข้อมูล',
  latitude: 'ละติจูด',
  longitude: 'ลองจิจูด',
  verification_status: 'สถานะการยืนยัน',
};

/** Human-readable one-line address label. */
export function formatAddress(a: Partial<AddressFields>): string {
  const parts: string[] = [];
  if (a.house_no) parts.push(a.house_no);
  if (a.village) parts.push(`หมู่บ้าน/หมู่ ${a.village}`);
  if (a.soi) parts.push(`ซ.${a.soi}`);
  if (a.street) parts.push(`ถ.${a.street}`);
  if (a.subdistrict) parts.push(a.subdistrict);
  if (a.district) parts.push(a.district);
  if (a.province) parts.push(a.province);
  if (a.postal_code) parts.push(a.postal_code);
  return parts.join(' ') || (a.landmark ?? '');
}
