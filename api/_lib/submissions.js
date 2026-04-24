import { randomUUID } from 'crypto';
import { getRedis } from './redis.js';

const LIST_KEY = 'audit:submissions';
const MAX_ITEMS = 500;

/**
 * Records one visibility-estimate form submission (runs server-side; no PII in client).
 * @param {{ email?: string, fn?: string, subj?: string, topic?: string, niche?: string, loc?: string }} row
 */
export async function recordAuditSubmission(row) {
  const redis = getRedis();
  if (!redis) {
    console.warn('[submissions] Upstash Redis not configured; submission not stored.');
    return;
  }
  const entry = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    email: row.email || '',
    fn: row.fn || '',
    subj: row.subj || '',
    topic: row.topic || '',
    niche: row.niche || '',
    loc: row.loc || '',
  };
  await redis.lpush(LIST_KEY, JSON.stringify(entry));
  await redis.ltrim(LIST_KEY, 0, MAX_ITEMS - 1);
}

export async function listAuditSubmissions() {
  const redis = getRedis();
  if (!redis) return [];
  const raw = await redis.lrange(LIST_KEY, 0, MAX_ITEMS - 1);
  const rows = [];
  for (const s of raw) {
    try {
      rows.push(JSON.parse(s));
    } catch {
      /* skip */
    }
  }
  return rows;
}
