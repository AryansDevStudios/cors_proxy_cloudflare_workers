/**
 * Universal CORS Proxy — Cloudflare Workers edition
 * -------------------------------------------------
 * Rewrite of an Express/Render proxy for the Workers runtime.
 *
 * Design notes:
 *  - No filesystem: caching uses the Workers Cache API (`caches.default`),
 *    which lives at the edge PoP closest to each requester and expires
 *    automatically based on the `Cache-Control` header — no cleanup cron.
 *  - No `setInterval` keep-alive: Workers don't sleep between requests,
 *    so that Render-specific workaround simply isn't needed here.
 *  - Streaming end-to-end: the upstream body is `tee()`-d into two
 *    branches — one streamed straight to the client, one written to the
 *    edge cache in the background (`ctx.waitUntil`) — so caching adds
 *    zero latency to the response the user sees.
 *  - Zero npm dependencies: only Workers/Fetch-standard APIs are used.
 */

const CACHE_TTL_SECONDS = 24 * 60 * 60; // 1 day, mirrors the original
const MAX_REDIRECTS = 5; // manually followed so each hop can be SSRF-checked
const UPSTREAM_TIMEOUT_MS = 15_000; // fail fast if upstream never responds with headers

// Dependency-free content-type -> extension map. Covers common files across
// images, video, audio, office/documents, text/code, archives, fonts and a
// handful of misc/binary types. Grouped by category — extend as needed.
const EXTENSION_BY_MIME = {
  // Images
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/bmp': 'bmp',
  'image/x-ms-bmp': 'bmp',
  'image/tiff': 'tiff',
  'image/x-icon': 'ico',
  'image/vnd.microsoft.icon': 'ico',
  'image/avif': 'avif',
  'image/apng': 'apng',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/vnd.adobe.photoshop': 'psd',

  // Video
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/ogg': 'ogv',
  'video/quicktime': 'mov',
  'video/x-msvideo': 'avi',
  'video/x-matroska': 'mkv',
  'video/mpeg': 'mpeg',
  'video/3gpp': '3gp',
  'video/3gpp2': '3g2',
  'video/x-flv': 'flv',
  'video/mp2t': 'ts',

  // Audio
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/wave': 'wav',
  'audio/ogg': 'ogg',
  'audio/aac': 'aac',
  'audio/flac': 'flac',
  'audio/webm': 'weba',
  'audio/mp4': 'm4a',
  'audio/midi': 'mid',
  'audio/x-midi': 'mid',
  'audio/x-ms-wma': 'wma',
  'audio/3gpp': '3gp',

  // Documents / office
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.template': 'dotx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'application/vnd.oasis.opendocument.text': 'odt',
  'application/vnd.oasis.opendocument.spreadsheet': 'ods',
  'application/vnd.oasis.opendocument.presentation': 'odp',
  'application/rtf': 'rtf',
  'text/rtf': 'rtf',
  'application/epub+zip': 'epub',
  'application/vnd.apple.pages': 'pages',
  'application/vnd.apple.numbers': 'numbers',
  'application/vnd.apple.keynote': 'key',

  // Text, code & markup
  'text/plain': 'txt',
  'text/csv': 'csv',
  'text/tab-separated-values': 'tsv',
  'text/html': 'html',
  'text/css': 'css',
  'text/javascript': 'js',
  'application/javascript': 'js',
  'application/json': 'json',
  'application/ld+json': 'jsonld',
  'application/xml': 'xml',
  'text/xml': 'xml',
  'text/markdown': 'md',
  'text/calendar': 'ics',
  'application/x-yaml': 'yaml',
  'text/yaml': 'yaml',
  'application/sql': 'sql',

  // Archives / compressed
  'application/zip': 'zip',
  'application/x-zip-compressed': 'zip',
  'application/vnd.rar': 'rar',
  'application/x-rar-compressed': 'rar',
  'application/x-7z-compressed': '7z',
  'application/x-tar': 'tar',
  'application/gzip': 'gz',
  'application/x-gzip': 'gz',
  'application/x-bzip': 'bz',
  'application/x-bzip2': 'bz2',
  'application/x-xz': 'xz',

  // Fonts
  'font/woff': 'woff',
  'font/woff2': 'woff2',
  'font/ttf': 'ttf',
  'font/otf': 'otf',
  'application/font-woff': 'woff',
  'application/vnd.ms-fontobject': 'eot',

  // Executables / disk & package images
  'application/vnd.android.package-archive': 'apk',
  'application/x-msdownload': 'exe',
  'application/vnd.microsoft.portable-executable': 'exe',
  'application/x-ms-installer': 'msi',
  'application/x-apple-diskimage': 'dmg',
  'application/x-iso9660-image': 'iso',
  'application/x-debian-package': 'deb',
  'application/x-rpm': 'rpm',

  // 3D / misc
  'model/gltf-binary': 'glb',
  'model/gltf+json': 'gltf',
  'model/stl': 'stl',
  'application/wasm': 'wasm',
  'application/x-shockwave-flash': 'swf',
};

