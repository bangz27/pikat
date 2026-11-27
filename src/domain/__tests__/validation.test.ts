import { describe, expect, it } from 'vitest';
import { isInThailand, normalizeInput, parseCoordinate, validateAddressInput, validateCoordinates, validatePostalCode } from '../validation';
import type { AddressPointInput } from '../types';

const base: AddressPointInput = {
  house_no: '99/1', village: null, soi: null, street: null, subdistrict: null, district: null, province: null,
  postal_code: null, landmark: null, notes: null, source: null, latitude: 13.75, longitude: 100.5, verification_status: 'unverified',
};

describe('coordinate validation', () => {
  it('parses numeric strings and rejects junk', () => {
    expect(parseCoordinate('13.756331')).toBe(13.756331);
    expect(parseCoordinate(' -1.5 ')).toBe(-1.5);
    expect(parseCoordinate('')).toBeNull();
    expect(parseCoordinate('13,7')).toBeNull();
    expect(parseCoordinate('abc')).toBeNull();
    expect(parseCoordinate('1e3')).toBeNull();
    expect(parseCoordinate(Number.NaN)).toBeNull();
  });
  it('enforces ranges', () => {
    expect(validateCoordinates(13.7, 100.5)).toEqual({});
    expect(validateCoordinates(91, 100).latitude).toBeDefined();
    expect(validateCoordinates(13, 181).longitude).toBeDefined();
    expect(validateCoordinates(null, null)).toHaveProperty('latitude');
  });
  it('rejects 0,0 (null island)', () => {
    expect(validateCoordinates(0, 0).latitude).toMatch(/0,0/);
  });
  it('detects points inside Thailand', () => {
    expect(isInThailand({ lat: 13.75, lng: 100.5 })).toBe(true);
    expect(isInThailand({ lat: 35.68, lng: 139.76 })).toBe(false);
  });
});

describe('address validation', () => {
  it('accepts a minimal valid record', () => {
    expect(validateAddressInput(base)).toEqual({});
  });
  it('requires house number', () => {
    expect(validateAddressInput({ ...base, house_no: '  ' }).house_no).toBeDefined();
  });
  it('validates postal code format', () => {
    expect(validatePostalCode('10110')).toBeNull();
    expect(validatePostalCode('1011')).not.toBeNull();
    expect(validateAddressInput({ ...base, postal_code: 'abcde' }).postal_code).toBeDefined();
  });
  it('rejects unknown verification status', () => {
    expect(validateAddressInput({ ...base, verification_status: 'approved' as never }).verification_status).toBeDefined();
  });
  it('normalizes blanks to null and trims', () => {
    const n = normalizeInput({ ...base, house_no: ' 5 ', soi: '  ', street: ' สุขุมวิท ' });
    expect(n.house_no).toBe('5');
    expect(n.soi).toBeNull();
    expect(n.street).toBe('สุขุมวิท');
  });
});
