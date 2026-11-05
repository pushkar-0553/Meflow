import crypto from 'crypto';
import { env } from '../config/env.js';

const base64UrlEncode = (str) => {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
};

const base64UrlDecode = (str) => {
  let padded = str.replace(/-/g, '+').replace(/_/g, '/');
  while (padded.length % 4) {
    padded += '=';
  }
  return Buffer.from(padded, 'base64').toString('utf8');
};

/**
 * Sign a standard RFC 7519 JSON Web Token using native HMAC-SHA256
 * Zero-dependency: completely avoids npm module version conflicts on Render/Cloud.
 */
export const signToken = (payload, expiresInSeconds = 7 * 24 * 3600) => {
  const secret = env.JWT_SECRET || env.SESSION_SECRET || 'meflow-secure-token-secret-default-key-32b';
  const header = { alg: 'HS256', typ: 'JWT' };
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const iat = Math.floor(Date.now() / 1000);

  const fullPayload = { ...payload, exp, iat };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));

  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
};

/**
 * Verify a JSON Web Token against HMAC-SHA256 signature and expiration
 */
export const verifyToken = (token) => {
  if (!token || typeof token !== 'string') return null;
  const secret = env.JWT_SECRET || env.SESSION_SECRET || 'meflow-secure-token-secret-default-key-32b';
  const parts = token.trim().split('.');
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, signature] = parts;

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const sigBuffer = Buffer.from(signature);
  const expectedSigBuffer = Buffer.from(expectedSignature);

  if (sigBuffer.length !== expectedSigBuffer.length) return null;
  if (!crypto.timingSafeEqual(sigBuffer, expectedSigBuffer)) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }
    return payload;
  } catch {
    return null;
  }
};