// Basic SSRF hardening for literal hostnames. This can't catch DNS-rebinding
// attacks (Workers can't resolve DNS before fetch() does), but it stops the
// obvious cases: localhost, loopback, link-local/metadata, and RFC1918 ranges.
const BLOCKED_HOSTNAME_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^0\.0\.0\.0$/,
  /^169\.254\./, // link-local, incl. cloud metadata (169.254.169.254)
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^::1$/,
  /^\[::1\]$/,
  /^\[?fe80:/i, // IPv6 link-local
  /^\[?f[cd][0-9a-f]{2}:/i, // IPv6 unique local (fc00::/7)
];

function corsHeaders(extra = {}) {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Expose-Headers':
      'Content-Disposition, X-Cache-Status, Content-Length, Content-Range, Accept-Ranges, ETag, Last-Modified',
    'Access-Control-Max-Age': '86400',
    ...extra,
  };
}

function isBlockedHost(hostname) {
  return BLOCKED_HOSTNAME_PATTERNS.some((re) => re.test(hostname));
}

// Fetches with redirects followed manually so every hop's hostname gets the
// same SSRF check as the original URL. `redirect: 'follow'` would let a
// perfectly legitimate public URL 302 straight to an internal address
// without this proxy ever seeing (or checking) the real destination.
// Also enforces a connect/header timeout, cleared as soon as headers arrive
// so it never cuts off a long-running body download in progress.
async function safeFetch(targetUrl, init = {}, redirectsLeft = MAX_REDIRECTS) {
  const parsed = new URL(targetUrl);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only http and https URLs are supported');
  }
  if (isBlockedHost(parsed.hostname)) {
    throw new Error('This host is not allowed');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(targetUrl, { ...init, redirect: 'manual', signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }

  if ([301, 302, 303, 307, 308].includes(response.status)) {
    const location = response.headers.get('location');
    if (!location) return response;
    if (redirectsLeft <= 0) throw new Error('Too many redirects');
    const nextUrl = new URL(location, targetUrl).toString();
    return safeFetch(nextUrl, init, redirectsLeft - 1);
  }

  return response;
}

// Strips control characters (including CR/LF) so a crafted filename can't
// inject extra header lines into the Content-Disposition value.
function sanitizeFilename(name) {
  return name.replace(/[\x00-\x1F\x7F]/g, '').replace(/[\\/]/g, '_').trim();
}

function filenameFromDisposition(disposition) {
  const parameters = new Map();
  const parameterPattern = /(?:^|;)\s*filename(\*)?\s*=\s*(?:"((?:\\.|[^"])*)"|([^;]*))/gi;
  let match;

  while ((match = parameterPattern.exec(disposition))) {
    const key = match[1] ? 'filename*' : 'filename';
    const value = (match[2] ?? match[3] ?? '').trim().replace(/\\(.)/g, '$1');
    if (!parameters.has(key)) parameters.set(key, value);
  }

  const extended = parameters.get('filename*');
  if (extended) {
    const extendedMatch = extended.match(/^([^']*)'[^']*'(.*)$/);
    if (extendedMatch) {
      try {
        if (/^utf-8$/i.test(extendedMatch[1])) return decodeURIComponent(extendedMatch[2]);
        if (/^iso-8859-1$/i.test(extendedMatch[1])) {
          return extendedMatch[2].replace(/%([0-9a-f]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
        }
      } catch {
        // Fall back to the regular filename parameter if extended decoding fails.
      }
    }
  }

  return parameters.get('filename') || null;
}

function guessFilename(originalUrl, upstreamResponse, filenameParam) {
  const disposition = upstreamResponse.headers.get('content-disposition') || '';
  const headerFilename = filenameFromDisposition(disposition);

  let urlFilename = '';
  try {
    urlFilename = decodeURIComponent(new URL(originalUrl).pathname.split('/').filter(Boolean).pop() || '');
  } catch {
    // ignore malformed URL paths
  }

  let filename = sanitizeFilename(filenameParam || headerFilename || urlFilename || '') || 'downloaded-file';

  if (!filename.includes('.')) {
    const contentType = (upstreamResponse.headers.get('content-type') || '').split(';')[0].trim();
    const ext = EXTENSION_BY_MIME[contentType];
    if (ext) filename += '.' + ext;
  }

  return filename;
}

function buildContentDisposition(filename) {
  const fallback = filename.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '\\$&');
  const encoded = encodeURIComponent(filename).replace(/[!'()*]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  );
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

// Forwards a handful of upstream headers that matter for correctness:
// ETag/Last-Modified for caching, Accept-Ranges/Content-Range so byte-range
// requests (video seeking, resumable downloads) actually work end to end —
// this was the missing piece that made the earlier Range support incomplete.
// Content-Length is only forwarded when the response isn't content-encoded:
// fetch() transparently decompresses the body, but some runtimes still
// report the original (compressed) length here, which would make a
// proxied gzip'd response look truncated to the client.
function buildPassthroughHeaders(upstream) {
  const headers = {};
  const etag = upstream.headers.get('etag');
  const lastModified = upstream.headers.get('last-modified');
  const acceptRanges = upstream.headers.get('accept-ranges');
  const contentRange = upstream.headers.get('content-range');
  const contentLength = upstream.headers.get('content-length');
  const contentEncoding = upstream.headers.get('content-encoding');

  if (etag) headers['ETag'] = etag;
  if (lastModified) headers['Last-Modified'] = lastModified;
  if (acceptRanges) headers['Accept-Ranges'] = acceptRanges;
  if (contentRange) headers['Content-Range'] = contentRange;
  if (contentLength && !contentEncoding) headers['Content-Length'] = contentLength;

  return headers;
}

// Resolves Google Drive's "large file" confirmation-page flow.
// Note: Google periodically changes this page's markup — if this starts
// failing for large files, this regex is the first place to check.
async function resolveGoogleDriveUrl(fileId, extraHeaders, finalMethod = 'GET') {
  // This first request always has to be a GET: we need to read its body to
  // tell a real file apart from Google's HTML confirmation page.
  const first = await safeFetch(`https://drive.google.com/uc?export=download&id=${fileId}`, {
    headers: extraHeaders,
  });
  const contentType = first.headers.get('content-type') || '';

  if (!contentType.includes('text/html')) {
    return first; // small file, served directly
  }

  const body = await first.text();
  const cookie = first.headers.get('set-cookie');
  const confirmMatch = body.match(/<form id="download-form" action="([^"]+)"/);

  if (!confirmMatch || !cookie) {
    throw new Error('Google Drive file not found, is private, or the confirmation page format changed.');
  }

  let finalUrl = confirmMatch[1].replace(/&amp;/g, '&');
  if (!finalUrl.startsWith('http')) finalUrl = `https://drive.google.com${finalUrl}`;

  return safeFetch(finalUrl, { method: finalMethod, headers: { ...extraHeaders, Cookie: cookie } });
}

const HTML_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>CORS Proxy</title>
<style>
  :root {
    --bg: #0b1013;
    --panel: #12191d;
    --border: rgba(255,255,255,0.08);
    --text: #e6ebed;
    --muted: #8a969b;
    --accent: #e8b339;
    --accent-ink: #1a1300;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg);
    color: var(--text);
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
    padding: 24px;
  }
  main {
    width: 100%;
    max-width: 560px;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 28px;
  }
  h1 {
    font-size: 1.15rem;
    font-weight: 600;
    margin: 0 0 6px;
  }
  p.sub {
    color: var(--muted);
    font-size: 0.9rem;
    margin: 0 0 22px;
    line-height: 1.5;
  }
  label {
    display: block;
    font-size: 0.8rem;
    color: var(--muted);
    margin: 16px 0 6px;
  }
  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .checkbox-label input {
    width: auto;
    padding: 0;
    accent-color: var(--accent);
  }
  input, textarea {
    width: 100%;
    background: #0b1013;
    border: 1px solid var(--border);
    color: var(--text);
    padding: 10px 12px;
    border-radius: 6px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.85rem;
  }
  input:focus, textarea:focus {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }
  textarea { resize: vertical; min-height: 64px; }
  .row { display: flex; gap: 8px; margin-top: 18px; }
  button {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text);
    padding: 9px 14px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.85rem;
  }
  button:hover { border-color: var(--accent); }
  button.primary {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--accent-ink);
    font-weight: 600;
    flex: 1;
  }
  button.primary:hover { filter: brightness(1.05); }
  #toast {
    position: fixed;
    bottom: 28px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--accent);
    color: var(--accent-ink);
    padding: 10px 16px;
    border-radius: 6px;
    font-size: 0.85rem;
    font-weight: 600;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.25s ease;
  }
  #toast.show { opacity: 1; }
</style>
</head>
<body>
<main>
  <h1>CORS Proxy</h1>
  <p class="sub">Paste a file URL — Google Drive share links included — to get a CORS-enabled, edge-cached download link.</p>

  <label for="input-url">Source URL</label>
  <input type="text" id="input-url" placeholder="https://drive.google.com/file/d/..." />

  <label for="filename">Filename (optional)</label>
  <input type="text" id="filename" placeholder="report.pdf" />

  <label class="checkbox-label"><input type="checkbox" id="download" checked /> Send as a download</label>

  <div class="row">
    <button class="primary" id="convert-btn">Generate link</button>
    <button id="paste-btn">Paste</button>
  </div>

  <label for="output-url">Proxied URL</label>
  <textarea id="output-url" readonly placeholder="Your link will appear here…"></textarea>
  <div class="row">
    <button id="copy-output">Copy link</button>
  </div>
</main>
<div id="toast"></div>

<script>
  const input = document.getElementById('input-url');
  const filenameInput = document.getElementById('filename');
  const downloadInput = document.getElementById('download');
  const output = document.getElementById('output-url');
  const toast = document.getElementById('toast');

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 1800);
  }

  document.getElementById('convert-btn').addEventListener('click', () => {
    const url = input.value.trim();
    if (!url) return showToast('Enter a URL first');
    const filename = filenameInput.value.trim();
    const proxied = new URL('/proxy', window.location.origin);
    proxied.searchParams.set('url', url);
    if (filename) proxied.searchParams.set('filename', filename);
    if (!downloadInput.checked) proxied.searchParams.set('download', '0');
    output.value = proxied.toString();
    showToast('Link generated');
  });

  document.getElementById('paste-btn').addEventListener('click', async () => {
    try {
      input.value = await navigator.clipboard.readText();
      showToast('Pasted');
    } catch {
      showToast('Clipboard access denied');
    }
  });

  document.getElementById('copy-output').addEventListener('click', async () => {
    if (!output.value) return showToast('Nothing to copy yet');
    try {
      await navigator.clipboard.writeText(output.value);
      showToast('Copied');
    } catch {
      output.select();
      document.execCommand('copy');
      showToast('Copied');
    }
  });
