import { getSessionFromRequest } from '../_lib/session.js';
import { listAuditSubmissions } from '../_lib/submissions.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const session = getSessionFromRequest(req);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  const submissions = await listAuditSubmissions();
  return res.status(200).json({ submissions });
}
