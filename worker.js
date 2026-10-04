/**
 * Universal CORS Proxy — Cloudflare Workers Edge Edition
 * -------------------------------------------------------
 * Advanced edge proxy featuring:
 * 1. Advanced Header & Payload Control:
 *    - Custom Request Headers via query params (?headers={...})
 *    - MIME-Type (?type=...) & Content-Disposition (?disposition=inline|attachment)
 *    - Referer / Origin spoofing to bypass CDN hotlink protections
 * 2. Edge Streaming Transformations:
 *    - On-the-fly Compression/Decompression (CompressionStream/DecompressionStream)
 *    - Range & Partial Content Slicing (resumable downloads, video seeking)
 *    - Stream Find-and-Replace (Text/HTML/JSON) & HTMLRewriter CSS/JS injection
 * 3. Security, Tokenization & Link Expiry:
 *    - Signed & Expiring URLs via Web Crypto HMAC-SHA256 (?expires=...&sig=...)
 *    - Origin Whitelisting / Token Gates (?allowed_origin=... & env.ALLOWED_ORIGINS)
 *    - Strict multi-layer SSRF protection (private CIDRs, hex/octal/decimal IPs, cloud metadata)
 * 4. Smart Multi-Source Resolvers:
 *    - Native platform unwrappers (Google Drive large-file scan bypass, Dropbox, OneDrive, Box, GitHub, GitLab)
 *    - Automatic fallback and backup mirror URL resolution (?fallback=...)
 * 5. Caching & Persistence Controls:
 *    - Custom Edge Cache TTL (?cache_ttl=...)
 *    - Optional Cloudflare R2 bucket mirroring (env.R2_BUCKET)
 * 6. Developer Experience & UI:
 *    - cURL, JavaScript fetch, and Python requests code snippet generator
 *    - Live HTTP Header Inspector drawer with latency and status breakdown
 */

import { validateTargetUrl, isBlockedHost } from './src/ssrf.js';
import { verifySignedUrl, signUrl, encryptToken, decryptToken } from './src/crypto.js';
import {
  unwrapPlatformUrl,
  fetchWithPlatformAndFallback,
  safeFetch,
} from './src/resolvers.js';
import {
  corsHeaders,
  parseCustomHeaders,
  buildRefererOriginHeaders,
  guessFilename,
  buildContentDisposition,
  buildPassthroughHeaders,
} from './src/headers.js';
import {
  createRangeSlicer,
  parseRangeHeader,
  compressStream,
  decompressStream,
  createTextReplaceStream,
  applyHtmlRewriter,
  isTextualMime,
} from './src/transforms.js';
import { parseImageResizeOptions, fetchResizedImage } from './src/images.js';
import { HTML_PAGE } from './src/ui.html.js';

const DEFAULT_CACHE_TTL = 86400; // 1 day

/**
 * Checks whether client Origin or Referer matches the allowed origin requirement.
 */
function isOriginAllowed(request, allowedOriginSetting) {
  if (!allowedOriginSetting || allowedOriginSetting === '*') return true;
  const clientOrigin = request.headers.get('origin');
  const clientReferer = request.headers.get('referer');

  const allowedList = allowedOriginSetting.split(',').map((o) => o.trim().toLowerCase());

  let reqOrigin = '';
  if (clientOrigin) {
    reqOrigin = clientOrigin.toLowerCase();
  } else if (clientReferer) {
    try {
      reqOrigin = new URL(clientReferer).origin.toLowerCase();
    } catch {
      // ignore
    }
  }

  if (!reqOrigin) {
    // If request has no Origin/Referer (like direct curl or script), allow unless strict wildcard fails
    return true;
  }

  return allowedList.some((allowed) => {
    if (allowed === '*' || reqOrigin === allowed) return true;
    if (allowed.startsWith('*.')) {
      const domain = allowed.slice(2);
      const reqHost = new URL(reqOrigin).hostname;
      return reqHost.endsWith(domain);
    }
    return false;
  });
}

/**
 * Main Proxy Handler for GET and HEAD requests.
 */
