/**
 * Vercel often provides a parsed `req.body` for JSON POSTs; fall back to reading the stream.
 * @param {import('http').IncomingMessage} req
 */
export async function readJsonBody(req) {
  if (req.body != null) {
    if (Buffer.isBuffer(req.body)) {
      try {
        return JSON.parse(req.body.toString('utf8') || '{}');
      } catch {
        return {};
      }
    }
    if (typeof req.body === 'string') {
      try {
        return JSON.parse(req.body || '{}');
      } catch {
        return {};
      }
    }
    if (typeof req.body === 'object' && !Array.isArray(req.body)) return req.body;
  }

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}
