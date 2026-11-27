import type { AddressPointInput, LatLng } from './types';
import { OPTIONAL_TEXT_FIELDS, VERIFICATION_STATUSES } from './types';

/** Rough bounding box of Thailand, used only for warnings (not hard errors). */
export const THAILAND_BOUNDS = { minLat: 5.5, maxLat: 20.6, minLng: 97.3, maxLng: 105.7 } as const;

export type FieldErrors = Partial<Record<keyof AddressPointInput, string>>;

/** Parse a user-entered coordinate string. Returns null when it is not a finite number. */
export function parseCoordinate(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed === '' || !/^[-+]?\d+(\.\d+)?$/.test(trimmed)) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

export function validateLatitude(lat: number | null): string | null {
  if (lat === null) return 'ละติจูดต้องเป็นตัวเลข';
  if (lat < -90 || lat > 90) return 'ละติจูดต้องอยู่ระหว่าง -90 ถึง 90';
  return null;
}

export function validateLongitude(lng: number | null): string | null {
  if (lng === null) return 'ลองจิจูดต้องเป็นตัวเลข';
  if (lng < -180 || lng > 180) return 'ลองจิจูดต้องอยู่ระหว่าง -180 ถึง 180';
  return null;
}

/** Validates a lat/lng pair. (0,0) is rejected because it is almost always a missing value. */
export function validateCoordinates(lat: number | null, lng: number | null): { latitude?: string; longitude?: string } {
  const errors: { latitude?: string; longitude?: string } = {};
  const latErr = validateLatitude(lat);
  const lngErr = validateLongitude(lng);
  if (latErr) errors.latitude = latErr;
  if (lngErr) errors.longitude = lngErr;
  if (!latErr && !lngErr && lat === 0 && lng === 0) {
    errors.latitude = 'พิกัด 0,0 ไม่ถูกต้อง (มักเกิดจากข้อมูลว่าง)';
  }
  return errors;
}

export function isInThailand(p: LatLng): boolean {
  const b = THAILAND_BOUNDS;
  return p.lat >= b.minLat && p.lat <= b.maxLat && p.lng >= b.minLng && p.lng <= b.maxLng;
}

export function validatePostalCode(code: string | null): string | null {
  if (!code) return null;
  return /^\d{5}$/.test(code) ? null : 'รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก';
}

const MAX_TEXT = 500;

/** Full validation of an address record before it is saved. */
export function validateAddressInput(input: AddressPointInput): FieldErrors {
  const errors: FieldErrors = {};
  if (!input.house_no || input.house_no.trim() === '') errors.house_no = 'กรุณากรอกบ้านเลขที่';
  else if (input.house_no.length > 50) errors.house_no = 'บ้านเลขที่ยาวเกินไป';

  Object.assign(errors, validateCoordinates(input.latitude, input.longitude));

  const postal = validatePostalCode(input.postal_code);
  if (postal) errors.postal_code = postal;

  for (const f of OPTIONAL_TEXT_FIELDS) {
    const v = input[f];
    if (v && v.length > MAX_TEXT) errors[f] = `ข้อความยาวเกิน ${MAX_TEXT} ตัวอักษร`;
  }

  if (!VERIFICATION_STATUSES.includes(input.verification_status)) {
    errors.verification_status = 'สถานะไม่ถูกต้อง';
  }
  return errors;
}

/** Trim strings and turn empty optional fields into null. */
export function normalizeInput(input: AddressPointInput): AddressPointInput {
  const out = { ...input, house_no: input.house_no.trim() };
  for (const f of OPTIONAL_TEXT_FIELDS) {
    const v = input[f];
    out[f] = v && v.trim() !== '' ? v.trim() : null;
  }
  return out;
}
