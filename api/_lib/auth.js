import bcrypt from 'bcryptjs';
import { getSupabaseAdmin } from './supabase.js';

const PASSWORD_ROW_KEY = 'admin_password_bcrypt';

/**
 * If Supabase has a hash row, use it. Otherwise fall back to ADMIN_PASSWORD (plaintext in env).
 */
export async function verifyAdminPassword(password) {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase
      .from('admin_kv')
      .select('value')
      .eq('key', PASSWORD_ROW_KEY)
      .maybeSingle();
    if (!error && data?.value && typeof data.value === 'string') {
      return bcrypt.compare(password, data.value);
    }
  }
  const envPlain = process.env.ADMIN_PASSWORD;
  if (!envPlain) return false;
  return password === envPlain;
}

/**
 * Persists bcrypt hash to Supabase. Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 */
export async function setAdminPasswordFromPlain(newPlain) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required to change password.');
  }
  const hash = bcrypt.hashSync(newPlain, 10);
  const { error } = await supabase.from('admin_kv').upsert(
    {
      key: PASSWORD_ROW_KEY,
      value: hash,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'key' }
  );
  if (error) throw new Error(error.message);
}

export async function hasStoredPasswordHash() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;
  const { data, error } = await supabase
    .from('admin_kv')
    .select('value')
    .eq('key', PASSWORD_ROW_KEY)
    .maybeSingle();
  if (error || !data?.value) return false;
  return typeof data.value === 'string' && data.value.length > 0;
}
