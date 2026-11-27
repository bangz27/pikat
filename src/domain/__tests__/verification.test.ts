import { describe, expect, it } from 'vitest';
import { applyVerification } from '../verification';
import { layerOf, visiblePoints, DEFAULT_LAYER_VISIBILITY, toGeoJSON } from '../layers';
import type { AddressPoint } from '../types';

const p: AddressPoint = {
  id: '1', house_no: '1', village: null, soi: null, street: null, subdistrict: null, district: null, province: null,
  postal_code: null, landmark: null, notes: null, source: null, verification_status: 'unverified',
  latitude: 13, longitude: 100, created_at: '', updated_at: '', verified_at: null,
};
const now = new Date('2026-11-27T10:00:00Z');

describe('verification status', () => {
  it('sets verified_at when verifying', () => {
    expect(applyVerification(p, 'verified', now)).toEqual({ verification_status: 'verified', verified_at: now.toISOString() });
  });
  it('keeps the original timestamp when already verified', () => {
    const v = { ...p, verification_status: 'verified' as const, verified_at: '2026-01-01T00:00:00.000Z' };
    expect(applyVerification(v, 'verified', now).verified_at).toBe('2026-01-01T00:00:00.000Z');
  });
  it('clears verified_at for needs_review / unverified', () => {
    const v = { ...p, verification_status: 'verified' as const, verified_at: 'x' };
    expect(applyVerification(v, 'needs_review', now)).toEqual({ verification_status: 'needs_review', verified_at: null });
  });
});

describe('layers', () => {
  const pts: AddressPoint[] = [
    { ...p, id: 'v', verification_status: 'verified', landmark: 'วัด' },
    { ...p, id: 'l', landmark: 'วัด' },
    { ...p, id: 's' },
  ];
  it('assigns each point to exactly one layer', () => {
    expect(pts.map(layerOf)).toEqual(['verified', 'landmarks', 'saved']);
  });
  it('toggles visibility per layer', () => {
    expect(visiblePoints(pts, { ...DEFAULT_LAYER_VISIBILITY, verified: false }).map((x) => x.id)).toEqual(['l', 's']);
    expect(visiblePoints(pts, { ...DEFAULT_LAYER_VISIBILITY, saved: false, landmarks: false }).map((x) => x.id)).toEqual(['v']);
  });
  it('exports GeoJSON with [lng, lat] order', () => {
    expect(toGeoJSON(pts).features[0].geometry.coordinates).toEqual([100, 13]);
  });
});
