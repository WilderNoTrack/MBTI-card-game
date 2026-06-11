import { createClient } from '@supabase/supabase-js';
import { GameRoom } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client-side Supabase (anon key, used in browser for Realtime)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side Supabase (service role key, used in API routes)
export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export type { GameRoom };
