import { getSessionFromRequest } from '../_lib/session.js';
import { getRedis } from '../_lib/redis.js';
import { hasStoredPasswordHash } from '../_lib/auth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const session = getSessionFromRequest(req);
  if (!session) return res.status(401).json({ ok: false, authenticated: false });

  const redis = getRedis();
  return res.status(200).json({
    ok: true,
    authenticated: true,
    redisConfigured: Boolean(redis),
    passwordChangeAvailable: Boolean(redis),
    usingStoredPasswordHash: await hasStoredPasswordHash(),
  });
}
