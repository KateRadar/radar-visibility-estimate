import crypto from 'crypto';

const COOKIE_NAME = 'radar_admin_sess';

export function getSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET || '';
}

export function createSessionToken() {
  const secret = getSessionSecret();
  if (!secret || secret.length < 16) return null;
  const exp = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ role: 'admin', exp }), 'utf8').toString(
    'base64url'
  );
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

/** @param {string | undefined} token */
export function verifySessionToken(token) {
  const secret = getSessionSecret();
  if (!token || !secret || secret.length < 16) return null;
  const dot = token.lastIndexOf('.');
  if (dot === -1) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  const a = Buffer.from(sig, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return null;
  if (!crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (data.exp < Date.now()) return null;
    if (data.role !== 'admin') return null;
    return data;
  } catch {
    return null;
  }
}

export function parseCookies(cookieHeader) {
  /** @type {Record<string, string>} */
  const out = {};
  if (!cookieHeader || typeof cookieHeader !== 'string') return out;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    try {
      out[k] = decodeURIComponent(v);
    } catch {
      out[k] = v;
    }
  }
  return out;
}

export function getSessionFromRequest(req) {
  const cookies = parseCookies(req.headers.cookie);
  return verifySessionToken(cookies[COOKIE_NAME]);
}

export function sessionCookieHeader(token, maxAgeSec) {
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSec}`,
  ];
  if (process.env.VERCEL === '1' || process.env.NODE_ENV === 'production') {
    parts.push('Secure');
  }
  return parts.join('; ');
}

export function clearSessionCookieHeader() {
  const parts = [`${COOKIE_NAME}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
  if (process.env.VERCEL === '1' || process.env.NODE_ENV === 'production') {
    parts.push('Secure');
  }
  return parts.join('; ');
}
