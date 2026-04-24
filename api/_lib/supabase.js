import { createClient } from '@supabase/supabase-js';

/**
 * Server-only Supabase client (service role bypasses RLS). Never expose this key to the browser.
 * @returns {import('@supabase/supabase-js').SupabaseClient | null}
 */
export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
