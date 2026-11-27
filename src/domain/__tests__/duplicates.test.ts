import { describe, expect, it } from 'vitest';
import { addressKey, isDuplicate } from '../duplicates';

const a = { house_no: '12/3', village: null, soi: 'สุขุมวิท 21', street: 'สุขุมวิท', subdistrict: null, district: null, province: 'กรุงเทพมหานคร', latitude: 13.7400, longitude: 100.5600 };

describe('duplicate handling', () => {
  it('same normalised address is a duplicate even at other coordinates', () => {
    const b = { ...a, soi: 'ซ.สุขุมวิท21', latitude: 13.9, longitude: 100.9 };
    expect(addressKey(a)).toBe(addressKey(b));
    expect(isDuplicate(a, b)).toBe(true);
  });
  it('same house number within 15 m is a duplicate', () => {
    const b = { ...a, soi: null, street: null, latitude: 13.74005, longitude: 100.56005 }; // ~7.6 m
    expect(isDuplicate(a, b)).toBe(true);
  });
  it('same house number far away is not a duplicate', () => {
    const b = { ...a, soi: 'อื่น', latitude: 13.75, longitude: 100.56 };
    expect(isDuplicate(a, b)).toBe(false);
  });
  it('different house number nearby is not a duplicate', () => {
    expect(isDuplicate(a, { ...a, house_no: '12/4' })).toBe(false);
  });
});
