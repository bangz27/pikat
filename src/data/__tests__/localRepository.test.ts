import { describe, expect, it } from 'vitest';
import { LocalAddressRepository } from '../localRepository';
import type { AddressPointInput } from '../../domain/types';

class MemStorage {
  m = new Map<string, string>();
  getItem(k: string) { return this.m.get(k) ?? null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
}
const input: AddressPointInput = {
  house_no: '1', village: null, soi: null, street: null, subdistrict: null, district: null, province: null,
  postal_code: null, landmark: null, notes: null, source: 't', verification_status: 'unverified', latitude: 13.7, longitude: 100.5,
};

describe('LocalAddressRepository', () => {
  it('creates, updates, verifies, filters by bbox and deletes', async () => {
    const storage = new MemStorage();
    const repo = new LocalAddressRepository(storage as unknown as Storage);
    const a = await repo.create(input);
    await repo.createMany([{ ...input, house_no: '2', latitude: 18.8, longitude: 98.98 }]);
    expect(await repo.list()).toHaveLength(2);

    const u = await repo.update(a.id, { ...input, house_no: '1A' });
    expect(u.house_no).toBe('1A');
    const v = await repo.setVerification(a.id, 'verified');
    expect(v.verified_at).not.toBeNull();
    expect((await repo.setVerification(a.id, 'needs_review')).verified_at).toBeNull();

    expect(await repo.listInBounds({ west: 100, south: 13, east: 101, north: 14 })).toHaveLength(1);

    // persisted across instances
    expect(await new LocalAddressRepository(storage as unknown as Storage).list()).toHaveLength(2);

    await repo.remove(a.id);
    expect((await repo.list()).map((p) => p.house_no)).toEqual(['2']);
  });
});
