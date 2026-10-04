/**
 * Cryptographic & URL Signing Module
 * Uses standard Web Crypto (crypto.subtle) to generate and verify HMAC-SHA256 tamper-proof signed URLs.
 */

const encoder = new TextEncoder();

/**
 * Builds a deterministic canonical representation of the URL search parameters,
 * excluding the signature itself.
 */
export function buildCanonicalQuery(url) {
  const urlObj = typeof url === 'string' ? new URL(url) : new URL(url.toString());
  const params = new URLSearchParams(urlObj.search);
  params.delete('sig');

  // Sort keys alphabetically for tamper-proof determinism
  const sortedEntries = Array.from(params.entries()).sort(([aKey, aVal], [bKey, bVal]) => {
    if (aKey === bKey) return aVal.localeCompare(bVal);
    return aKey.localeCompare(bKey);
  });

  const canonicalParams = new URLSearchParams();
  for (const [k, v] of sortedEntries) {
    canonicalParams.append(k, v);
  }

  // Canonical string incorporates pathname + sorted query string
  return `${urlObj.pathname}?${canonicalParams.toString()}`;
}

/**
 * Imports a raw secret string into a CryptoKey for HMAC-SHA256.
 */
async function getCryptoKey(secret, usage = ['sign', 'verify']) {
  return await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    usage
  );
}

/**
 * Converts ArrayBuffer / Uint8Array to hex string.
 */
function bufferToHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Converts hex string to Uint8Array.
 */
function hexToBuffer(hex) {
  if (hex.length % 2 !== 0) return null;
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    const byte = parseInt(hex.slice(i, i + 2), 16);
    if (isNaN(byte)) return null;
    bytes[i / 2] = byte;
  }
  return bytes;
}

/**
 * Signs a proxy URL with an expiration timestamp and HMAC-SHA256 signature.
 * @param {string|URL} url - Full URL or path
 * @param {string} secret - Secret key
 * @param {number} expiresInSeconds - Lifetime in seconds (e.g. 3600 for 1 hour)
 * @returns {Promise<{ signedUrl: string, expires: number, sig: string }>}
 */
export function signUrl(url, secret, expiresInSeconds = 86400) {
  const urlObj = typeof url === 'string' ? new URL(url) : new URL(url.toString());
  const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
  urlObj.searchParams.set('expires', expires.toString());
  urlObj.searchParams.delete('sig');

  const canonical = buildCanonicalQuery(urlObj);
  return getCryptoKey(secret, ['sign']).then(async (key) => {
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(canonical));
    const sig = bufferToHex(signatureBuffer);
    urlObj.searchParams.set('sig', sig);
    return {
      signedUrl: urlObj.toString(),
      expires,
      sig,
    };
  });
}

/**
 * Verifies a signed URL against HMAC secret and expiration timestamp.
 * @param {string|URL} url
 * @param {string} secret
 * @returns {Promise<{ valid: boolean, error?: string, expires?: number }>}
 */
export async function verifySignedUrl(url, secret) {
  const urlObj = typeof url === 'string' ? new URL(url) : new URL(url.toString());
  const sig = urlObj.searchParams.get('sig');
  const expiresStr = urlObj.searchParams.get('expires');

  if (!sig) {
    return { valid: false, error: 'Missing required signature (sig parameter)' };
  }
  if (!expiresStr) {
    return { valid: false, error: 'Missing expiration timestamp (expires parameter)' };
  }

  const expires = parseInt(expiresStr, 10);
  if (isNaN(expires)) {
    return { valid: false, error: 'Invalid expires parameter' };
  }

  const now = Math.floor(Date.now() / 1000);
  if (now > expires) {
    return { valid: false, error: 'Signed URL has expired', expires };
  }

  const sigBytes = hexToBuffer(sig);
  if (!sigBytes) {
    return { valid: false, error: 'Malformed hex signature' };
  }

  const canonical = buildCanonicalQuery(urlObj);
  try {
    const key = await getCryptoKey(secret, ['verify']);
    const isValid = await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(canonical));
    if (!isValid) {
      return { valid: false, error: 'Signature mismatch / URL parameters have been tampered with' };
    }
    return { valid: true, expires };
  } catch (err) {
    return { valid: false, error: `Verification failed: ${err.message}` };
  }
}

