import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parseIpv4ToNumber,
  isPrivateIpv4,
  isBlockedIpv6,
  isBlockedHost,
  validateTargetUrl,
} from '../src/ssrf.js';

import {
  signUrl,
  verifySignedUrl,
  buildCanonicalQuery,
} from '../src/crypto.js';

import {
  unwrapPlatformUrl,
  fetchWithPlatformAndFallback,
} from '../src/resolvers.js';

import {
  parseCustomHeaders,
  corsHeaders,
  buildRefererOriginHeaders,
  guessFilename,
  buildContentDisposition,
} from '../src/headers.js';

import {
  createRangeSlicer,
  parseRangeHeader,
  compressStream,
  decompressStream,
  createTextReplaceStream,
  isTextualMime,
} from '../src/transforms.js';

import {
  parseImageResizeOptions,
  buildCfImageOptions,
  buildWsrvUrl,
} from '../src/images.js';

import worker from '../worker.js';

test('SSRF Protection — IP parsing and CIDR detection', () => {
  // Loopback
  assert.equal(isBlockedHost('localhost'), true);
  assert.equal(isBlockedHost('127.0.0.1'), true);
  assert.equal(isBlockedHost('127.12.34.56'), true);
  assert.equal(isBlockedHost('0.0.0.0'), true);

  // Decimal / Hex / Octal representations of loopback
  assert.equal(isBlockedHost('2130706433'), true); // 127.0.0.1
  assert.equal(isBlockedHost('0x7f000001'), true); // 127.0.0.1
  assert.equal(isBlockedHost('0177.0.0.1'), true); // 127.0.0.1

  // Cloud metadata & link-local
  assert.equal(isBlockedHost('169.254.169.254'), true);
  assert.equal(isBlockedHost('metadata.google.internal'), true);
  assert.equal(isBlockedHost('instance-data'), true);

  // Private RFC1918
  assert.equal(isBlockedHost('10.0.1.5'), true);
  assert.equal(isBlockedHost('192.168.1.1'), true);
  assert.equal(isBlockedHost('172.16.0.1'), true);
  assert.equal(isBlockedHost('172.31.255.255'), true);
  assert.equal(isBlockedHost('100.64.0.1'), true); // CGNAT

  // IPv6
  assert.equal(isBlockedHost('::1'), true);
  assert.equal(isBlockedHost('[::1]'), true);
  assert.equal(isBlockedHost('fe80::1'), true);
  assert.equal(isBlockedHost('fc00::1'), true);
  assert.equal(isBlockedHost('fd12:3456:789a::1'), true);

  // Allowed public hosts
  assert.equal(isBlockedHost('example.com'), false);
  assert.equal(isBlockedHost('1.1.1.1'), false);
  assert.equal(isBlockedHost('8.8.8.8'), false);

  // Validation function tests
  assert.throws(() => validateTargetUrl('http://127.0.0.1/admin'), /not allowed/);
  assert.throws(() => validateTargetUrl('http://169.254.169.254/latest/meta-data/'), /not allowed/);
  assert.throws(() => validateTargetUrl('ftp://example.com/file.txt'), /Only http and https/);
  assert.throws(() => validateTargetUrl('http://example.com:22/ssh'), /blocked for security/);
});

test('Smart Platform Unwrappers', () => {
  // GitHub blob -> raw
  const gh = unwrapPlatformUrl('https://github.com/torvalds/linux/blob/master/Makefile');
  assert.equal(gh.platform, 'GitHub (Raw)');
  assert.equal(gh.url, 'https://raw.githubusercontent.com/torvalds/linux/master/Makefile');

  // GitLab blob -> raw
  const gl = unwrapPlatformUrl('https://gitlab.com/gitlab-org/gitlab/-/blob/master/README.md');
  assert.equal(gl.platform, 'GitLab (Raw)');
  assert.equal(gl.url, 'https://gitlab.com/gitlab-org/gitlab/-/raw/master/README.md');

  // Dropbox dl=0 -> dl=1
  const db = unwrapPlatformUrl('https://www.dropbox.com/s/12345/archive.zip?dl=0');
  assert.equal(db.platform, 'Dropbox');
  assert.ok(db.url.includes('dl=1'));

  // Box
  const box = unwrapPlatformUrl('https://app.box.com/s/abc123xyz');
  assert.equal(box.platform, 'Box');
  assert.ok(box.url.includes('rm=box_download_shared_file&shared_name=abc123xyz'));

  // OneDrive
  const od = unwrapPlatformUrl('https://onedrive.live.com/redir?resid=12345');
  assert.equal(od.platform, 'OneDrive');
  assert.ok(od.url.includes('/download'));

  // Google Drive
  const gd = unwrapPlatformUrl('https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OIvE2up0Y/view');
  assert.equal(gd.platform, 'Google Drive');
  assert.equal(gd.fileId, '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OIvE2up0Y');
});

