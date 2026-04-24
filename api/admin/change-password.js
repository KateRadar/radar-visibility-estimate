import { verifyAdminPassword, setAdminPasswordFromPlain } from '../_lib/auth.js';
import { readJsonBody } from '../_lib/readJsonBody.js';
import { getSessionFromRequest } from '../_lib/session.js';
import { getRedis } from '../_lib/redis.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const session = getSessionFromRequest(req);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  const redis = getRedis();
  if (!redis) {
    return res.status(503).json({
      error: 'Redis not configured',
      detail:
        'Add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN so the new password can be stored securely.',
    });
  }

  const body = await readJsonBody(req);

  const currentPassword = body.currentPassword;
  const newPassword = body.newPassword;
  if (!currentPassword || typeof currentPassword !== 'string') {
    return res.status(400).json({ error: 'currentPassword is required' });
  }
  if (!newPassword || typeof newPassword !== 'string') {
    return res.status(400).json({ error: 'newPassword is required' });
  }
  if (newPassword.length < 10) {
    return res.status(400).json({ error: 'newPassword must be at least 10 characters' });
  }
  if (newPassword === currentPassword) {
    return res.status(400).json({ error: 'Choose a different password than your current one.' });
  }

  const ok = await verifyAdminPassword(currentPassword);
  if (!ok) return res.status(401).json({ error: 'Current password is incorrect' });

  try {
    await setAdminPasswordFromPlain(newPassword);
  } catch (e) {
    console.error('[admin] change-password', e);
    return res.status(500).json({ error: 'Could not save password', detail: String(e.message) });
  }

  return res.status(200).json({ ok: true });
}
