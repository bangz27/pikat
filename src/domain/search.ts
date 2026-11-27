import type { AddressPoint } from './types';
import { normalizeText } from './normalize';
import { formatAddress } from './labels';

export const SEARCH_FIELDS = ['all', 'house_no', 'street', 'soi', 'village', 'landmark'] as const;
export type SearchField = (typeof SEARCH_FIELDS)[number];

export const SEARCH_FIELD_LABEL: Record<SearchField, string> = {
  all: 'ทุกช่อง',
  house_no: 'บ้านเลขที่',
  street: 'ถนน',
  soi: 'ซอย',
  village: 'หมู่บ้าน',
  landmark: 'จุดสังเกต',
};

const ALL_FIELDS = ['house_no', 'street', 'soi', 'village', 'landmark', 'subdistrict', 'district', 'province', 'postal_code'] as const;

export interface SearchResult {
  point: AddressPoint;
  score: number;
  matchedField: string;
}

/**
 * Filter saved records by a free-text query. Scores: exact field match 3,
 * prefix 2, substring 1. Every whitespace-separated term must match some field.
 */
export function searchAddressPoints(points: AddressPoint[], query: string, field: SearchField = 'all', limit = 50): SearchResult[] {
  const terms = query.split(/\s+/u).map(normalizeText).filter(Boolean);
  if (terms.length === 0) return [];
  const fields = field === 'all' ? ALL_FIELDS : ([field] as const);
  const results: SearchResult[] = [];

  for (const point of points) {
    let total = 0;
    let matchedField = '';
    let allMatched = true;
    for (const term of terms) {
      let best = 0;
      for (const f of fields) {
        const v = normalizeText(point[f]);
        if (!v) continue;
        const s = v === term ? 3 : v.startsWith(term) ? 2 : v.includes(term) ? 1 : 0;
        if (s > best) {
          best = s;
          if (!matchedField) matchedField = f;
        }
      }
      // In "all" mode also allow a term to match the combined label (e.g. "12/3สุขุมวิท").
      if (best === 0 && field === 'all' && normalizeText(formatAddress(point)).includes(term)) best = 1;
      if (best === 0) {
        allMatched = false;
        break;
      }
      total += best;
    }
    if (allMatched) results.push({ point, score: total, matchedField: matchedField || 'all' });
  }

  return results
    .sort((a, b) => b.score - a.score || a.point.house_no.localeCompare(b.point.house_no, 'th'))
    .slice(0, limit);
}
