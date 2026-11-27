import type { AddressPoint, LatLng } from '../domain/types';
import type { SearchField } from '../domain/search';
import { searchAddressPoints } from '../domain/search';
import { formatAddress } from '../domain/labels';

/**
 * Address search provider adapter. Today only our own saved records are
 * searched. Future adapters (licensed geocoders, authorised official datasets)
 * implement this interface — never scrape private/unauthorised sources, and do
 * NOT use the public Nominatim endpoint for autocomplete.
 */
export interface SearchHit {
  id: string;
  label: string;
  position: LatLng;
  source: string;
  providerId: string;
  point?: AddressPoint;
}

export interface SearchProvider {
  readonly id: string;
  readonly label: string;
  search(query: string, field: SearchField): Promise<SearchHit[]>;
}

export class SavedLocationProvider implements SearchProvider {
  readonly id = 'saved';
  readonly label = 'ตำแหน่งที่บันทึกไว้';
  constructor(private getPoints: () => AddressPoint[]) {}

  async search(query: string, field: SearchField) {
    return searchAddressPoints(this.getPoints(), query, field).map<SearchHit>(({ point }) => ({
      id: point.id,
      label: formatAddress(point),
      position: { lat: point.latitude, lng: point.longitude },
      source: point.source ?? 'ไม่ระบุ',
      providerId: this.id,
      point,
    }));
  }
}
