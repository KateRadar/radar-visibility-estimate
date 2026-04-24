import { verifyAdminPassword } from '../_lib/auth.js';
import { readJsonBody } from '../_lib/readJsonBody.js';
import { createSessionToken, sessionCookieHeader } from '../_lib/session.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const secret = process.env.ADMIN_SESSION_SECRET || '';
  if (secret.length < 16) {
    return res.status(500).json({
      error: 'Server misconfiguration',
      detail: 'Set ADMIN_SESSION_SECRET (min 16 characters) in Vercel environment variables.',
    });
  }

  const body = await readJsonBody(req);

  const password = body.password;
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'password is required' });
  }

  const ok = await verifyAdminPassword(password);
  if (!ok) return res.status(401).json({ error: 'Invalid password' });

  const token = createSessionToken();
  if (!token) return res.status(500).json({ error: 'Could not create session' });

  res.setHeader('Set-Cookie', sessionCookieHeader(token, 7 * 24 * 60 * 60));
  return res.status(200).json({ ok: true });
}