async function handleProxy(request, env, ctx, tokenParam = null) {
  const reqUrl = new URL(request.url);
  const token = tokenParam || reqUrl.searchParams.get('t');

  let effectiveParams = new URLSearchParams(reqUrl.searchParams);

  // If encrypted token is present, decrypt and merge internal parameters
  if (token) {
    const encSecret = env.ENCRYPTION_KEY || env.HMAC_SECRET || env.PROXY_SECRET || env.SECRET_KEY;
    if (!encSecret) {
      return new Response('Forbidden: Server encryption secret (ENCRYPTION_KEY or HMAC_SECRET) is not configured', {
        status: 501,
        headers: corsHeaders({}, '*'),
      });
    }

    const decryptRes = await decryptToken(token, encSecret);
    if (!decryptRes.valid) {
      return new Response(`Forbidden: ${decryptRes.error}`, {
        status: 403,
        headers: corsHeaders({}, '*'),
      });
    }

    // Merge sealed parameters (payload overrides external query params for tamper-proofing)
    const payload = decryptRes.payload || {};
    for (const [k, v] of Object.entries(payload)) {
      if (v !== null && v !== undefined) {
        if (typeof v === 'object') {
          effectiveParams.set(k, JSON.stringify(v));
        } else {
          effectiveParams.set(k, String(v));
        }
      }
    }
  }

  const originalUrl = effectiveParams.get('url');
  const fallbackUrl = effectiveParams.get('fallback') || effectiveParams.get('mirror');
  const filenameParam = effectiveParams.get('filename');
  const dispositionParam = effectiveParams.get('disposition');
  const downloadParam = effectiveParams.get('download');
  const typeOverride = effectiveParams.get('type') || effectiveParams.get('content_type') || effectiveParams.get('mime');
  const customHeadersParam = effectiveParams.get('headers');
  const refererParam = effectiveParams.get('referer');
  const originParam = effectiveParams.get('origin');
  const compressParam = effectiveParams.get('compress');
  const decompressParam = effectiveParams.get('decompress');
  const replaceFrom = effectiveParams.get('replace_from');
  const replaceTo = effectiveParams.get('replace_to') ?? '';
  const replaceFlags = effectiveParams.get('replace_flags') || 'g';
  const injectCss = effectiveParams.get('inject_css');
  const injectJs = effectiveParams.get('inject_js');
  const allowedOriginParam = effectiveParams.get('allowed_origin') || env.ALLOWED_ORIGINS;
  const cacheTtlParam = effectiveParams.get('cache_ttl') ?? effectiveParams.get('ttl');
  const persistR2 = effectiveParams.get('persist_r2') === '1' || env.R2_AUTO_PERSIST === 'true';

  // 1. Origin Whitelist Check
  if (!isOriginAllowed(request, allowedOriginParam)) {
    return new Response('Forbidden: Request origin is not permitted by origin policy', {
      status: 403,
      headers: corsHeaders({}, allowedOriginParam),
    });
  }

  const clientOrigin = request.headers.get('origin') || '*';
  const responseCors = corsHeaders({}, allowedOriginParam ? clientOrigin : '*');

  // 2. Validate Target URL
  if (!originalUrl) {
    return new Response('Missing required "url" parameter', { status: 400, headers: responseCors });
  }

  try {
    validateTargetUrl(originalUrl);
    if (fallbackUrl) validateTargetUrl(fallbackUrl);
  } catch (err) {
    const status = err.message.includes('not allowed') || err.message.includes('blocked') ? 403 : 400;
    return new Response(`Security error: ${err.message}`, { status, headers: responseCors });
  }

  // 3. HMAC Signature & Expiry Check (for plain unencrypted URLs)
  if (!token) {
    const hmacSecret = env.HMAC_SECRET || env.PROXY_SECRET || env.SECRET_KEY;
    if (hmacSecret || reqUrl.searchParams.has('sig')) {
      if (hmacSecret) {
        const verifyRes = await verifySignedUrl(request.url, hmacSecret);
        if (!verifyRes.valid) {
          return new Response(`Forbidden: ${verifyRes.error}`, { status: 403, headers: responseCors });
        }
      } else if (reqUrl.searchParams.has('expires')) {
        const exp = parseInt(reqUrl.searchParams.get('expires'), 10);
        if (Date.now() / 1000 > exp) {
          return new Response('Forbidden: Signed URL has expired', { status: 403, headers: responseCors });
        }
      }
    }
  }

  // 4. Cache TTL Settings
  let cacheTtl = DEFAULT_CACHE_TTL;
  if (cacheTtlParam !== null && cacheTtlParam !== undefined) {
    if (cacheTtlParam === 'false' || cacheTtlParam === 'bypass' || cacheTtlParam === '0') {
      cacheTtl = 0;
    } else {
      const parsedTtl = parseInt(cacheTtlParam, 10);
      if (!isNaN(parsedTtl)) cacheTtl = Math.max(0, parsedTtl);
    }
  }

  // 5. Cloudflare R2 Persistence Read (Optional)
  const r2Bucket = env.R2_BUCKET || env.BUCKET;
  let r2Key = null;
  if (r2Bucket && persistR2 && request.method === 'GET') {
    // Generate deterministic key based on URL hash
    const encoder = new TextEncoder();
    const hashBuf = await crypto.subtle.digest('SHA-256', encoder.encode(originalUrl));
    const hashHex = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
    r2Key = `cache_${hashHex}`;

    try {
      const r2Obj = await r2Bucket.get(r2Key);
      if (r2Obj) {
        const r2Headers = {
          'Content-Type': r2Obj.httpMetadata?.contentType || 'application/octet-stream',
          'Cache-Control': `public, max-age=${cacheTtl}`,
          'X-Proxy-Source': 'R2-Mirror',
          'X-Cache-Status': 'HIT',
          ...responseCors,
        };
        if (r2Obj.httpMetadata?.contentDisposition) {
          r2Headers['Content-Disposition'] = r2Obj.httpMetadata.contentDisposition;
        }
        return new Response(r2Obj.body, { headers: r2Headers });
      }
    } catch (r2Err) {
      console.warn('R2 read error, falling back to upstream:', r2Err.message);
    }
  }

  // 6. Range and Cache Lookup
  const rangeHeader = request.headers.get('range') || reqUrl.searchParams.get('range');
  const cache = caches.default;
  const cacheKey = new Request(reqUrl.toString(), { method: 'GET' });

  if (!rangeHeader && cacheTtl > 0 && request.method === 'GET') {
    const cached = await cache.match(cacheKey);
    if (cached) {
      const hit = new Response(cached.body, cached);
      Object.entries(corsHeaders({ 'X-Cache-Status': 'HIT', 'X-Cache-TTL': cacheTtl.toString() }, allowedOriginParam ? clientOrigin : '*'))
        .forEach(([k, v]) => hit.headers.set(k, v));
      return hit;
    }
  }

  // 7. Parse custom headers & spoofing
  let customHeaders = {};
  if (customHeadersParam) {
    try {
      customHeaders = parseCustomHeaders(customHeadersParam);
    } catch (err) {
      return new Response(err.message, { status: 400, headers: responseCors });
    }
  }

  const spoofHeaders = buildRefererOriginHeaders(originalUrl, refererParam, originParam, request.headers);
  const upstreamHeaders = {
    ...customHeaders,
    ...spoofHeaders,
  };
  if (rangeHeader) {
    upstreamHeaders['Range'] = rangeHeader.startsWith('bytes=') ? rangeHeader : `bytes=${rangeHeader}`;
  }

  // 8. Fetch from Upstream with Smart Resolvers & Fallback (or Image Resizer)
  const imageResizeOptions = parseImageResizeOptions(effectiveParams);
  let fetchResult;
  try {
    if (imageResizeOptions) {
      const resizeResult = await fetchResizedImage({
        targetUrl: originalUrl,
        options: imageResizeOptions,
        headers: upstreamHeaders,
      });
      fetchResult = {
        response: resizeResult.response,
        source: 'primary',
        platform: `Image Resizer (${resizeResult.engineUsed})`,
      };
    } else {
      fetchResult = await fetchWithPlatformAndFallback({
        primaryUrl: originalUrl,
        fallbackUrl,
        method: request.method === 'HEAD' ? 'HEAD' : 'GET',
        headers: upstreamHeaders,
      });
    }
  } catch (err) {
    const status = err.message.includes('not allowed') || err.message.includes('blocked') ? 403 : 502;
    return new Response(`Upstream fetch failed: ${err.message}`, { status, headers: responseCors });
  }

  const { response: upstream, source, platform, primaryStatus } = fetchResult;

  if (!upstream.ok && upstream.status !== 206) {
    return new Response(`Failed to fetch upstream: ${upstream.status} ${upstream.statusText}`, {
      status: upstream.status,
      headers: responseCors,
    });
  }

  // 9. Build Response Headers
  let contentType = typeOverride || upstream.headers.get('content-type') || 'application/octet-stream';
  if (imageResizeOptions?.format) {
    contentType = `image/${imageResizeOptions.format === 'jpg' ? 'jpeg' : imageResizeOptions.format}`;
  }
  const filename = guessFilename(originalUrl, upstream, filenameParam);

  const sharedHeaders = {
    'Content-Type': contentType,
    'Cache-Control': cacheTtl > 0 ? `public, max-age=${cacheTtl}` : 'no-store, no-cache',
    'X-Proxy-Source': source,
    ...buildPassthroughHeaders(upstream),
  };
  if (imageResizeOptions) sharedHeaders['X-Proxy-Image-Resized'] = 'true';
  if (platform) sharedHeaders['X-Proxy-Platform'] = platform;
  if (primaryStatus) sharedHeaders['X-Proxy-Primary-Status'] = String(primaryStatus);
  if (cacheTtl > 0) sharedHeaders['X-Cache-TTL'] = String(cacheTtl);

  // Content-Disposition determination
  let dispositionType = 'attachment';
  if (dispositionParam) {
    dispositionType = dispositionParam.startsWith('inline') ? 'inline' : 'attachment';
  } else if (downloadParam === '0' || downloadParam === 'false') {
    dispositionType = 'inline';
  }
  sharedHeaders['Content-Disposition'] = buildContentDisposition(dispositionType, filename);

  // If HEAD request or empty body
  if (request.method === 'HEAD' || !upstream.body) {
    return new Response(null, {
      status: upstream.status,
      headers: { ...sharedHeaders, ...responseCors },
    });
  }

  let bodyStream = upstream.body;
  let finalStatus = upstream.status;

  // 10. Edge Streaming Range Slicing (if requested and upstream didn't slice)
  if (rangeHeader && upstream.status === 200) {
    const parsedRange = parseRangeHeader(rangeHeader);
    if (parsedRange) {
      bodyStream = bodyStream.pipeThrough(createRangeSlicer(parsedRange.start, parsedRange.end));
      finalStatus = 206;
      const totalLen = upstream.headers.get('content-length') || '*';
      const sliceEnd = parsedRange.end !== undefined ? parsedRange.end : (totalLen !== '*' ? parseInt(totalLen, 10) - 1 : '*');
      sharedHeaders['Content-Range'] = `bytes ${parsedRange.start}-${sliceEnd}/${totalLen}`;
      delete sharedHeaders['Content-Length'];
    }
  }

  // 11. Edge Decompression
  if (decompressParam && (decompressParam === 'gzip' || decompressParam === 'deflate' || decompressParam === '1' || decompressParam === 'true')) {
    const upstreamEncoding = upstream.headers.get('content-encoding');
    const format = decompressParam === 'deflate' || upstreamEncoding === 'deflate' ? 'deflate' : 'gzip';
    try {
      bodyStream = decompressStream(bodyStream, format);
      delete sharedHeaders['Content-Encoding'];
      delete sharedHeaders['Content-Length'];
    } catch (decErr) {
      console.warn('Decompression failed, serving original stream:', decErr.message);
    }
  }

  // 12. Text Find-and-Replace Transformations & HTML Injection
  const hasTextTransform = replaceFrom || injectCss || injectJs;
  if (hasTextTransform && isTextualMime(contentType)) {
    delete sharedHeaders['Content-Length'];

    if (replaceFrom) {
      bodyStream = bodyStream.pipeThrough(
        createTextReplaceStream([{ from: replaceFrom, to: replaceTo, flags: replaceFlags }])
      );
    }

    if ((injectCss || injectJs) && contentType.includes('text/html')) {
      const intermediateResponse = new Response(bodyStream, { headers: sharedHeaders });
      const rewritten = applyHtmlRewriter(intermediateResponse, { injectCss, injectJs });
      bodyStream = rewritten.body;
    }
  }

  // 13. Edge Compression
  if (compressParam === 'gzip' || compressParam === 'deflate') {
    const upstreamEncoding = upstream.headers.get('content-encoding');
    if (upstreamEncoding !== compressParam) {
      try {
        bodyStream = compressStream(bodyStream, compressParam);
        sharedHeaders['Content-Encoding'] = compressParam;
        delete sharedHeaders['Content-Length'];
      } catch (compErr) {
        console.warn('Compression failed, serving original stream:', compErr.message);
      }
    }
  }

  // 14. Edge Caching & R2 Asynchronous Mirroring
  const isCacheable = !rangeHeader && finalStatus === 200 && cacheTtl > 0 && !hasTextTransform;

  if (isCacheable) {
    const [clientBranch, cacheBranch] = bodyStream.tee();

    ctx.waitUntil(
      cache
        .put(cacheKey, new Response(cacheBranch, { headers: sharedHeaders }))
        .catch((err) => console.error('Cache write failed:', err.message))
    );

    // Optional R2 persistence write
    if (r2Bucket && r2Key && persistR2) {
      const [clientFinal, r2Branch] = clientBranch.tee();
      ctx.waitUntil(
        r2Bucket
          .put(r2Key, r2Branch, {
            httpMetadata: {
              contentType: sharedHeaders['Content-Type'],
              contentDisposition: sharedHeaders['Content-Disposition'],
            },
            customMetadata: {
              originalUrl,
              persistedAt: new Date().toISOString(),
            },
          })
          .catch((r2Err) => console.error('R2 write failed:', r2Err.message))
      );

      return new Response(clientFinal, {
        status: finalStatus,
        headers: { ...sharedHeaders, ...responseCors, 'X-Cache-Status': 'MISS' },
      });
    }

    return new Response(clientBranch, {
      status: finalStatus,
      headers: { ...sharedHeaders, ...responseCors, 'X-Cache-Status': 'MISS' },
    });
  }

  return new Response(bodyStream, {
    status: finalStatus,
    headers: { ...sharedHeaders, ...responseCors, 'X-Cache-Status': 'BYPASS' },
  });
}

