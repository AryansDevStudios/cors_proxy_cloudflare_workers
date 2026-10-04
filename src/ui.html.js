/**
 * Developer Experience UI Module
 * Serves the modern, feature-rich developer dashboard with:
 * - Live link generator with native platform detection
 * - Code snippet generator (cURL, JavaScript Fetch, Python Requests)
 * - Live HTTP Header Inspector drawer with latency and status badges
 * - Full controls for headers, spoofing, overrides, compression, HMAC signing, and caching
 */

export const HTML_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Universal CORS Proxy — Cloudflare Workers Edge</title>
<style>
  :root {
    --bg: #090d10;
    --panel: #11171c;
    --panel-border: rgba(255, 255, 255, 0.09);
    --panel-hover: #161e24;
    --input-bg: #0a0f13;
    --text: #f0f4f6;
    --muted: #8b99a0;
    --accent: #f59e0b;
    --accent-hover: #fbbf24;
    --accent-ink: #181100;
    --cyan: #06b6d4;
    --green: #10b981;
    --red: #ef4444;
    --radius: 8px;
    --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    background: var(--bg);
    color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    padding: 32px 16px;
    display: flex;
    justify-content: center;
  }
  .container {
    width: 100%;
    max-width: 860px;
  }
  header {
    margin-bottom: 24px;
    border-bottom: 1px solid var(--panel-border);
    padding-bottom: 16px;
  }
  .title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
  }
  h1 {
    font-size: 1.35rem;
    font-weight: 700;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 10px;
    color: #fff;
  }
  .badge {
    font-size: 0.72rem;
    font-weight: 600;
    padding: 3px 8px;
    border-radius: 4px;
    background: rgba(245, 158, 11, 0.15);
    color: var(--accent);
    border: 1px solid rgba(245, 158, 11, 0.3);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .badge.green {
    background: rgba(16, 185, 129, 0.15);
    color: var(--green);
    border-color: rgba(16, 185, 129, 0.3);
  }
  .badge.cyan {
    background: rgba(6, 182, 212, 0.15);
    color: var(--cyan);
    border-color: rgba(6, 182, 212, 0.3);
  }
  p.subtitle {
    color: var(--muted);
    font-size: 0.88rem;
    margin: 6px 0 0;
    line-height: 1.45;
  }

  .card {
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-radius: var(--radius);
    padding: 22px;
    margin-bottom: 20px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
  }
  .card-title {
    font-size: 0.95rem;
    font-weight: 600;
    margin: 0 0 16px;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  label {
    display: block;
    font-size: 0.8rem;
    font-weight: 500;
    color: var(--muted);
    margin: 14px 0 6px;
  }
  label:first-child { margin-top: 0; }
  .field-desc {
    font-size: 0.75rem;
    color: #64748b;
    margin-top: 3px;
  }

  input, select, textarea {
    width: 100%;
    background: var(--input-bg);
    border: 1px solid var(--panel-border);
    color: var(--text);
    padding: 9px 12px;
    border-radius: 6px;
    font-family: var(--font-mono);
    font-size: 0.84rem;
    transition: border-color 0.15s, outline 0.15s;
  }
  input:focus, select:focus, textarea:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2);
  }
  textarea { resize: vertical; min-height: 56px; }

  .row-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }
  @media (max-width: 640px) {
    .row-2 { grid-template-columns: 1fr; }
  }

  details {
    background: rgba(0,0,0,0.18);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    margin-top: 14px;
    overflow: hidden;
  }
  summary {
    padding: 10px 14px;
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--muted);
    cursor: pointer;
    user-select: none;
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(255, 255, 255, 0.02);
  }
  summary:hover { color: var(--text); background: rgba(255, 255, 255, 0.04); }
  .details-body {
    padding: 14px;
    border-top: 1px solid var(--panel-border);
  }

  .btn-group {
    display: flex;
    gap: 10px;
    margin-top: 20px;
    flex-wrap: wrap;
  }
  button {
    background: var(--panel-hover);
    border: 1px solid var(--panel-border);
    color: var(--text);
    padding: 9px 16px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 500;
    transition: all 0.15s ease;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  button:hover {
    border-color: rgba(255, 255, 255, 0.25);
    background: #1c262e;
  }
  button.primary {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--accent-ink);
    font-weight: 700;
    flex: 1;
  }
  button.primary:hover {
    background: var(--accent-hover);
    border-color: var(--accent-hover);
    filter: none;
  }
  button.cyan-btn {
    border-color: rgba(6, 182, 212, 0.4);
    color: var(--cyan);
  }
  button.cyan-btn:hover {
    background: rgba(6, 182, 212, 0.1);
  }

  /* Code Tabs */
  .tabs {
    display: flex;
    gap: 6px;
    border-bottom: 1px solid var(--panel-border);
    margin-bottom: 12px;
  }
  .tab-btn {
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    border-radius: 0;
    color: var(--muted);
    font-size: 0.82rem;
    font-weight: 600;
    padding: 8px 12px;
    cursor: pointer;
  }
  .tab-btn.active {
    color: var(--accent);
    border-bottom-color: var(--accent);
  }

  pre {
    background: var(--input-bg);
    border: 1px solid var(--panel-border);
    padding: 14px;
    border-radius: 6px;
    overflow-x: auto;
    font-family: var(--font-mono);
    font-size: 0.8rem;
    color: #e2e8f0;
    margin: 0 0 10px;
    line-height: 1.45;
  }

  /* Inspector Drawer / Modal */
  #inspector-modal {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(4px);
    z-index: 100;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }
  #inspector-modal.active { display: flex; }
  .inspector-card {
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-radius: 10px;
    width: 100%;
    max-width: 720px;
    max-height: 88vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  }
  .inspector-header {
    padding: 16px 20px;
    border-bottom: 1px solid var(--panel-border);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .inspector-body {
    padding: 20px;
    overflow-y: auto;
  }
  .stat-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
    gap: 10px;
    margin-bottom: 18px;
  }
  .stat-item {
    background: var(--input-bg);
    border: 1px solid var(--panel-border);
    padding: 10px 12px;
    border-radius: 6px;
  }
  .stat-label {
    font-size: 0.7rem;
    color: var(--muted);
    text-transform: uppercase;
    font-weight: 600;
  }
  .stat-value {
    font-size: 0.95rem;
    font-weight: 700;
    margin-top: 4px;
    color: #fff;
    font-family: var(--font-mono);
  }

  table.headers-table {
    width: 100%;
    border-collapse: collapse;
    font-family: var(--font-mono);
    font-size: 0.78rem;
  }
  table.headers-table th, table.headers-table td {
    padding: 8px 10px;
    text-align: left;
    border-bottom: 1px solid var(--panel-border);
    vertical-align: top;
  }
  table.headers-table th {
    color: var(--muted);
    font-weight: 600;
    background: rgba(255, 255, 255, 0.02);
  }
  table.headers-table td.header-key {
    color: var(--cyan);
    font-weight: 600;
    width: 35%;
  }

  #toast {
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--accent);
    color: var(--accent-ink);
    padding: 9px 18px;
    border-radius: 6px;
    font-size: 0.85rem;
    font-weight: 700;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s ease, transform 0.2s ease;
    z-index: 200;
  }
  #toast.show { opacity: 1; transform: translate(-50%, -4px); }
