import { describe, expect, it } from 'vitest';
import { buildImportPreview, parseCsvText, rowsToImport } from '../csv';
import type { AddressPoint } from '../types';

const existing: AddressPoint[] = [{
  id: 'db-1', house_no: '10', village: null, soi: null, street: 'สีลม', subdistrict: null, district: null, province: null,
  postal_code: null, landmark: null, notes: null, source: 'x', verification_status: 'verified',
  latitude: 13.7285, longitude: 100.5340, created_at: '', updated_at: '', verified_at: '2026-01-01T00:00:00Z',
}];

const csv = `﻿House_No,latitude,longitude,street,province,postal_code,phone
1/1,13.7563,100.5018,ราชดำเนิน,กรุงเทพมหานคร,10200,
2,abc,100.5,,,,
3,95,100.5,,,,
,13.7,100.5,,,,
10,13.72851,100.53401,สีลม,,,
1/1,13.75631,100.50181,ราชดำเนิน,กรุงเทพมหานคร,,
5,35.68,139.76,,,,
6,13.8,100.6,,,1234,
`;

describe('CSV parsing', () => {
  it('normalises headers (BOM, case) and trims values', () => {
    const { headers, records } = parseCsvText(csv);
    expect(headers).toContain('house_no');
    expect(records[0].house_no).toBe('1/1');
  });

  it('flags missing required columns', () => {
    const p = buildImportPreview('house_no,lat,lng\n1,13,100\n', []);
    expect(p.missingColumns).toEqual(['latitude', 'longitude']);
    expect(p.rows).toHaveLength(0);
  });

  const p = buildImportPreview(csv, existing, 'csv:test.csv');

  it('summarises valid/invalid/duplicate rows', () => {
    expect(p.summary).toEqual({ total: 8, valid: 2, invalid: 4, duplicate: 2 });
    expect(p.unknownColumns).toEqual(['phone']);
  });

  it('marks invalid coordinates and missing house numbers invalid', () => {
    const byLine = Object.fromEntries(p.rows.map((r) => [r.line, r]));
    expect(byLine[3].status).toBe('invalid'); // abc
    expect(byLine[4].status).toBe('invalid'); // lat 95
    expect(byLine[5].status).toBe('invalid'); // no house_no
    expect(byLine[9].status).toBe('invalid'); // bad postal code
    expect(byLine[8].warnings).toContain('พิกัดอยู่นอกประเทศไทย');
  });

  it('detects duplicates against the database and within the file', () => {
    const byLine = Object.fromEntries(p.rows.map((r) => [r.line, r]));
    expect(byLine[6]).toMatchObject({ status: 'duplicate', duplicateOf: 'db-1' });
    expect(byLine[7]).toMatchObject({ status: 'duplicate', duplicateOf: 'row 2' });
  });

  it('never imports as verified and skips duplicates by default', () => {
    const rows = rowsToImport(p);
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.verification_status === 'unverified')).toBe(true);
    expect(rows[0].source).toBe('csv:test.csv');
    expect(rowsToImport(p, true)).toHaveLength(4);
  });
});