test('Web Crypto HMAC Signing & Expiration', async () => {
  const secret = 'super-secret-hmac-key';
  const targetUrl = 'https://cors-proxy.workers.dev/proxy?url=https%3A%2F%2Fexample.com%2Fdoc.pdf&disposition=inline';

  // Sign URL valid for 3600 seconds
  const { signedUrl, expires, sig } = await signUrl(targetUrl, secret, 3600);
  assert.ok(signedUrl.includes('&expires='));
  assert.ok(signedUrl.includes('&sig='));
  assert.equal(typeof sig, 'string');
  assert.equal(sig.length, 64); // 32 bytes hex = 64 chars

  // Verify valid URL
  const verifyRes = await verifySignedUrl(signedUrl, secret);
  assert.equal(verifyRes.valid, true);
  assert.equal(verifyRes.expires, expires);

  // Tampering detection: modify url parameter
  const tamperedUrl = signedUrl.replace('doc.pdf', 'hacked.pdf');
  const tamperedRes = await verifySignedUrl(tamperedUrl, secret);
  assert.equal(tamperedRes.valid, false);
  assert.ok(tamperedRes.error.includes('Signature mismatch'));

  // Expired URL detection
  const expiredUrl = new URL(signedUrl);
  expiredUrl.searchParams.set('expires', (Math.floor(Date.now() / 1000) - 100).toString());
  const expiredRes = await verifySignedUrl(expiredUrl.toString(), secret);
  assert.equal(expiredRes.valid, false);
  assert.ok(expiredRes.error.includes('expired'));
});

test('Headers & Payload Control', () => {
  // Custom headers JSON parsing
  const parsed = parseCustomHeaders('{"Authorization": "Bearer 123", "User-Agent": "CustomBot", "Host": "evil.com"}');
  assert.equal(parsed['Authorization'], 'Bearer 123');
  assert.equal(parsed['User-Agent'], 'CustomBot');
  assert.equal(parsed['Host'], undefined); // Host must be stripped

  // Content-Disposition builder
  const dispInline = buildContentDisposition('inline', 'sample.pdf');
  assert.ok(dispInline.startsWith('inline; filename="sample.pdf"'));

  const dispAttach = buildContentDisposition('attachment', 'report final (2026).pdf');
  assert.ok(dispAttach.startsWith('attachment; filename='));
  assert.ok(dispAttach.includes("UTF-8''"));

  // Referer & Origin spoofing
  const spoof = buildRefererOriginHeaders('https://cdn.example.com/images/cat.jpg', 'auto', 'auto');
  assert.equal(spoof['Referer'], 'https://cdn.example.com/');
  assert.equal(spoof['Origin'], 'https://cdn.example.com');

  const strip = buildRefererOriginHeaders('https://cdn.example.com/images/cat.jpg', 'strip', 'strip');
  assert.equal(strip['Referer'], undefined);
  assert.equal(strip['Origin'], undefined);
});

test('Edge Streams — Compression and Decompression', async () => {
  const sample = 'Cloudflare Workers edge compression transform stream test string! '.repeat(20);
  const origStream = new Response(sample).body;

  // Compress stream (gzip)
  const compressed = compressStream(origStream, 'gzip');
  const compressedBuffer = await new Response(compressed).arrayBuffer();
  assert.ok(compressedBuffer.byteLength < sample.length);

  // Decompress stream
  const decompressed = decompressStream(new Response(compressedBuffer).body, 'gzip');
  const restoredText = await new Response(decompressed).text();
  assert.equal(restoredText, sample);
});