</style>
</head>
<body>
<div class="container">
  <header>
    <div class="title-row">
      <h1>Universal CORS Proxy</h1>
      <div style="display:flex; gap:6px;">
        <span class="badge">Edge Streams</span>
        <span class="badge green">Web Crypto</span>
        <span class="badge cyan">Smart Resolvers</span>
      </div>
    </div>
    <p class="subtitle">High-performance edge proxy with on-the-fly streaming transforms, HMAC signed expiring links, smart platform unwrapping, and live header inspection.</p>
  </header>

  <!-- URL & Main Form -->
  <div class="card">
    <div class="card-title">
      <span>1. Target Source & Mirrors</span>
      <span id="detected-platform" class="badge cyan" style="display:none;"></span>
    </div>

    <label for="input-url">Primary Source URL</label>
    <div style="display:flex; gap:8px;">
      <input type="text" id="input-url" placeholder="https://drive.google.com/file/d/... or raw GitHub/Dropbox/file link" />
      <button id="paste-btn" type="button" title="Paste from clipboard">Paste</button>
    </div>
    <div class="field-desc">Supports direct files, Google Drive, Dropbox, Box, OneDrive, SharePoint, GitHub/GitLab raw & releases.</div>

    <label for="fallback-url">Fallback / Backup Mirror URL (optional)</label>
    <input type="text" id="fallback-url" placeholder="https://mirror.cdn.com/fallback-asset.pdf" />
    <div class="field-desc">If the primary URL returns 404, 5xx, or network failure, the worker automatically retries this secondary mirror.</div>

    <!-- Accordion 1: Advanced Headers & Spoofing -->
    <details>
      <summary>Advanced Headers & Anti-Hotlink Spoofing</summary>
      <div class="details-body">
        <div class="row-2">
          <div>
            <label for="referer-mode">Referer Spoofing</label>
            <select id="referer-mode">
              <option value="auto">Auto (Spoof to Upstream Origin)</option>
              <option value="strip">Strip Referer (Omit completely)</option>
              <option value="custom">Custom Referer URL</option>
            </select>
          </div>
          <div>
            <label for="custom-referer">Custom Referer (if Custom selected)</label>
            <input type="text" id="custom-referer" placeholder="https://upstream.com/" disabled />
          </div>
        </div>

        <label for="custom-headers">Custom Upstream Request Headers (JSON)</label>
        <textarea id="custom-headers" placeholder='{"Authorization": "Bearer token", "User-Agent": "CustomBot"}'></textarea>
        <div class="field-desc">Inject custom headers for resources behind bearer tokens, basic auth, or private API gates.</div>
      </div>
    </details>

    <!-- Accordion 2: Edge Transforms & Overrides -->
    <details>
      <summary>Edge Transformations & Payload Overrides</summary>
      <div class="details-body">
        <div class="row-2">
          <div>
            <label for="disposition-mode">Content-Disposition</label>
            <select id="disposition-mode">
              <option value="attachment">Download (attachment)</option>
              <option value="inline">Browser Preview (inline)</option>
            </select>
          </div>
          <div>
            <label for="filename">Custom Filename Override</label>
            <input type="text" id="filename" placeholder="document.pdf" />
          </div>
        </div>

        <div class="row-2">
          <div>
            <label for="mime-override">MIME-Type Override</label>
            <input type="text" id="mime-override" placeholder="application/pdf, video/mp4, text/plain (optional)" />
          </div>
          <div>
            <label for="compress-mode">Edge Compression</label>
            <select id="compress-mode">
              <option value="none">None (Preserve Original)</option>
              <option value="gzip">gzip (Stream Compress)</option>
              <option value="deflate">deflate (Stream Compress)</option>
            </select>
          </div>
        </div>

        <div class="row-2">
          <div>
            <label for="replace-from">Text/JSON Find Pattern (Regex or String)</label>
            <input type="text" id="replace-from" placeholder="e.g. api.old.com or https://v1/" />
          </div>
          <div>
            <label for="replace-to">Replacement String</label>
            <input type="text" id="replace-to" placeholder="e.g. api.new.com or https://v2/" />
          </div>
        </div>
      </div>
    </details>

    <!-- Accordion: On-the-Fly Image Resizing -->
    <details>
      <summary>On-the-Fly Image Resizing & Format Conversion</summary>
      <div class="details-body">
        <div class="row-2">
          <div>
            <label for="img-width">Width (px)</label>
            <input type="number" id="img-width" placeholder="e.g. 800 (optional)" min="1" />
          </div>
          <div>
            <label for="img-height">Height (px)</label>
            <input type="number" id="img-height" placeholder="e.g. 600 (optional)" min="1" />
          </div>
        </div>

        <div class="row-2">
          <div>
            <label for="img-fit">Fit Mode</label>
            <select id="img-fit">
              <option value="scale-down">scale-down (Preserve aspect, downscale only)</option>
              <option value="cover">cover (Crop to cover dimensions)</option>
              <option value="contain">contain (Fit entirely inside dimensions)</option>
              <option value="crop">crop (Extract exact bounds)</option>
              <option value="pad">pad (Pad canvas with background)</option>
            </select>
          </div>
          <div>
            <label for="img-format">Output Format</label>
            <select id="img-format">
              <option value="">Auto (Original format)</option>
              <option value="webp">WebP (High efficiency)</option>
              <option value="avif">AVIF (Next-gen compression)</option>
              <option value="jpeg">JPEG</option>
              <option value="png">PNG</option>
            </select>
          </div>
        </div>

        <div class="row-2">
          <div>
            <label for="img-quality">Quality (1-100)</label>
            <input type="number" id="img-quality" placeholder="85" min="1" max="100" />
          </div>
          <div>
            <label for="img-blur">Blur (0-250)</label>
            <input type="number" id="img-blur" placeholder="0 (No blur)" min="0" max="250" />
          </div>
        </div>

        <div class="row-2">
          <div>
            <label for="img-rotate">Rotate</label>
            <select id="img-rotate">
              <option value="">0° (No rotation)</option>
              <option value="90">90°</option>
              <option value="180">180°</option>
              <option value="270">270°</option>
            </select>
          </div>
          <div>
            <label for="img-engine">Resizing Engine</label>
            <select id="img-engine">
              <option value="auto">Auto (Cloudflare cf.image + wsrv.nl fallback)</option>
              <option value="cf">Cloudflare Native Edge (cf.image)</option>
              <option value="wsrv">wsrv.nl Edge Engine</option>
            </select>
          </div>
        </div>
      </div>
    </details>

    <!-- Accordion 3: Security, HMAC Signing & Caching -->
    <details>
      <summary>Security, HMAC Signed Links & Caching</summary>
      <div class="details-body">
        <div class="row-2">
          <div>
            <label for="cache-ttl">Edge Cache TTL</label>
            <select id="cache-ttl">
              <option value="86400">1 Day (86400s - Standard)</option>
              <option value="3600">1 Hour (3600s)</option>
              <option value="604800">7 Days (604800s)</option>
              <option value="0">Bypass Edge Cache</option>
            </select>
          </div>
          <div>
            <label for="allowed-origin">Origin Whitelist Lock (Embed gate)</label>
            <input type="text" id="allowed-origin" placeholder="https://mysite.com (optional)" />
          </div>
        </div>

        <div class="row-2">
          <div>
            <label for="hmac-expiry">HMAC Link Expiration Duration</label>
            <select id="hmac-expiry">
              <option value="none">No Expiry (Open link)</option>
              <option value="3600">Expires in 1 Hour</option>
              <option value="86400">Expires in 24 Hours</option>
              <option value="604800">Expires in 7 Days</option>
            </select>
          </div>
          <div>
            <label for="hmac-secret">HMAC Secret Key (for Tamper-proof Signing)</label>
            <input type="password" id="hmac-secret" placeholder="Your secret key..." />
          </div>
        </div>
      </div>
    </details>

    <div class="btn-group">
      <button class="primary" id="generate-btn" type="button">Generate Proxied Link</button>
      <button class="cyan-btn" id="inspect-btn" type="button">Inspect Headers</button>
    </div>
  </div>

  <!-- Generated Output & Snippets -->
  <div class="card" id="output-card" style="display:none;">
    <div class="card-title">
      <span>2. Proxied Link & Code Snippets</span>
      <button id="open-link-btn" type="button" style="padding:4px 10px; font-size:0.75rem;">Open Link &#8599;</button>
    </div>

    <label for="output-url">Proxied URL</label>
    <textarea id="output-url" readonly></textarea>
    <div class="btn-group" style="margin-top:10px;">
      <button id="copy-link-btn" class="primary" type="button">Copy Proxied Link</button>
    </div>

    <!-- Snippets Tabs -->
    <div style="margin-top:24px;">
      <div class="tabs">
        <button class="tab-btn active" data-tab="curl">cURL</button>
        <button class="tab-btn" data-tab="fetch">JavaScript (fetch)</button>
        <button class="tab-btn" data-tab="python">Python (requests)</button>
      </div>

      <div id="tab-curl" class="tab-content">
        <pre><code id="code-curl"></code></pre>
        <button type="button" class="copy-snippet-btn" data-target="code-curl">Copy cURL</button>
      </div>
      <div id="tab-fetch" class="tab-content" style="display:none;">
        <pre><code id="code-fetch"></code></pre>
        <button type="button" class="copy-snippet-btn" data-target="code-fetch">Copy Fetch Snippet</button>
      </div>
      <div id="tab-python" class="tab-content" style="display:none;">
        <pre><code id="code-python"></code></pre>
        <button type="button" class="copy-snippet-btn" data-target="code-python">Copy Python Snippet</button>
      </div>
    </div>
  </div>
