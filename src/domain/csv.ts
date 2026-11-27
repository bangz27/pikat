import Papa from 'papaparse';
import type { AddressPoint, AddressPointInput } from './types';
import { OPTIONAL_TEXT_FIELDS } from './types';
import { isInThailand, parseCoordinate, validateAddressInput } from './validation';
import { findDuplicate } from './duplicates';

export const REQUIRED_COLUMNS = ['house_no', 'latitude', 'longitude'] as const;
export const OPTIONAL_COLUMNS = OPTIONAL_TEXT_FIELDS;
export const MAX_IMPORT_ROWS = 5000;

export type RowStatus = 'valid' | 'invalid' | 'duplicate';

export interface ImportRow {
  line: number; // 1-based line number in the file (header = line 1)
  raw: Record<string, string>;
  input: AddressPointInput | null;
  status: RowStatus;
  errors: string[];
  warnings: string[];
  duplicateOf?: string; // id of existing record, or "row N" for in-file duplicates
}

export interface ImportPreview {
  rows: ImportRow[];
  missingColumns: string[];
  unknownColumns: string[];
  fileErrors: string[];
  summary: { total: number; valid: number; invalid: number; duplicate: number };
}

export function parseCsvText(text: string): { headers: string[]; records: Record<string, string>[]; errors: string[] } {
  const res = Papa.parse<Record<string, string>>(text.replace(/^﻿/, ''), {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim().toLowerCase(),
    transform: (v) => (typeof v === 'string' ? v.trim() : v),
  });
  const errors = res.errors.map((e) => `บรรทัด ${(e.row ?? 0) + 2}: ${e.message}`);
  return { headers: res.meta.fields ?? [], records: res.data, errors };
}

/**
 * Build an import preview: validate each row and flag duplicates against
 * existing records and earlier rows of the same file. Imported rows are
 * always "unverified" — verification must be an explicit later action.
 */
export function buildImportPreview(text: string, existing: AddressPoint[], defaultSource = 'csv_import'): ImportPreview {
  const { headers, records, errors: parseErrors } = parseCsvText(text);
  const missingColumns = REQUIRED_COLUMNS.filter((c) => !headers.includes(c));
  const known = new Set<string>([...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS]);
  const unknownColumns = headers.filter((h) => h && !known.has(h));
  const fileErrors = [...parseErrors];

  if (missingColumns.length > 0) {
    fileErrors.unshift(`ไม่พบคอลัมน์ที่จำเป็น: ${missingColumns.join(', ')}`);
    return { rows: [], missingColumns, unknownColumns, fileErrors, summary: { total: records.length, valid: 0, invalid: records.length, duplicate: 0 } };
  }
  if (records.length > MAX_IMPORT_ROWS) {
    fileErrors.unshift(`ไฟล์มี ${records.length} แถว เกินขีดจำกัด ${MAX_IMPORT_ROWS} แถวต่อครั้ง`);
    return { rows: [], missingColumns, unknownColumns, fileErrors, summary: { total: records.length, valid: 0, invalid: records.length, duplicate: 0 } };
  }

  const accepted: (AddressPointInput & { line: number })[] = [];
  const rows: ImportRow[] = records.map((raw, i) => {
    const line = i + 2;
    const errors: string[] = [];
    const warnings: string[] = [];
    const lat = parseCoordinate(raw.latitude ?? '');
    const lng = parseCoordinate(raw.longitude ?? '');

    const input: AddressPointInput = {
      house_no: (raw.house_no ?? '').trim(),
      village: null, soi: null, street: null, subdistrict: null, district: null,
      province: null, postal_code: null, landmark: null, notes: null, source: null,
      latitude: lat ?? NaN,
      longitude: lng ?? NaN,
      verification_status: 'unverified',
    };
    for (const f of OPTIONAL_TEXT_FIELDS) {
      const v = raw[f];
      input[f] = v && v !== '' ? v : null;
    }
    if (!input.source) input.source = defaultSource;

    const fieldErrors = validateAddressInput({ ...input, latitude: lat as number, longitude: lng as number });
    if (lat === null) fieldErrors.latitude = 'ละติจูดต้องเป็นตัวเลข';
    if (lng === null) fieldErrors.longitude = 'ลองจิจูดต้องเป็นตัวเลข';
    errors.push(...Object.values(fieldErrors).filter((e): e is string => Boolean(e)));

    if (errors.length > 0) return { line, raw, input: null, status: 'invalid', errors, warnings };

    if (!isInThailand({ lat: input.latitude, lng: input.longitude })) warnings.push('พิกัดอยู่นอกประเทศไทย');

    const dbDup = findDuplicate(input, existing);
    if (dbDup) return { line, raw, input, status: 'duplicate', errors, warnings, duplicateOf: dbDup.id };
    const fileDup = findDuplicate(input, accepted);
    if (fileDup) return { line, raw, input, status: 'duplicate', errors, warnings, duplicateOf: `row ${fileDup.line}` };

    accepted.push({ ...input, line });
    return { line, raw, input, status: 'valid', errors, warnings };
  });

  const summary = {
    total: rows.length,
    valid: rows.filter((r) => r.status === 'valid').length,
    invalid: rows.filter((r) => r.status === 'invalid').length,
    duplicate: rows.filter((r) => r.status === 'duplicate').length,
  };
  return { rows, missingColumns, unknownColumns, fileErrors, summary };
}

/** Rows to save. Duplicates are skipped unless the user explicitly opts in to save them as new records. */
export function rowsToImport(preview: ImportPreview, includeDuplicates = false): AddressPointInput[] {
  return preview.rows
    .filter((r) => r.status === 'valid' || (includeDuplicates && r.status === 'duplicate'))
    .map((r) => ({ ...(r.input as AddressPointInput), verification_status: 'unverified' as const }));
}

export const CSV_TEMPLATE = `${[...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS].join(',')}\n`;
