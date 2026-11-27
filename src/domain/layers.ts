import type { AddressPoint } from './types';

/**
 * Overlay layers. Each record belongs to exactly one display layer so toggles
 * are meaningful: verified → "verified"; otherwise with a landmark → "landmarks";
 * otherwise → "saved". Future layers (delivery zones, building footprints,
 * problem locations, delivery history, hub coverage) plug in here.
 */
export const OVERLAY_LAYERS = ['saved', 'landmarks', 'verified'] as const;
export type OverlayLayer = (typeof OVERLAY_LAYERS)[number];
export type LayerId = 'base' | OverlayLayer;

export const LAYER_LABEL: Record<LayerId, string> = {
  base: 'แผนที่ฐาน',
  saved: 'จุดที่อยู่ที่บันทึก',
  landmarks: 'จุดสังเกต',
  verified: 'ตำแหน่งที่ยืนยันแล้ว',
};

export type LayerVisibility = Record<LayerId, boolean>;
export const DEFAULT_LAYER_VISIBILITY: LayerVisibility = { base: true, saved: true, landmarks: true, verified: true };

export function layerOf(p: AddressPoint): OverlayLayer {
  if (p.verification_status === 'verified') return 'verified';
  if (p.landmark && p.landmark.trim() !== '') return 'landmarks';
  return 'saved';
}

export function visiblePoints(points: AddressPoint[], visibility: LayerVisibility): AddressPoint[] {
  return points.filter((p) => visibility[layerOf(p)]);
}

/** GeoJSON FeatureCollection export of points (for layers / interoperability). */
export function toGeoJSON(points: AddressPoint[]) {
  return {
    type: 'FeatureCollection' as const,
    features: points.map((p) => ({
      type: 'Feature' as const,
      id: p.id,
      geometry: { type: 'Point' as const, coordinates: [p.longitude, p.latitude] },
      properties: { ...p, layer: layerOf(p) },
    })),
  };
}
