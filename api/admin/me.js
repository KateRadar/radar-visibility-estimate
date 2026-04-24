import { getSessionFromRequest } from '../_lib/session.js';
import { getSupabaseAdmin } from '../_lib/supabase.js';
import { hasStoredPasswordHash } from '../_lib/auth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const session = getSessionFromRequest(req);
  if (!session) return res.status(401).json({ ok: false, authenticated: false });

  const supabase = getSupabaseAdmin();
  const configured = Boolean(supabase);
  return res.status(200).json({
    ok: true,
    authenticated: true,
    supabaseConfigured: configured,
    /** @deprecated use supabaseConfigured */
    redisConfigured: configured,
    passwordChangeAvailable: configured,
    usingStoredPasswordHash: await hasStoredPasswordHash(),
  });
}