/**
 * Worker Main Export
 */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      const allowedOrigin = env.ALLOWED_ORIGINS || '*';
      const clientOrigin = request.headers.get('origin') || '*';
      return new Response(null, {
        status: 204,
        headers: corsHeaders({}, allowedOrigin === '*' ? '*' : clientOrigin),
      });
    }

    try {
      // 1. Dashboard UI
      if (url.pathname === '/' && request.method === 'GET') {
        return new Response(HTML_PAGE, {
          headers: {
            'Content-Type': 'text/html; charset=UTF-8',
            ...corsHeaders(),
          },
        });
      }

      // 2. Helper Endpoint: Sign URL (Web Crypto HMAC-SHA256)
      if (url.pathname === '/sign') {
        const secret = env.HMAC_SECRET || env.PROXY_SECRET || env.SECRET_KEY;
        if (!secret) {
          return new Response('HMAC_SECRET is not configured on this worker', {
            status: 501,
            headers: corsHeaders(),
          });
        }

        let target = url.searchParams.get('url');
        let expiresIn = parseInt(url.searchParams.get('expires_in') || '86400', 10);

        if (request.method === 'POST') {
          try {
            const body = await request.json();
            if (body.url) target = body.url;
            if (body.expiresIn) expiresIn = body.expiresIn;
          } catch {
            // ignore
          }
        }

        if (!target) {
          return new Response('Missing target URL to sign', { status: 400, headers: corsHeaders() });
        }

        const signed = await signUrl(target, secret, expiresIn);
        return new Response(JSON.stringify(signed), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders() },
        });
      }

      // 3. Helper Endpoint: Inspect upstream headers directly
      if (url.pathname === '/inspect' && request.method === 'GET') {
        const inspectTarget = url.searchParams.get('url');
        if (!inspectTarget) {
          return new Response('Missing url parameter', { status: 400, headers: corsHeaders() });
        }

        const start = Date.now();
        const unwrap = unwrapPlatformUrl(inspectTarget);
        validateTargetUrl(unwrap.url);
        const upstream = await safeFetch(unwrap.url, { method: 'HEAD' });
        const latency = Date.now() - start;

        const headerMap = {};
        for (const [k, v] of upstream.headers.entries()) {
          headerMap[k] = v;
        }

        return new Response(
          JSON.stringify({
            status: upstream.status,
            statusText: upstream.statusText,
            platform: unwrap.platform,
            resolvedUrl: unwrap.url,
            latencyMs: latency,
            headers: headerMap,
          }),
          { headers: { 'Content-Type': 'application/json', ...corsHeaders() } }
        );
      }

      // 4. Helper Endpoint: Encrypt parameters into stateless opaque token
      if (url.pathname === '/encrypt') {
        const secret = env.ENCRYPTION_KEY || env.HMAC_SECRET || env.PROXY_SECRET || env.SECRET_KEY;
        if (!secret) {
          return new Response('Server encryption secret (ENCRYPTION_KEY or HMAC_SECRET) is not configured on this worker', {
            status: 501,
            headers: corsHeaders(),
          });
        }

        let payload = {};
        let expiresIn = null;

        if (request.method === 'POST') {
          try {
            const body = await request.json();
            if (body && typeof body === 'object') {
              payload = { ...body };
              if (payload.expires_in) {
                expiresIn = parseInt(payload.expires_in, 10);
                delete payload.expires_in;
              } else if (payload.expiresIn) {
                expiresIn = parseInt(payload.expiresIn, 10);
                delete payload.expiresIn;
              }
            }
          } catch {
            return new Response('Invalid JSON payload body', { status: 400, headers: corsHeaders() });
          }
        } else if (request.method === 'GET') {
          for (const [k, v] of url.searchParams.entries()) {
            if (k === 'expires_in' || k === 'expiresIn') {
              expiresIn = parseInt(v, 10);
            } else {
              payload[k] = v;
            }
          }
        } else {
          return new Response('Method not allowed', { status: 405, headers: corsHeaders() });
        }

        if (!payload.url) {
          return new Response('Missing target "url" parameter in payload to encrypt', { status: 400, headers: corsHeaders() });
        }

        const { token, expires } = await encryptToken(payload, secret, expiresIn);
        const origin = url.origin;

        return new Response(JSON.stringify({
          token,
          expires,
          encryptedUrl: `${origin}/s/${token}`,
          proxyUrl: `${origin}/proxy?t=${token}`,
        }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders() }
        });
      }

      // 5. Short Opaque Encrypted Route: /s/<token>
      if (url.pathname.startsWith('/s/')) {
        if (request.method !== 'GET' && request.method !== 'HEAD') {
          return new Response('Method not allowed', { status: 405, headers: corsHeaders() });
        }

        const token = url.pathname.slice(3).trim();
        if (!token) {
          return new Response('Missing encrypted token in URL path', { status: 400, headers: corsHeaders() });
        }

        // Access Gate: PROXY_TOKEN
        if (env.PROXY_TOKEN) {
          const provided = url.searchParams.get('token') || request.headers.get('x-proxy-token');
          if (provided !== env.PROXY_TOKEN) {
            return new Response('Unauthorized: missing or invalid token', { status: 401, headers: corsHeaders() });
          }
        }

        return await handleProxy(request, env, ctx, token);
      }

      // 6. Main Proxy Endpoint
      if (url.pathname === '/proxy') {
        if (request.method !== 'GET' && request.method !== 'HEAD') {
          return new Response('Method not allowed', { status: 405, headers: corsHeaders() });
        }

        // Access Gate: PROXY_TOKEN
        if (env.PROXY_TOKEN) {
          const provided = url.searchParams.get('token') || request.headers.get('x-proxy-token');
          if (provided !== env.PROXY_TOKEN) {
            return new Response('Unauthorized: missing or invalid token', { status: 401, headers: corsHeaders() });
          }
        }

        return await handleProxy(request, env, ctx);
      }

      return new Response('Not found', { status: 404, headers: corsHeaders() });
    } catch (err) {
      console.error('Unhandled proxy error:', err);
      return new Response(`Internal proxy error: ${err.message}`, { status: 500, headers: corsHeaders() });
    }
  },
};
