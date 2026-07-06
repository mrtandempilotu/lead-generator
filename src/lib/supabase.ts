import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Server-side client using the service role key. Only import this from
// server code (API routes) — never expose the service role key to the client.
export function getSupabaseServerClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

export interface LeadRow {
  id?: string;
  place_id: string | null;
  name: string;
  address: string | null;
  category: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  rating: number | null;
  ratings_total: number | null;
  closed: boolean;
  search_keyword: string | null;
  search_city: string | null;
  created_at?: string;
}