</script>
</body>
</html>`;

async function handleProxy(request, ctx) {
  const reqUrl = new URL(request.url);
  const originalUrl = reqUrl.searchParams.get('url');
  const filenameParam = reqUrl.searchParams.get('filename');
  const forceDownload = reqUrl.searchParams.get('download') !== '0';

  if (!originalUrl) {
    return new Response('Missing url parameter', { status: 400, headers: corsHeaders() });
  }

  let parsedTarget;
  try {
    parsedTarget = new URL(originalUrl);
  } catch {
    return new Response('Invalid url parameter', { status: 400, headers: corsHeaders() });
  }

  if (!['http:', 'https:'].includes(parsedTarget.protocol)) {
    return new Response('Only http and https URLs are supported', { status: 400, headers: corsHeaders() });
  }
  if (isBlockedHost(parsedTarget.hostname)) {
    return new Response('This host is not allowed', { status: 403, headers: corsHeaders() });
  }

  const rangeHeader = request.headers.get('range');
  const cache = caches.default;
  const cacheKey = new Request(reqUrl.toString(), { method: 'GET' });

  // Range requests bypass the cache: the Cache API can't store 206 responses,
  // and satisfying arbitrary byte ranges from a cached whole file adds
  // complexity this proxy doesn't need. Everything else is cache-eligible.
  if (!rangeHeader) {
    const cached = await cache.match(cacheKey);
    if (cached) {
      const hit = new Response(request.method === 'HEAD' ? null : cached.body, cached);
      Object.entries(corsHeaders({ 'X-Cache-Status': 'HIT' })).forEach(([k, v]) => hit.headers.set(k, v));
      return hit;
    }
  }

  const driveMatch = originalUrl.match(/https:\/\/drive\.google\.com\/(?:file\/d\/|open\?id=)([a-zA-Z0-9_-]+)/);
  const upstreamHeaders = rangeHeader ? { Range: rangeHeader } : {};
  const method = request.method === 'HEAD' ? 'HEAD' : 'GET';

  let upstream;
  try {
    upstream = driveMatch
      ? await resolveGoogleDriveUrl(driveMatch[1], upstreamHeaders, method)
      : await safeFetch(originalUrl, { method, headers: upstreamHeaders });
  } catch (err) {
    const status = err.message === 'This host is not allowed' ? 403 : 502;
    return new Response(`Upstream fetch failed: ${err.message}`, { status, headers: corsHeaders() });
  }

  if (!upstream.ok) {
    return new Response(`Failed to fetch upstream: ${upstream.status} ${upstream.statusText}`, {
      status: upstream.status,
      headers: corsHeaders(),
    });
  }

  const filename = guessFilename(originalUrl, upstream, filenameParam);
  const sharedHeaders = {
    'Content-Type': upstream.headers.get('content-type') || 'application/octet-stream',
    'Cache-Control': `public, max-age=${CACHE_TTL_SECONDS}`,
    ...buildPassthroughHeaders(upstream),
  };
  if (forceDownload) sharedHeaders['Content-Disposition'] = buildContentDisposition(filename);

  if (!upstream.body) {
    return new Response(null, { status: upstream.status, headers: { ...sharedHeaders, ...corsHeaders() } });
  }

  // Only cache full (200) responses fetched without a Range header — Cache
  // API rejects 206 Partial Content outright.
  const isCacheable = !rangeHeader && upstream.status === 200;

  if (isCacheable) {
    const [clientStream, cacheStream] = upstream.body.tee();
    ctx.waitUntil(
      cache
        .put(cacheKey, new Response(cacheStream, { headers: sharedHeaders }))
        .catch((err) => console.error('Cache write failed:', err.message))
    );
    return new Response(clientStream, {
      status: upstream.status,
      headers: { ...sharedHeaders, ...corsHeaders({ 'X-Cache-Status': 'MISS' }) },
    });
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: { ...sharedHeaders, ...corsHeaders({ 'X-Cache-Status': 'BYPASS' }) },
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    try {
      if (url.pathname === '/' && request.method === 'GET') {
        return new Response(HTML_PAGE, {
          headers: { 'Content-Type': 'text/html; charset=UTF-8', ...corsHeaders() },
        });
      }

      if (url.pathname === '/proxy') {
        if (request.method !== 'GET' && request.method !== 'HEAD') {
          return new Response('Method not allowed', { status: 405, headers: corsHeaders() });
        }
        // Optional access gate: set a PROXY_TOKEN secret
        // (`wrangler secret put PROXY_TOKEN`) to stop this from being an
        // openly abusable public relay. Left unset, behavior is unchanged
        // (open) — this is opt-in, not a default.
        if (env.PROXY_TOKEN) {
          const provided = url.searchParams.get('token') || request.headers.get('x-proxy-token');
          if (provided !== env.PROXY_TOKEN) {
            return new Response('Unauthorized: missing or invalid token', { status: 401, headers: corsHeaders() });
          }
        }
        return await handleProxy(request, ctx);
      }

      return new Response('Not found', { status: 404, headers: corsHeaders() });
    } catch (err) {
      console.error('Unhandled error:', err);
      return new Response(`Internal error: ${err.message}`, { status: 500, headers: corsHeaders() });
    }
  },
};
