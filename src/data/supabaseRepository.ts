import type { SupabaseClient } from '@supabase/supabase-js';
import type { AddressPoint, AddressPointInput, VerificationStatus } from '../domain/types';
import type { AddressRepository, BoundingBox } from './repository';
import { RepositoryError } from './repository';

const TABLE = 'address_points';
// geom is generated in the database from latitude/longitude; never sent from the client.
const COLUMNS =
  'id,house_no,village,soi,street,subdistrict,district,province,postal_code,landmark,notes,source,verification_status,latitude,longitude,created_at,updated_at,verified_at';

function fail(error: { message: string } | null, fallback: string): never {
  throw new RepositoryError(error?.message ?? fallback);
}

/** Supabase (PostgreSQL + PostGIS) implementation. See supabase/migrations. */
export class SupabaseAddressRepository implements AddressRepository {
  readonly kind = 'supabase' as const;
  readonly label = 'Supabase (PostGIS)';

  constructor(private client: SupabaseClient) {}

  async list() {
    const { data, error } = await this.client.from(TABLE).select(COLUMNS).order('created_at', { ascending: false }).limit(5000);
    if (error) fail(error, 'โหลดข้อมูลไม่สำเร็จ');
    return (data ?? []) as AddressPoint[];
  }

  async listInBounds(b: BoundingBox) {
    const { data, error } = await this.client.rpc('address_points_in_bbox', {
      min_lng: b.west, min_lat: b.south, max_lng: b.east, max_lat: b.north,
    });
    if (error) fail(error, 'โหลดข้อมูลในกรอบแผนที่ไม่สำเร็จ');
    return (data ?? []) as AddressPoint[];
  }

  async create(input: AddressPointInput) {
    const { data, error } = await this.client.from(TABLE).insert(input).select(COLUMNS).single();
    if (error || !data) fail(error, 'บันทึกไม่สำเร็จ');
    return data as AddressPoint;
  }

  async createMany(inputs: AddressPointInput[]) {
    if (inputs.length === 0) return [];
    const { data, error } = await this.client.from(TABLE).insert(inputs).select(COLUMNS);
    if (error) fail(error, 'นำเข้าข้อมูลไม่สำเร็จ');
    return (data ?? []) as AddressPoint[];
  }

  async update(id: string, input: AddressPointInput) {
    // verified_at / updated_at are maintained by a database trigger.
    const { data, error } = await this.client.from(TABLE).update(input).eq('id', id).select(COLUMNS).single();
    if (error || !data) fail(error, 'แก้ไขไม่สำเร็จ');
    return data as AddressPoint;
  }

  async setVerification(id: string, status: VerificationStatus) {
    const { data, error } = await this.client.from(TABLE).update({ verification_status: status }).eq('id', id).select(COLUMNS).single();
    if (error || !data) fail(error, 'เปลี่ยนสถานะไม่สำเร็จ');
    return data as AddressPoint;
  }

  async remove(id: string) {
    const { error } = await this.client.from(TABLE).delete().eq('id', id);
    if (error) fail(error, 'ลบไม่สำเร็จ');
  }
}
