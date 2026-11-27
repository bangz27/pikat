import type { AddressPoint, AddressPointInput, VerificationStatus } from '../domain/types';

export interface BoundingBox {
  west: number;
  south: number;
  east: number;
  north: number;
}

/**
 * Storage abstraction. The UI talks only to this interface so the backend
 * (Supabase/PostGIS today, other providers later) can be swapped.
 */
export interface AddressRepository {
  readonly kind: 'supabase' | 'local';
  readonly label: string;
  list(): Promise<AddressPoint[]>;
  /** Viewport loading. Supabase uses the PostGIS RPC; local filters in memory. */
  listInBounds(bbox: BoundingBox): Promise<AddressPoint[]>;
  create(input: AddressPointInput): Promise<AddressPoint>;
  createMany(inputs: AddressPointInput[]): Promise<AddressPoint[]>;
  update(id: string, input: AddressPointInput): Promise<AddressPoint>;
  setVerification(id: string, status: VerificationStatus): Promise<AddressPoint>;
  remove(id: string): Promise<void>;
}

export class RepositoryError extends Error {}
