# 🌐 cors_proxy_cloudflare_workers

> High-performance, zero-dependency CORS reverse proxy deployed on Cloudflare Workers with multi-hop SSRF protection, Google Drive bypass, and edge caching.

![Cloudflare Workers](https://img.shields.io/badge/Runtime-Cloudflare%20Workers-F38020?logo=cloudflare&logoColor=white)
![Wrangler](https://img.shields.io/badge/Tooling-Wrangler%20v4-F38020?logo=cloudflare&logoColor=white)
![JavaScript](https://img.shields.io/badge/Language-JavaScript%20(ESM)-F7DF1E?logo=javascript&logoColor=black)
![Dependencies](https://img.shields.io/badge/Dependencies-0%20Runtime-brightgreen)
![Status](https://img.shields.io/badge/Status-Active-brightgreen)
![License](https://img.shields.io/badge/License-MIT-blue)

---

## 📖 Overview

**cors_proxy_cloudflare_workers** is a production-ready CORS reverse proxy engineered for the Cloudflare Workers serverless edge runtime. It eliminates Cross-Origin Resource Sharing (CORS) roadblocks for web applications by proxying arbitrary upstream HTTP/HTTPS requests with fully permissive access control headers.

Built with pure Web Fetch and Cloudflare standard APIs, the proxy introduces zero runtime dependencies. It utilizes the Workers Cache API (`caches.default`) combined with stream splitting (`upstream.body.tee()`) to deliver zero-latency cached responses, protects internal networks with strict multi-hop Server-Side Request Forgery (SSRF) verification, resolves Google Drive large-file virus confirmation redirects, and provides an embedded dark-mode web console.

---

## ✨ Features

- **Edge-Native CORS Bypassing**: Injects permissive `Access-Control-Allow-Origin: *` headers, supports all standard HTTP methods (`GET`, `HEAD`, `POST`, `OPTIONS`), and handles preflight requests with `86400` seconds caching.
- **Zero-Latency Edge Caching**: Utilizes `upstream.body.tee()` to stream payloads directly to the client while simultaneously populating `caches.default` in the background via `ctx.waitUntil`.
- **Comprehensive SSRF Defense**: Inspects every target host and followed redirect (up to 5 hops), blocking private IPv4 blocks (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), loopback addresses (`127.0.0.1`), link-local IPs, cloud metadata endpoints (`169.254.169.254`), and IPv6 equivalents.
- **Automated Google Drive Resolver**: Detects Google Drive sharing links (`/file/d/` and `id=`) and automates the multi-step confirmation flow required for large files exceeding Google's virus-scan limit.
- **HTTP Range & Audio/Video Seeking**: Passes `Range` headers transparently to upstream servers for seamless media streaming and seeking, automatically bypassing cache for partial content requests (`206 Partial Content`).
- **MIME & Extension Intelligence**: Built-in 60+ entry MIME-to-extension dictionary automatically determining accurate file extensions for images, videos, audio, documents, and archives.
- **Embedded Web GUI**: Clean, responsive dark-mode web interface at root (`/`) featuring instant URL proxying, parameter customization, and clipboard actions.
- **Optional Bearer Token Auth**: Protects proxy endpoints against unauthorized public usage via optional `PROXY_TOKEN` environment secrets.
- **Zero NPM Runtime Dependencies**: Requires no third-party runtime modules—runs purely on Cloudflare Workers native Web APIs.

---

## 🛠️ Tech Stack

- **Runtime**: [Cloudflare Workers](https://workers.cloudflare.com/) (V8 Serverless Edge Engine)
- **Deployment Tooling**: [Wrangler v4](https://developers.cloudflare.com/workers/wrangler/)
- **Language**: JavaScript (ECMAScript Modules)
- **APIs**: Web Fetch API, Cache API (`caches.default`), Streams API (`ReadableStream`, `tee()`)
- **Frontend**: Embedded single-file HTML5, CSS3 & Vanilla JavaScript GUI

---

## 📁 Project Structure

```
cors_proxy_cloudflare_workers/
├── package.json              # NPM metadata & Wrangler devDependency
├── worker.js                 # Complete edge proxy handler, SSRF validator & web GUI
└── wrangler.jsonc            # Cloudflare Workers configuration & compatibility date
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

### 2. Install Tooling

```bash
npm install
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

## 📖 API Usage

### Direct Proxy Endpoint

Append the destination URL to the `/proxy` route or directly as a query parameter:

```bash
# Basic proxy request
curl "https://your-worker.your-subdomain.workers.dev/proxy?url=https://example.com/api/data.json"

# With download parameter and custom filename
curl "https://your-worker.your-subdomain.workers.dev/proxy?url=https://example.com/image.png&download=true&filename=custom.png"
```

### Supported Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `url` | `string` | *(Required)* | The target URL to fetch and proxy |
| `download` | `boolean` | `false` | When `true`, forces `Content-Disposition: attachment` |
| `filename` | `string` | `auto` | Custom filename override for downloaded content |
| `token` | `string` | `none` | Optional authentication token if `PROXY_TOKEN` secret is configured |

---

## 🔒 Security Configuration

To restrict access to authorized clients only, set a secret token using Wrangler:

```bash
npx wrangler secret put PROXY_TOKEN
```

When set, incoming requests must supply the token via the `Authorization: Bearer <token>` header or `?token=<token>` query parameter.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to open an issue or submit a pull request.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
