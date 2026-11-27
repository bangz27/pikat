import type { AddressPoint, AddressPointInput, LatLng, VerificationStatus } from './types';
import { OPTIONAL_TEXT_FIELDS } from './types';
import { roundCoord } from './geo';
import { normalizeInput, parseCoordinate, validateAddressInput, type FieldErrors } from './validation';

/** Form values are kept as strings so partially-typed coordinates are allowed while editing. */
export type AddressFormValues = Record<keyof Omit<AddressPointInput, 'verification_status'>, string> & {
  verification_status: VerificationStatus;
};

export function emptyForm(): AddressFormValues {
  return {
    house_no: '', village: '', soi: '', street: '', subdistrict: '', district: '', province: '',
    postal_code: '', landmark: '', notes: '', source: 'user_created',
    latitude: '', longitude: '', verification_status: 'unverified',
  };
}

export function formFromPoint(p: AddressPoint): AddressFormValues {
  const f = emptyForm();
  f.house_no = p.house_no;
  for (const k of OPTIONAL_TEXT_FIELDS) f[k] = p[k] ?? '';
  f.latitude = String(p.latitude);
  f.longitude = String(p.longitude);
  f.verification_status = p.verification_status;
  return f;
}

/** Map click → fill the form's coordinates (rounded to 6 decimals). */
export function applyMapClick(values: AddressFormValues, pos: LatLng): AddressFormValues {
  return { ...values, latitude: String(roundCoord(pos.lat)), longitude: String(roundCoord(pos.lng)) };
}

/** Current form coordinate if it is a valid pair, else null. */
export function formCoordinate(values: AddressFormValues): LatLng | null {
  const lat = parseCoordinate(values.latitude);
  const lng = parseCoordinate(values.longitude);
  if (lat === null || lng === null || lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

export function formToInput(values: AddressFormValues): { input: AddressPointInput | null; errors: FieldErrors } {
  const lat = parseCoordinate(values.latitude);
  const lng = parseCoordinate(values.longitude);
  const draft: AddressPointInput = {
    house_no: values.house_no,
    village: values.village, soi: values.soi, street: values.street, subdistrict: values.subdistrict,
    district: values.district, province: values.province, postal_code: values.postal_code,
    landmark: values.landmark, notes: values.notes, source: values.source,
    latitude: lat ?? NaN, longitude: lng ?? NaN,
    verification_status: values.verification_status,
  };
  const normalized = normalizeInput(draft);
  const errors = validateAddressInput(normalized);
  if (lat === null) errors.latitude = 'ละติจูดต้องเป็นตัวเลข';
  if (lng === null) errors.longitude = 'ลองจิจูดต้องเป็นตัวเลข';
  return Object.keys(errors).length ? { input: null, errors } : { input: normalized, errors };
}
