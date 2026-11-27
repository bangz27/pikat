import type { AddressPoint, AddressPointInput, VerificationStatus } from '../domain/types';
import { applyVerification } from '../domain/verification';
import type { AddressRepository, BoundingBox } from './repository';
import { RepositoryError } from './repository';

export const LOCAL_STORAGE_KEY = 'pikat.address_points.v1';

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Browser-local fallback used when Supabase is not configured.
 * Data lives only in this browser (localStorage) — clearly labelled in the UI.
 */
export class LocalAddressRepository implements AddressRepository {
  readonly kind = 'local' as const;
  readonly label = 'Local (เก็บในเบราว์เซอร์นี้เท่านั้น)';
  private memory: AddressPoint[] | null = null;

  constructor(private storage: Storage | null = typeof localStorage !== 'undefined' ? localStorage : null) {}

  private read(): AddressPoint[] {
    if (this.memory) return this.memory;
    try {
      const raw = this.storage?.getItem(LOCAL_STORAGE_KEY);
      this.memory = raw ? (JSON.parse(raw) as AddressPoint[]) : [];
    } catch {
      this.memory = [];
    }
    return this.memory;
  }

  private write(points: AddressPoint[]) {
    this.memory = points;
    try {
      this.storage?.setItem(LOCAL_STORAGE_KEY, JSON.stringify(points));
    } catch {
      // Storage full/blocked: keep in memory for this session.
    }
  }

  async list() {
    return [...this.read()];
  }

  async listInBounds(b: BoundingBox) {
    return this.read().filter((p) => p.latitude >= b.south && p.latitude <= b.north && p.longitude >= b.west && p.longitude <= b.east);
  }

  async create(input: AddressPointInput) {
    const [created] = await this.createMany([input]);
    return created;
  }

  async createMany(inputs: AddressPointInput[]) {
    const now = new Date().toISOString();
    const created = inputs.map<AddressPoint>((input) => ({
      ...input,
      id: newId(),
      created_at: now,
      updated_at: now,
      verified_at: input.verification_status === 'verified' ? now : null,
    }));
    this.write([...this.read(), ...created]);
    return created;
  }

  async update(id: string, input: AddressPointInput) {
    const points = this.read();
    const existing = points.find((p) => p.id === id);
    if (!existing) throw new RepositoryError('ไม่พบรายการที่ต้องการแก้ไข');
    const now = new Date();
    const updated: AddressPoint = {
      ...existing,
      ...input,
      ...applyVerification(existing, input.verification_status, now),
      updated_at: now.toISOString(),
    };
    this.write(points.map((p) => (p.id === id ? updated : p)));
    return updated;
  }

  async setVerification(id: string, status: VerificationStatus) {
    const existing = this.read().find((p) => p.id === id);
    if (!existing) throw new RepositoryError('ไม่พบรายการ');
    return this.update(id, { ...existing, verification_status: status });
  }

  async remove(id: string) {
    this.write(this.read().filter((p) => p.id !== id));
  }
}