</div>

<!-- Live Inspector Modal -->
<div id="inspector-modal">
  <div class="inspector-card">
    <div class="inspector-header">
      <div style="display:flex; align-items:center; gap:10px;">
        <h3 style="margin:0; font-size:1.05rem;">Upstream Live Inspector</h3>
        <span id="inspect-status-badge" class="badge">TESTING...</span>
      </div>
      <button id="close-inspector-btn" type="button" style="padding:4px 10px;">&times; Close</button>
    </div>
    <div class="inspector-body">
      <div class="stat-grid">
        <div class="stat-item">
          <div class="stat-label">MIME / Content-Type</div>
          <div class="stat-value" id="inspect-mime">-</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Content Length</div>
          <div class="stat-value" id="inspect-size">-</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Range Seeking</div>
          <div class="stat-value" id="inspect-range">-</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Edge Cache</div>
          <div class="stat-value" id="inspect-cache">-</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Roundtrip Latency</div>
          <div class="stat-value" id="inspect-latency">-</div>
        </div>
      </div>

      <div style="font-size:0.8rem; font-weight:600; color:var(--muted); margin-bottom:8px;">ALL RESPONSE HEADERS</div>
      <div style="max-height: 280px; overflow-y: auto; border: 1px solid var(--panel-border); border-radius: 6px;">
        <table class="headers-table" id="headers-table">
          <thead>
            <tr><th>Header</th><th>Value</th></tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
    </div>
  </div>
