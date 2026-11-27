import type { AddressFields, AddressPointInput, LatLng } from './types';
import { normalizeText } from './normalize';
import { distanceMeters } from './geo';

/** Two records within this distance and with the same house number are treated as duplicates. */
export const DUPLICATE_RADIUS_METERS = 15;

/** Canonical key built from the address text (not coordinates). */
export function addressKey(a: Pick<AddressFields, 'house_no' | 'village' | 'soi' | 'street' | 'subdistrict' | 'district' | 'province'>): string {
  return [a.house_no, a.village, a.soi, a.street, a.subdistrict, a.district, a.province].map(normalizeText).join('|');
}

type Comparable = Pick<AddressPointInput, 'house_no' | 'village' | 'soi' | 'street' | 'subdistrict' | 'district' | 'province' | 'latitude' | 'longitude'>;

/**
 * Duplicate rule (documented in README):
 *  1. Same normalised address key (house no + village + soi + street + subdistrict + district + province), OR
 *  2. Same normalised house number AND within DUPLICATE_RADIUS_METERS.
 */
export function isDuplicate(a: Comparable, b: Comparable): boolean {
  if (addressKey(a) === addressKey(b)) return true;
  if (normalizeText(a.house_no) !== normalizeText(b.house_no)) return false;
  const pa: LatLng = { lat: a.latitude, lng: a.longitude };
  const pb: LatLng = { lat: b.latitude, lng: b.longitude };
  return distanceMeters(pa, pb) <= DUPLICATE_RADIUS_METERS;
}

export function findDuplicate<T extends Comparable>(candidate: Comparable, existing: T[]): T | undefined {
  return existing.find((e) => isDuplicate(candidate, e));
}
