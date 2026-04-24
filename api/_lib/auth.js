import bcrypt from 'bcryptjs';
import { getRedis } from './redis.js';

const PASSWORD_HASH_KEY = 'audit:admin_password_hash';

/**
 * If Redis has a hash, use it. Otherwise fall back to ADMIN_PASSWORD (plaintext in env).
 */
export async function verifyAdminPassword(password) {
  const redis = getRedis();
  const stored = redis ? await redis.get(PASSWORD_HASH_KEY) : null;
  if (stored && typeof stored === 'string') {
    return bcrypt.compare(password, stored);
  }
  const envPlain = process.env.ADMIN_PASSWORD;
  if (!envPlain) return false;
  return password === envPlain;
}

/**
 * Persists bcrypt hash to Redis. Requires Upstash to be configured.
 */
export async function setAdminPasswordFromPlain(newPlain) {
  const redis = getRedis();
  if (!redis) {
    throw new Error('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required to change password.');
  }
  const hash = bcrypt.hashSync(newPlain, 10);
  await redis.set(PASSWORD_HASH_KEY, hash);
}

export async function hasStoredPasswordHash() {
  const redis = getRedis();
  if (!redis) return false;
  const v = await redis.get(PASSWORD_HASH_KEY);
  return Boolean(v && typeof v === 'string');
}
