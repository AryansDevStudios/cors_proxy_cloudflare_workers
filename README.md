# 🌐 cors_proxy_cloudflare_workers

> High-performance, edge-native CORS reverse proxy deployed on Cloudflare Workers with on-the-fly streaming transformations, Web Crypto HMAC signing, multi-hop SSRF protection, smart multi-source resolvers, edge caching, and interactive developer dashboard.

![Cloudflare Workers](https://img.shields.io/badge/Runtime-Cloudflare%20Workers-F38020?logo=cloudflare&logoColor=white)
![Wrangler](https://img.shields.io/badge/Tooling-Wrangler%20v4-F38020?logo=cloudflare&logoColor=white)
![JavaScript](https://img.shields.io/badge/Language-JavaScript%20(ESM)-F7DF1E?logo=javascript&logoColor=black)
![Dependencies](https://img.shields.io/badge/Dependencies-0%20Runtime-brightgreen)
![Status](https://img.shields.io/badge/Status-Active-brightgreen)
![License](https://img.shields.io/badge/License-MIT-blue)

---

## 📖 Overview

**cors_proxy_cloudflare_workers** is a production-ready, edge-native CORS reverse proxy engineered for the Cloudflare Workers serverless edge runtime. It eliminates Cross-Origin Resource Sharing (CORS) roadblocks for web applications by proxying arbitrary upstream HTTP/HTTPS requests with fully permissive access control headers.

Built with pure Web standard APIs (Streams, Web Crypto, Fetch) and Cloudflare edge primitives (`caches.default`, `HTMLRewriter`, optional `R2`), the proxy introduces **zero runtime NPM dependencies**.

---

## ✨ Features

### 1. Advanced Header & Payload Control
- **Custom Request Headers via Query Params**: Power users can pass `?headers={"Authorization":"Bearer token","User-Agent":"CustomBot"}` to fetch resources behind token auth, basic auth, or private API keys directly through the proxy.
- **MIME-Type & Disposition Overrides**: Force headers like `?type=application/pdf` or `?disposition=inline` vs `?disposition=attachment; filename="..."` to control how browsers render or download the resource.
- **Referer & Origin Spoofing**: Automatically spoof `Referer` and `Origin` to the upstream destination (or strip via `?referer=strip`) to bypass CDN and media hotlink protection.

### 2. Edge Streaming Transformations
- **On-the-Fly Compression / Decompression**: Uses edge `CompressionStream` and `DecompressionStream` Web APIs (`?compress=gzip|deflate`, `?decompress=gzip|deflate|1`) without buffering the full payload into memory.
- **On-the-Fly Image Resizing & Conversion**: Resize, crop, convert formats (WebP, AVIF, JPEG, PNG), adjust quality, blur, and rotate images on the fly via `?w=800&h=600&fit=cover&format=webp&q=85&blur=5&rotate=90`. Utilizes Cloudflare Native Image Resizing (`cf.image`) with automatic edge fallback (`wsrv.nl`).
- **Range & Partial Content Slicing**: Full support for `Range` and `Content-Range` headers (status `206 Partial Content`), allowing clients to pause/resume multi-gigabyte downloads and stream video/audio chunk by chunk. Slices streams on the fly even if the origin server does not natively support byte ranges.
- **Stream Find-and-Replace & HTML Injection**: For textual assets (`text/*`, `application/json`, `application/javascript`, `application/xml`), performs streaming regex replacements (`?replace_from=...&replace_to=...`) and CSS/JS tag injection via `HTMLRewriter` (`?inject_css=...`, `?inject_js=...`).

### 3. Security, Tokenization & Link Expiry
- **HMAC-SHA256 Signed & Expiring URLs**: Uses Web Crypto (`crypto.subtle`) to generate tamper-proof links that expire after a set duration (`?expires=1720000000&sig=abcdef...`). Canonicalizes and cryptographically verifies query parameters.
- **Domain Whitelisting & Token Gates**: Lock proxied URLs to specific origins (`?allowed_origin=https://mysite.com` or `ALLOWED_ORIGINS` env var) to stop unauthorized 3rd-party embedding. Optional `PROXY_TOKEN` gate.
- **Strict Multi-Layer SSRF Defense**: Inspects every target host and followed redirect (up to 5 hops), blocking private IPv4 blocks (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), loopback addresses (`127.0.0.1`), link-local IPs, cloud metadata endpoints (`169.254.169.254`, `metadata.google.internal`), carrier-grade NAT (`100.64.0.0/10`), decimal/hex/octal IP formats, dangerous ports, and IPv6 equivalents.

### 4. Smart Multi-Source Resolvers
- **Native Platform Unwrappers**:
  - **Google Drive**: Auto-resolves file IDs, bypasses virus-scan confirmation pages for large files (>100MB), and streams directly.
  - **Dropbox**: Converts preview share links (`dl=0`) to direct streaming streams (`dl=1`).
  - **OneDrive & SharePoint**: Converts shortlinks and preview pages to direct downloads (`download=1`).
  - **Box**: Resolves shared box links to direct stream endpoints.
  - **GitHub & GitLab**: Unwraps web UI blob URLs to raw file URLs, follows release assets.
- **Automatic Fallback & Mirror URLs**: Specify backup mirror URLs (`?fallback=https://mirror.cdn.com/asset.pdf`). If primary upstream returns 404, 5xx, or network timeout, the worker seamlessly retries the mirror.

### 5. Caching & Persistence Controls
- **Custom Edge Cache TTL**: Control Cloudflare edge cache (`caches.default`) with `?cache_ttl=86400` or bypass with `?cache_ttl=0`.
- **Zero-Latency Background Caching**: Response stream is `tee()`-d so client receives chunks immediately while edge cache writes in the background (`ctx.waitUntil`).
- **Optional Cloudflare R2 Mirroring**: Bind an R2 bucket (`env.R2_BUCKET`) to automatically snapshot requested files, turning the worker into a permanent availability mirror for flaky origins.

### 6. Developer Experience & UI
- **Zero-Click Real-Time Generation**: No "Generate" button required — proxied URLs and code snippets update instantly on every keystroke, toggle, or parameter change.
- **Segmented Browser Delivery Toggle**: Quick 1-click toggle between **📥 Download File** (`Content-Disposition: attachment`) and **👁️ Open in Browser** (`Content-Disposition: inline`) for native browser viewing (PDFs, media, JSON).
- **Collapsible Advanced Options**: Streamlined interface that tucks secondary options (Fallback Mirror, Image Resizing, Custom Headers, Compression, Security & Cache TTL) into a clean, collapsible accordion.
- **cURL & Multi-Language Snippet Generator**: 1-click copy for **cURL**, **JavaScript `fetch`**, and **Python `requests`** code snippets synced live with active options.
- **Live HTTP Header Inspector Drawer**: Executes a `HEAD` request to inspect upstream status, roundtrip latency, MIME type, seekable byte-range support, and all response headers directly in the tool.

---

## 🛠️ Tech Stack

- **Runtime**: [Cloudflare Workers](https://workers.cloudflare.com/) (V8 Serverless Edge Engine)
- **Deployment Tooling**: [Wrangler v4](https://developers.cloudflare.com/workers/wrangler/)
- **Language**: JavaScript (ECMAScript Modules)
- **APIs**: Web Fetch API, Web Streams (`ReadableStream`, `TransformStream`, `CompressionStream`), Web Crypto (`crypto.subtle`), Cache API (`caches.default`), `HTMLRewriter`
- **Zero NPM Runtime Dependencies**: Pure edge runtime APIs

---

## 📁 Project Structure

```
cors_proxy_cloudflare_workers/
├── package.json              # NPM metadata, test runner & Wrangler devDependency
├── worker.js                 # Cloudflare Worker entry point (/proxy, /sign, /inspect, /)
├── wrangler.jsonc            # Cloudflare Workers configuration & optional bindings
├── src/
│   ├── ssrf.js               # Multi-layer SSRF filter, IP parser & CIDR validator
│   ├── crypto.js             # Web Crypto HMAC-SHA256 URL signing & expiry verification
│   ├── resolvers.js          # Smart unwrappers (GDrive, Dropbox, Box, OneDrive, GitHub, GitLab, fallback)
│   ├── headers.js            # Custom headers, MIME/disposition overrides, Referer/Origin spoofing
│   ├── transforms.js         # Edge Compression/Decompression, Range slicer, text find-replace, HTMLRewriter
│   ├── images.js             # On-the-fly Image Resizing (Cloudflare cf.image + wsrv.nl edge fallback)
│   └── ui.html.js            # Modern Web Dashboard, snippet generator, and live header inspector
├── test/
│   └── proxy.test.js         # Automated test suite (11 test suites covering all features)
└── README.md                 # Complete documentation & reference
```

---

## 📖 API & Query Parameter Reference

| Parameter | Type | Description | Example |
|---|---|---|---|
| `url` | string | **Required.** Primary target URL to fetch and proxy. | `?url=https://example.com/file.pdf` |
| `fallback` / `mirror` | string | Secondary URL to fetch if primary returns 404, 5xx, or network error. | `?fallback=https://mirror.com/file.pdf` |
| `filename` | string | Custom filename for `Content-Disposition`. | `?filename=custom-report.pdf` |
| `disposition` | string | Set to `inline` (browser view) or `attachment` (download). | `?disposition=inline` |
| `type` / `mime` | string | Overrides the response `Content-Type` header. | `?type=application/pdf` |
| `headers` | string (JSON) | Custom request headers sent to the upstream server. | `?headers={"Authorization":"Bearer token"}` |
| `referer` | string | `auto` (upstream origin), `strip` (omit), or custom URL. | `?referer=auto` |
| `origin` | string | `auto` (upstream origin), `strip` (omit), or custom URL. | `?origin=auto` |
| `compress` | string | Compresses stream at edge (`gzip` or `deflate`). | `?compress=gzip` |
| `decompress` | string | Decompresses upstream stream at edge (`gzip`, `deflate`, or `1`). | `?decompress=1` |
| `range` | string | Byte range if client cannot set request headers. | `?range=bytes=0-1048576` |
| `replace_from` | string | Text or regex pattern to replace in textual assets. | `?replace_from=old.api.com` |
| `replace_to` | string | Replacement text. | `?replace_to=new.api.com` |
| `inject_css` | string | Injects CSS tag or URL into `<head>` of HTML. | `?inject_css=body{background:#000}` |
| `inject_js` | string | Injects JS script or URL into `<body>` of HTML. | `?inject_js=https://cdn.com/script.js` |
| `expires` | number | Unix timestamp (seconds) when signed link expires. | `?expires=1720000000` |
| `sig` | string | Hex HMAC-SHA256 signature for tamper-proofing. | `?sig=abcdef0123...` |
| `allowed_origin`| string | Locks proxy response to a specific embedding origin. | `?allowed_origin=https://mysite.com` |
| `cache_ttl` | number | Cache lifetime in seconds (or `0` to bypass edge cache). | `?cache_ttl=3600` |
| `persist_r2` | string | `1` to read/write persistent snapshots to Cloudflare R2. | `?persist_r2=1` |
| `w` / `width` | number | On-the-fly target image width in pixels. | `?w=800` |
| `h` / `height` | number | On-the-fly target image height in pixels. | `?h=600` |
| `fit` | string | Image fit: `scale-down`, `cover`, `contain`, `crop`, `pad`. | `?fit=cover` |
| `format` / `output` | string | Converts format to `webp`, `avif`, `jpeg`, or `png`. | `?format=webp` |
| `q` / `quality` | number | Image quality compression level (1-100). | `?q=85` |
| `blur` | number | Blur radius (1-250). | `?blur=5` |
| `rotate` | number | Rotates image degrees (`90`, `180`, `270`). | `?rotate=90` |
| `image_engine` | string | Force engine: `auto` (default), `cf`, or `wsrv`. | `?image_engine=auto` |

---

## 💡 Practical Examples

### 1. Basic Fetch (Browser Inline Preview)
```bash
curl "https://<your-worker>.workers.dev/proxy?url=https://example.com/document.pdf&disposition=inline"
```

### 2. Download with Custom Filename
```bash
curl "https://<your-worker>.workers.dev/proxy?url=https://example.com/raw-report&disposition=attachment&filename=final-report.pdf"
```

### 3. On-the-Fly Image Resizing (Convert to WebP)
```bash
curl "https://<your-worker>.workers.dev/proxy?url=https://example.com/photo.jpg&w=800&h=600&fit=cover&format=webp&q=85"
```

### 4. Fetch Behind Bearer Token Auth
```bash
curl "https://<your-worker>.workers.dev/proxy?url=https://api.example.com/v1/data.json&headers=%7B%22Authorization%22%3A%22Bearer%20my-secret-token%22%7D"
```

### 5. Automatic Fallback & Backup Mirror
```bash
curl "https://<your-worker>.workers.dev/proxy?url=https://primary.cdn.com/asset.zip&fallback=https://backup.cdn.com/asset.zip"
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (`18.x` or later)
- Cloudflare account with Workers enabled

### 1. Clone Repository

```bash
git clone https://github.com/AryansDevStudios/cors_proxy_cloudflare_workers.git
cd cors_proxy_cloudflare_workers
```

### 2. Run Tests

```bash
npm test
```

### 3. Local Development

Run the local development proxy using Wrangler:

```bash
npx wrangler dev
```

The local proxy will be active at [http://localhost:8787](http://localhost:8787).

### 4. Production Deployment

Deploy the worker globally to Cloudflare's edge network:

```bash
npx wrangler deploy
```

---

## 🔒 Security Configuration

### Optional Token Gate
```bash
npx wrangler secret put PROXY_TOKEN
```
When set, incoming requests must supply the token via the `x-proxy-token` header or `?token=<token>` query parameter.

### Optional HMAC Secret
```bash
npx wrangler secret put HMAC_SECRET
```
When set, requests must include valid `?expires=...&sig=...` signatures generated via `/sign` or Web Crypto.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
