export const VERIFICATION_STATUSES = ['unverified', 'verified', 'needs_review'] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

/** Address fields that describe a place. No personal data (names, phones, tracking numbers) by design. */
export interface AddressFields {
  house_no: string;
  village: string | null;
  soi: string | null;
  street: string | null;
  subdistrict: string | null;
  district: string | null;
  province: string | null;
  postal_code: string | null;
  landmark: string | null;
  notes: string | null;
  source: string | null;
}

export interface AddressPointInput extends AddressFields {
  latitude: number;
  longitude: number;
  verification_status: VerificationStatus;
}

export interface AddressPoint extends AddressPointInput {
  id: string;
  created_at: string;
  updated_at: string;
  verified_at: string | null;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export const OPTIONAL_TEXT_FIELDS = [
  'village',
  'soi',
  'street',
  'subdistrict',
  'district',
  'province',
  'postal_code',
  'landmark',
  'notes',
  'source',
] as const satisfies readonly (keyof AddressFields)[];