test('Edge Streams — Range stream slicer', async () => {
  const bytes = new Uint8Array([10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
  const stream = new Response(bytes).body;

  // Slice bytes from index 2 to 6 (inclusive: [30, 40, 50, 60, 70])
  const sliced = stream.pipeThrough(createRangeSlicer(2, 6));
  const res = new Uint8Array(await new Response(sliced).arrayBuffer());
  assert.deepEqual(Array.from(res), [30, 40, 50, 60, 70]);

  // Range header parsing
  const parsed = parseRangeHeader('bytes=100-200');
  assert.deepEqual(parsed, { start: 100, end: 200 });
});

test('Edge Streams — Text Find and Replace', async () => {
  const original = 'Welcome to v1.api.com! Please upgrade to v1.api.com endpoints.';
  const stream = new Response(original).body;
  const replaced = stream.pipeThrough(
    createTextReplaceStream([{ from: 'v1\\.api\\.com', to: 'v2.edge.api.com', flags: 'g' }])
  );
  const result = await new Response(replaced).text();
  assert.equal(result, 'Welcome to v2.edge.api.com! Please upgrade to v2.edge.api.com endpoints.');
});

test('Worker routing and options preflight', async () => {
  // CORS Preflight
  const preflightReq = new Request('https://worker.test/proxy', { method: 'OPTIONS' });
  const preflightRes = await worker.fetch(preflightReq, {}, {});
  assert.equal(preflightRes.status, 204);
  assert.equal(preflightRes.headers.get('Access-Control-Allow-Origin'), '*');

  // UI Page
  const uiReq = new Request('https://worker.test/', { method: 'GET' });
  const uiRes = await worker.fetch(uiReq, {}, {});
  assert.equal(uiRes.status, 200);
  assert.ok(uiRes.headers.get('Content-Type').includes('text/html'));
  const uiHtml = await uiRes.text();
  assert.ok(uiHtml.includes('Universal CORS Proxy'));

  // Missing URL parameter
  const badReq = new Request('https://worker.test/proxy', { method: 'GET' });
  const badRes = await worker.fetch(badReq, {}, {});
  assert.equal(badRes.status, 400);

  // SSRF blocked host
  const ssrfReq = new Request('https://worker.test/proxy?url=http://127.0.0.1:8080/secret', { method: 'GET' });
  const ssrfRes = await worker.fetch(ssrfReq, {}, {});
  assert.equal(ssrfRes.status, 403);
});

test('Security Gate — Origin Whitelist and Token Gate', async () => {
  // Disallowed origin
  const reqBlockedOrigin = new Request('https://worker.test/proxy?url=https://example.com/data.json&allowed_origin=https://trusted.com', {
    method: 'GET',
    headers: { 'Origin': 'https://evil.com' }
  });
  const resBlockedOrigin = await worker.fetch(reqBlockedOrigin, {}, {});
  assert.equal(resBlockedOrigin.status, 403);
  assert.ok((await resBlockedOrigin.text()).includes('origin is not permitted'));

  // Token gate: missing token
  const tokenReq = new Request('https://worker.test/proxy?url=https://example.com/data.json', { method: 'GET' });
  const tokenRes = await worker.fetch(tokenReq, { PROXY_TOKEN: 'secret-token-123' }, {});
  assert.equal(tokenRes.status, 401);

  // Token gate: invalid token
  const badTokenReq = new Request('https://worker.test/proxy?url=https://example.com/data.json&token=wrong', { method: 'GET' });
  const badTokenRes = await worker.fetch(badTokenReq, { PROXY_TOKEN: 'secret-token-123' }, {});
  assert.equal(badTokenRes.status, 401);
});

test('HMAC Signing Endpoint (/sign)', async () => {
  const env = { HMAC_SECRET: 'master-key-xyz' };

  // GET /sign
  const signReq = new Request('https://worker.test/sign?url=https%3A%2F%2Fexample.com%2Fdoc.pdf&expires_in=7200', { method: 'GET' });
  const signRes = await worker.fetch(signReq, env, {});
  assert.equal(signRes.status, 200);
  const data = await signRes.json();
  assert.ok(data.signedUrl);
  assert.ok(data.sig);
  assert.equal(data.sig.length, 64);

  // POST /sign
  const postSignReq = new Request('https://worker.test/sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'https://example.com/archive.zip', expiresIn: 3600 })
  });
  const postSignRes = await worker.fetch(postSignReq, env, {});
  assert.equal(postSignRes.status, 200);
  const postData = await postSignRes.json();
  assert.ok(postData.signedUrl.includes('archive.zip'));
  assert.ok(postData.sig);
});

test('Edge Image Resizing — Options parsing and URL builder', () => {
  // Parsing parameters
  const params = new URLSearchParams('w=640&h=480&fit=cover&q=85&format=webp&blur=10&rotate=90&image_engine=auto');
  const opts = parseImageResizeOptions(params);
  assert.equal(opts.width, 640);
  assert.equal(opts.height, 480);
  assert.equal(opts.fit, 'cover');
  assert.equal(opts.quality, 85);
  assert.equal(opts.format, 'webp');
  assert.equal(opts.blur, 10);
  assert.equal(opts.rotate, 90);
  assert.equal(opts.engine, 'auto');

  // Cloudflare cf.image options builder
  const cfOpts = buildCfImageOptions(opts);
  assert.equal(cfOpts.width, 640);
  assert.equal(cfOpts.height, 480);
  assert.equal(cfOpts.fit, 'cover');
  assert.equal(cfOpts.quality, 85);
  assert.equal(cfOpts.format, 'webp');
  assert.equal(cfOpts.blur, 10);
  assert.equal(cfOpts.rotate, 90);

  // wsrv.nl URL builder
  const wsrvUrl = buildWsrvUrl('https://example.com/photo.jpg', opts);
  assert.ok(wsrvUrl.startsWith('https://wsrv.nl/?'));
  assert.ok(wsrvUrl.includes('url=https%3A%2F%2Fexample.com%2Fphoto.jpg'));
  assert.ok(wsrvUrl.includes('w=640'));
  assert.ok(wsrvUrl.includes('h=480'));
  assert.ok(wsrvUrl.includes('fit=cover'));
  assert.ok(wsrvUrl.includes('q=85'));
  assert.ok(wsrvUrl.includes('output=webp'));
  assert.ok(wsrvUrl.includes('blur=10'));
  assert.ok(wsrvUrl.includes('ro=90'));

  // Non-image request returns null
  const nonImage = parseImageResizeOptions(new URLSearchParams('url=https://example.com/file.txt'));
  assert.equal(nonImage, null);
});

