import { getSupabaseAdmin } from './supabase.js';

const MAX_ITEMS = 500;

/**
 * Records one visibility-estimate form submission (runs server-side; no PII in client).
 * @param {{ email?: string, fn?: string, subj?: string, topic?: string, niche?: string, loc?: string }} row
 */
export async function recordAuditSubmission(row) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.warn('[submissions] Supabase not configured (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY); submission not stored.');
    return;
  }
  const { error } = await supabase.from('visibility_submissions').insert({
    email: row.email || '',
    fn: row.fn || '',
    subj: row.subj || '',
    topic: row.topic || '',
    niche: row.niche || '',
    loc: row.loc || '',
  });
  if (error) {
    console.error('[submissions] insert failed', error.message, error.code);
    throw error;
  }
}

export async function listAuditSubmissions() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('visibility_submissions')
    .select('id, created_at, email, fn, subj, topic, niche, loc')
    .order('created_at', { ascending: false })
    .limit(MAX_ITEMS);

  if (error) {
    console.error('[submissions] list failed', error.message);
    return [];
  }

  return (data || []).map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    email: r.email ?? '',
    fn: r.fn ?? '',
    subj: r.subj ?? '',
    topic: r.topic ?? '',
    niche: r.niche ?? '',
    loc: r.loc ?? '',
  }));
}
