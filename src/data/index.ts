import type { AddressRepository } from './repository';
import { LocalAddressRepository } from './localRepository';

export interface RepositoryEnv {
  url?: string;
  anonKey?: string;
}

const defaultEnv: RepositoryEnv = {
  url: import.meta.env.VITE_SUPABASE_URL,
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
};

export function isSupabaseConfigured(env: RepositoryEnv = defaultEnv): boolean {
  return Boolean(env.url && env.anonKey);
}

/**
 * Picks Supabase when env vars are set, otherwise the clearly-labelled local
 * fallback. supabase-js is loaded lazily so local mode doesn't ship it.
 */
export async function createRepository(env: RepositoryEnv = defaultEnv): Promise<AddressRepository> {
  if (env.url && env.anonKey) {
    const [{ createClient }, { SupabaseAddressRepository }] = await Promise.all([
      import('@supabase/supabase-js'),
      import('./supabaseRepository'),
    ]);
    return new SupabaseAddressRepository(createClient(env.url, env.anonKey, { auth: { persistSession: false } }));
  }
  return new LocalAddressRepository();
}

export type { AddressRepository, BoundingBox } from './repository';
