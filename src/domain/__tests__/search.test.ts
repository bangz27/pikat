import { describe, expect, it } from 'vitest';
import { searchAddressPoints } from '../search';
import { normalizeText } from '../normalize';
import type { AddressPoint } from '../types';

function pt(id: string, over: Partial<AddressPoint>): AddressPoint {
  return {
    id, house_no: '1', village: null, soi: null, street: null, subdistrict: null, district: null, province: null,
    postal_code: null, landmark: null, notes: null, source: 'test', verification_status: 'unverified',
    latitude: 13.7, longitude: 100.5, created_at: '', updated_at: '', verified_at: null, ...over,
  };
}

const points = [
  pt('a', { house_no: '12/3', soi: 'สุขุมวิท 21', street: 'สุขุมวิท' }),
  pt('b', { house_no: '45', village: 'หมู่บ้านสวนสน', landmark: 'ร้านกาแฟหน้าปากซอย' }),
  pt('c', { house_no: '123', street: 'พหลโยธิน', province: 'กรุงเทพมหานคร' }),
];

describe('normalizeText', () => {
  it('drops Thai prefixes and whitespace', () => {
    expect(normalizeText('ซ. สุขุมวิท 21')).toBe('สุขุมวิท21');
    expect(normalizeText('ถนนพหลโยธิน')).toBe('พหลโยธิน');
    expect(normalizeText(null)).toBe('');
  });
});

describe('searchAddressPoints', () => {
  it('returns nothing for an empty query', () => {
    expect(searchAddressPoints(points, '   ')).toEqual([]);
  });
  it('finds by house number with exact match ranked first', () => {
    const r = searchAddressPoints(points, '12');
    expect(r.map((x) => x.point.id)).toEqual(['a', 'c']);
    expect(searchAddressPoints(points, '123')[0].point.id).toBe('c');
  });
  it('filters by a specific field', () => {
    expect(searchAddressPoints(points, 'สุขุมวิท', 'soi').map((x) => x.point.id)).toEqual(['a']);
    expect(searchAddressPoints(points, 'สุขุมวิท', 'landmark')).toEqual([]);
  });
  it('searches landmarks and villages', () => {
    expect(searchAddressPoints(points, 'กาแฟ', 'landmark')[0].point.id).toBe('b');
    expect(searchAddressPoints(points, 'สวนสน', 'village')[0].point.id).toBe('b');
  });
  it('ignores soi/street prefixes in the query', () => {
    expect(searchAddressPoints(points, 'ซ.สุขุมวิท 21').map((x) => x.point.id)).toContain('a');
    expect(searchAddressPoints(points, 'ถ.พหลโยธิน')[0].point.id).toBe('c');
  });
  it('requires every term to match', () => {
    expect(searchAddressPoints(points, '45 สวนสน').map((x) => x.point.id)).toEqual(['b']);
    expect(searchAddressPoints(points, '45 พหลโยธิน')).toEqual([]);
  });
});

describe('house number normalisation', () => {
  it('keeps 12/3 distinct from 123', () => {
    expect(normalizeText('12/3')).not.toBe(normalizeText('123'));
  });
});
