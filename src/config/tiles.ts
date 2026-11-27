/**
 * Basemap tile provider configuration — kept out of application code so the
 * provider can be changed via env vars. The default public OSM server is for
 * development/light use only (https://operations.osmfoundation.org/policies/tiles/).
 */
export interface TileProviderConfig {
  url: string;
  attribution: string;
  maxZoom: number;
}

export const DEFAULT_TILE_PROVIDER: TileProviderConfig = {
  url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 19,
};

export function getTileProvider(env: Record<string, string | undefined> = import.meta.env): TileProviderConfig {
  const maxZoom = Number(env.VITE_TILE_MAX_ZOOM);
  return {
    url: env.VITE_TILE_URL || DEFAULT_TILE_PROVIDER.url,
    attribution: env.VITE_TILE_ATTRIBUTION || DEFAULT_TILE_PROVIDER.attribution,
    maxZoom: Number.isFinite(maxZoom) && maxZoom > 0 ? maxZoom : DEFAULT_TILE_PROVIDER.maxZoom,
  };
}

/** Thailand overview — intentionally not a precise residential location. */
export const DEFAULT_CENTER: [number, number] = [13.0, 101.0];
export const DEFAULT_ZOOM = 6;
