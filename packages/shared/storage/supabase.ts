import type { SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export function configureSupabaseStorage(supabase: SupabaseClient): void {
  client = supabase;
}

export function getSupabaseStorageClient(): SupabaseClient {
  if (!client) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
  return client;
}

export function isSupabaseStorageConfigured(): boolean {
  return client !== null;
}