</div>

<div id="toast"></div>

<script>
  const inputUrl = document.getElementById('input-url');
  const fallbackUrl = document.getElementById('fallback-url');
  const detectedPlatform = document.getElementById('detected-platform');
  const refererMode = document.getElementById('referer-mode');
  const customReferer = document.getElementById('custom-referer');
  const customHeaders = document.getElementById('custom-headers');
  const dispositionMode = document.getElementById('disposition-mode');
  const filename = document.getElementById('filename');
  const mimeOverride = document.getElementById('mime-override');
  const compressMode = document.getElementById('compress-mode');
  const replaceFrom = document.getElementById('replace-from');
  const replaceTo = document.getElementById('replace-to');
  const cacheTtl = document.getElementById('cache-ttl');
  const allowedOrigin = document.getElementById('allowed-origin');
  const hmacExpiry = document.getElementById('hmac-expiry');
  const hmacSecret = document.getElementById('hmac-secret');

  const imgWidth = document.getElementById('img-width');
  const imgHeight = document.getElementById('img-height');
  const imgFit = document.getElementById('img-fit');
  const imgFormat = document.getElementById('img-format');
  const imgQuality = document.getElementById('img-quality');
  const imgBlur = document.getElementById('img-blur');
  const imgRotate = document.getElementById('img-rotate');
  const imgEngine = document.getElementById('img-engine');

  const outputCard = document.getElementById('output-card');
  const outputUrl = document.getElementById('output-url');
  const codeCurl = document.getElementById('code-curl');
  const codeFetch = document.getElementById('code-fetch');
  const codePython = document.getElementById('code-python');
  const toast = document.getElementById('toast');

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
  }

  // Toggle custom referer input
  refererMode.addEventListener('change', () => {
    customReferer.disabled = refererMode.value !== 'custom';
  });

  // Detect platform on typing
  inputUrl.addEventListener('input', () => {
    const val = inputUrl.value.trim().toLowerCase();
    let platform = null;
    if (val.includes('drive.google.com') || val.includes('docs.google.com')) platform = 'Google Drive';
    else if (val.includes('dropbox.com')) platform = 'Dropbox Direct';
    else if (val.includes('box.com')) platform = 'Box Direct';
    else if (val.includes('1drv.ms') || val.includes('onedrive.live.com') || val.includes('sharepoint.com')) platform = 'OneDrive / SharePoint';
    else if (val.includes('github.com')) platform = 'GitHub Unwrapper';
    else if (val.includes('gitlab.com')) platform = 'GitLab Unwrapper';

    if (platform) {
      detectedPlatform.textContent = platform;
      detectedPlatform.style.display = 'inline-block';
    } else {
      detectedPlatform.style.display = 'none';
    }
  });

  document.getElementById('paste-btn').addEventListener('click', async () => {
    try {
      inputUrl.value = await navigator.clipboard.readText();
      inputUrl.dispatchEvent(new Event('input'));
      showToast('Pasted source URL');
    } catch {
      showToast('Clipboard access denied');
    }
  });

  // Client-side HMAC Signing using Web Crypto
  async function computeHmacSignature(secret, canonicalStr) {
    const enc = new TextEncoder();
    const key = await window.crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await window.crypto.subtle.sign('HMAC', key, enc.encode(canonicalStr));
    return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Canonical query string builder
  function buildCanonicalQuery(urlObj) {
    const params = new URLSearchParams(urlObj.search);
    params.delete('sig');
    const sorted = Array.from(params.entries()).sort(([aK, aV], [bK, bV]) => {
      if (aK === bK) return aV.localeCompare(bV);
      return aK.localeCompare(bK);
    });
    const cleanParams = new URLSearchParams();
    for (const [k, v] of sorted) cleanParams.append(k, v);
    return \`\${urlObj.pathname}?\${cleanParams.toString()}\`;
  }

  async function generateProxiedUrl() {
    const url = inputUrl.value.trim();
    if (!url) {
      showToast('Please enter a source URL');
      return null;
    }

    const proxied = new URL('/proxy', window.location.origin);
    proxied.searchParams.set('url', url);

    if (fallbackUrl.value.trim()) proxied.searchParams.set('fallback', fallbackUrl.value.trim());
    if (filename.value.trim()) proxied.searchParams.set('filename', filename.value.trim());

    if (dispositionMode.value === 'inline') {
      proxied.searchParams.set('disposition', 'inline');
    } else {
      proxied.searchParams.set('disposition', 'attachment');
    }

    if (mimeOverride.value.trim()) proxied.searchParams.set('type', mimeOverride.value.trim());

    if (refererMode.value === 'strip') {
      proxied.searchParams.set('referer', 'strip');
    } else if (refererMode.value === 'custom' && customReferer.value.trim()) {
      proxied.searchParams.set('referer', customReferer.value.trim());
    }

    if (customHeaders.value.trim()) {
      try {
        JSON.parse(customHeaders.value.trim());
        proxied.searchParams.set('headers', customHeaders.value.trim());
      } catch {
        showToast('Invalid JSON in custom headers');
        return null;
      }
    }

    if (compressMode.value !== 'none') proxied.searchParams.set('compress', compressMode.value);
    if (replaceFrom.value.trim()) {
      proxied.searchParams.set('replace_from', replaceFrom.value.trim());
      proxied.searchParams.set('replace_to', replaceTo.value);
    }

    if (cacheTtl.value !== '86400') proxied.searchParams.set('cache_ttl', cacheTtl.value);
    if (allowedOrigin.value.trim()) proxied.searchParams.set('allowed_origin', allowedOrigin.value.trim());

    // Image Resizing Options
    if (imgWidth.value.trim()) proxied.searchParams.set('w', imgWidth.value.trim());
    if (imgHeight.value.trim()) proxied.searchParams.set('h', imgHeight.value.trim());
    if (imgWidth.value.trim() || imgHeight.value.trim()) {
      if (imgFit.value) proxied.searchParams.set('fit', imgFit.value);
    }
    if (imgFormat.value) proxied.searchParams.set('format', imgFormat.value);
    if (imgQuality.value.trim()) proxied.searchParams.set('q', imgQuality.value.trim());
    if (imgBlur.value.trim() && imgBlur.value.trim() !== '0') proxied.searchParams.set('blur', imgBlur.value.trim());
    if (imgRotate.value) proxied.searchParams.set('rotate', imgRotate.value);
    if (imgEngine.value !== 'auto') proxied.searchParams.set('image_engine', imgEngine.value);

    // HMAC Signing
    const expirySec = hmacExpiry.value;
    const secret = hmacSecret.value.trim();
    if (expirySec !== 'none') {
      const expires = Math.floor(Date.now() / 1000) + parseInt(expirySec, 10);
      proxied.searchParams.set('expires', expires.toString());
      if (secret) {
        const canonical = buildCanonicalQuery(proxied);
        const sig = await computeHmacSignature(secret, canonical);
        proxied.searchParams.set('sig', sig);
      }
    }

    return proxied.toString();
  }

  function updateCodeSnippets(finalUrl) {
    codeCurl.textContent = \`curl -L -s -O -J "\${finalUrl}"\`;
    codeFetch.textContent = \`// JavaScript fetch
const response = await fetch("\${finalUrl}");
if (!response.ok) throw new Error(\\\`HTTP \\\${response.status}: \\\${response.statusText}\\\`);

// For files / downloads:
const blob = await response.blob();
const downloadUrl = URL.createObjectURL(blob);
// e.g. window.open(downloadUrl) or attach to <a download>

// Or for JSON / Text APIs:
// const data = await response.json();\`;

    codePython.textContent = \`# Python requests streaming download
import requests

url = "\${finalUrl}"
with requests.get(url, stream=True) as response:
    response.raise_for_status()
    filename = "downloaded_file"
    with open(filename, "wb") as f:
        for chunk in response.iter_content(chunk_size=65536):
            f.write(chunk)
print(f"Saved: {filename}")\`;
  }

  document.getElementById('generate-btn').addEventListener('click', async () => {
    const finalUrl = await generateProxiedUrl();
    if (!finalUrl) return;

    outputUrl.value = finalUrl;
    updateCodeSnippets(finalUrl);
    outputCard.style.display = 'block';
    outputCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    showToast('Proxied URL generated');
  });

  document.getElementById('copy-link-btn').addEventListener('click', async () => {
    if (!outputUrl.value) return;
    await navigator.clipboard.writeText(outputUrl.value);
    showToast('Link copied to clipboard!');
  });

  document.getElementById('open-link-btn').addEventListener('click', () => {
    if (outputUrl.value) window.open(outputUrl.value, '_blank');
  });

  // Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
      btn.classList.add('active');
      document.getElementById(\`tab-\${btn.dataset.tab}\`).style.display = 'block';
    });
  });

  // Copy Snippet buttons
  document.querySelectorAll('.copy-snippet-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const code = document.getElementById(btn.dataset.target).textContent;
      await navigator.clipboard.writeText(code);
      showToast('Code snippet copied!');
    });
  });

  // Helper formatting size
  function formatBytes(bytes) {
    if (!bytes || isNaN(bytes)) return 'Unknown';
    const num = parseInt(bytes, 10);
    if (num < 1024) return \`\${num} B\`;
    if (num < 1048576) return \`\${(num / 1024).toFixed(1)} KB\`;
    if (num < 1073741824) return \`\${(num / 1048576).toFixed(1)} MB\`;
    return \`\${(num / 1073741824).toFixed(2)} GB\`;
  }

  // Live Inspector
  const inspectorModal = document.getElementById('inspector-modal');
  const inspectStatusBadge = document.getElementById('inspect-status-badge');
  const inspectMime = document.getElementById('inspect-mime');
  const inspectSize = document.getElementById('inspect-size');
  const inspectRange = document.getElementById('inspect-range');
  const inspectCache = document.getElementById('inspect-cache');
  const inspectLatency = document.getElementById('inspect-latency');
  const headersTableBody = document.querySelector('#headers-table tbody');

  document.getElementById('close-inspector-btn').addEventListener('click', () => {
    inspectorModal.classList.remove('active');
  });

  document.getElementById('inspect-btn').addEventListener('click', async () => {
    const finalUrl = await generateProxiedUrl();
    if (!finalUrl) return;

    inspectorModal.classList.add('active');
    inspectStatusBadge.textContent = 'FETCHING HEAD...';
    inspectStatusBadge.className = 'badge';
    inspectMime.textContent = '...';
    inspectSize.textContent = '...';
    inspectRange.textContent = '...';
    inspectCache.textContent = '...';
    inspectLatency.textContent = '...';
    headersTableBody.innerHTML = '<tr><td colspan="2" style="text-align:center;">Sending HEAD request...</td></tr>';

    const startTime = performance.now();
    try {
      const res = await fetch(finalUrl, { method: 'HEAD' });
      const duration = Math.round(performance.now() - startTime);

      inspectLatency.textContent = \`\${duration} ms\`;
      inspectStatusBadge.textContent = \`\${res.status} \${res.statusText || 'OK'}\`;
      inspectStatusBadge.className = res.ok ? 'badge green' : 'badge';

      const contentType = res.headers.get('content-type') || 'unknown';
      inspectMime.textContent = contentType.split(';')[0];

      const len = res.headers.get('content-length');
      inspectSize.textContent = formatBytes(len);

      const acceptRanges = res.headers.get('accept-ranges');
      inspectRange.textContent = acceptRanges === 'bytes' ? 'Yes (bytes)' : 'None';

      const cacheStatus = res.headers.get('x-cache-status') || 'BYPASS';
      inspectCache.textContent = cacheStatus;

      // Populate headers table
      headersTableBody.innerHTML = '';
      const headerEntries = Array.from(res.headers.entries()).sort(([a], [b]) => a.localeCompare(b));
      for (const [k, v] of headerEntries) {
        const row = document.createElement('tr');
        row.innerHTML = \`<td class="header-key">\${k}</td><td>\${v}</td>\`;
        headersTableBody.appendChild(row);
      }
    } catch (err) {
      inspectStatusBadge.textContent = 'FAILED';
      inspectLatency.textContent = '-';
      headersTableBody.innerHTML = \`<tr><td colspan="2" style="color:var(--red);">Inspection error: \${err.message}</td></tr>\`;
    }
  });
</script>
</body>
</html>`;