/**
 * Encodes a Uint8Array into a URL-safe Base64url string without padding.
 */
export function bufferToBase64Url(bytes) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Decodes a URL-safe Base64url string into a Uint8Array.
 */
export function base64UrlToBuffer(base64url) {
  if (typeof base64url !== 'string') return null;
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    // Strict non-malleable canonical validation
    if (bufferToBase64Url(bytes) !== base64url) {
      return null;
    }
    return bytes;
  } catch {
    return null;
  }
}

/**
 * Derives a 256-bit AES-GCM key from an arbitrary string secret using SHA-256.
 */
export async function getAesKey(secret, usage = ['encrypt', 'decrypt']) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(secret));
  return await crypto.subtle.importKey(
    'raw',
    digest,
    { name: 'AES-GCM', length: 256 },
    false,
    usage
  );
}

/**
 * Encrypts an arbitrary object payload into an opaque, tamper-proof AES-256-GCM token.
 * Contains 12-byte IV + ciphertext + 16-byte GCM authentication tag.
 * @param {object} payload - Configuration payload (e.g. { url, blur, rotate, disposition, ... })
 * @param {string} secret - Secret encryption key
 * @param {number|null} expiresInSeconds - Optional lifetime in seconds
 * @returns {Promise<{ token: string, expires: number|null }>}
 */
export async function encryptToken(payload, secret, expiresInSeconds = null) {
  if (!secret) throw new Error('Secret key is required for token encryption');
  const data = typeof payload === 'object' && payload !== null ? { ...payload } : { data: payload };

  if (expiresInSeconds && !data.expires) {
    data.expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
  }

  const jsonStr = JSON.stringify(data);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await getAesKey(secret, ['encrypt']);

  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(jsonStr)
  );

  const ciphertextBytes = new Uint8Array(ciphertextBuffer);
  const combined = new Uint8Array(iv.length + ciphertextBytes.length);
  combined.set(iv, 0);
  combined.set(ciphertextBytes, iv.length);

  return {
    token: bufferToBase64Url(combined),
    expires: data.expires || null,
  };
}

/**
 * Decrypts and verifies an opaque AES-256-GCM token.
 * Rejects if tampered (tag mismatch), wrong key, corrupt bytes, or expired.
 * @param {string} token - Base64url token
 * @param {string} secret - Secret encryption key
 * @returns {Promise<{ valid: boolean, payload?: object, error?: string, expires?: number|null }>}
 */
export async function decryptToken(token, secret) {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Missing or invalid token string' };
  }
  if (!secret) {
    return { valid: false, error: 'Missing encryption secret key' };
  }

  const combined = base64UrlToBuffer(token);
  if (!combined || combined.length < 28) {
    return { valid: false, error: 'Invalid or tampered token' };
  }

  const iv = combined.subarray(0, 12);
  const ciphertextAndTag = combined.subarray(12);

  try {
    const key = await getAesKey(secret, ['decrypt']);
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertextAndTag
    );

    const decoder = new TextDecoder();
    const jsonStr = decoder.decode(decryptedBuffer);
    const payload = JSON.parse(jsonStr);

    const exp = payload.expires || payload.exp;
    if (exp) {
      const now = Math.floor(Date.now() / 1000);
      if (now > exp) {
        return { valid: false, error: 'Encrypted token has expired', expires: exp };
      }
    }

    return { valid: true, payload, expires: exp || null };
  } catch (err) {
    return { valid: false, error: 'Invalid or tampered token' };
  }
}

