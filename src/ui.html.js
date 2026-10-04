/**
 * Developer Experience UI Module
 * Serves the modern, reactive developer dashboard with:
 * - Real-time zero-click link generation (updates live on any keystroke or toggle)
 * - Modern segmented delivery toggle (Download vs Browser Native View)
 * - Streamlined primary card with clean "Advanced Options" grouping
 * - Live code snippets (cURL, JavaScript Fetch, Python Requests)
 * - Live HTTP Header Inspector drawer with latency and status breakdown
 */

export const HTML_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Universal CORS Proxy — Cloudflare Workers Edge</title>
<style>
  :root {
    --bg: #070a0d;
    --panel: #0f151a;
    --panel-border: rgba(255, 255, 255, 0.08);
    --panel-hover: #151e24;
    --input-bg: #090d11;
    --text: #f1f5f9;
    --muted: #94a3b8;
    --accent: #f59e0b;
    --accent-glow: rgba(245, 158, 11, 0.25);
    --accent-ink: #140d00;
    --cyan: #06b6d4;
    --green: #10b981;
    --red: #ef4444;
    --radius-lg: 12px;
    --radius-md: 8px;
    --radius-sm: 6px;
    --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    background: radial-gradient(circle at top center, #111a22 0%, var(--bg) 70%);
    color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    padding: 32px 16px;
    display: flex;
    justify-content: center;
  }
  .container {
    width: 100%;
    max-width: 880px;
  }

  /* Header */
  header {
    margin-bottom: 24px;
    border-bottom: 1px solid var(--panel-border);
    padding-bottom: 20px;
  }
  .title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
  }
  h1 {
    font-size: 1.45rem;
    font-weight: 700;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 10px;
    letter-spacing: -0.3px;
    color: #fff;
  }
  .badges {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }
  .badge {
    font-size: 0.72rem;
    font-weight: 600;
    padding: 3px 9px;
    border-radius: 999px;
    background: rgba(245, 158, 11, 0.12);
    color: var(--accent);
    border: 1px solid rgba(245, 158, 11, 0.3);
    letter-spacing: 0.3px;
  }
  .badge.green {
    background: rgba(16, 185, 129, 0.12);
    color: var(--green);
    border-color: rgba(16, 185, 129, 0.3);
  }
  .badge.cyan {
    background: rgba(6, 182, 212, 0.12);
    color: var(--cyan);
    border-color: rgba(6, 182, 212, 0.3);
  }
  p.subtitle {
    color: var(--muted);
    font-size: 0.88rem;
    margin: 8px 0 0;
    line-height: 1.5;
  }

  /* Cards */
  .card {
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-radius: var(--radius-lg);
    padding: 22px;
    margin-bottom: 20px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
  }
  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }
  .card-title {
    font-size: 0.96rem;
    font-weight: 600;
    margin: 0;
    color: #fff;
    display: flex;
    align-items: center;
    gap: 8px;
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
    font-size: 0.74rem;
    color: #64748b;
    margin-top: 4px;
    line-height: 1.4;
  }

  input, select, textarea {
    width: 100%;
    background: var(--input-bg);
    border: 1px solid var(--panel-border);
    color: var(--text);
    padding: 10px 13px;
    border-radius: var(--radius-md);
    font-family: var(--font-mono);
    font-size: 0.84rem;
    transition: all 0.15s ease;
  }
  input:focus, select:focus, textarea:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-glow);
  }
  textarea { resize: vertical; min-height: 60px; }

  .input-with-button {
    display: flex;
    gap: 8px;
  }

  /* Segmented Toggle for Delivery Mode */
  .segmented-control {
    display: inline-flex;
    background: var(--input-bg);
    border: 1px solid var(--panel-border);
    border-radius: var(--radius-md);
    padding: 3px;
    gap: 3px;
    width: 100%;
  }
  .segmented-btn {
    flex: 1;
    background: transparent;
    border: none;
    color: var(--muted);
    padding: 8px 12px;
    border-radius: var(--radius-sm);
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }
  .segmented-btn:hover { color: var(--text); }
  .segmented-btn.active {
    background: #1e293b;
    color: #fff;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
  }
  .segmented-btn.active.download-active {
    background: rgba(245, 158, 11, 0.18);
    color: var(--accent);
  }
  .segmented-btn.active.inline-active {
    background: rgba(6, 182, 212, 0.18);
    color: var(--cyan);
  }

  .grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }
  @media (max-width: 640px) {
    .grid-2 { grid-template-columns: 1fr; }
  }

  /* Advanced Options Accordion */
  details.advanced-card {
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid var(--panel-border);
    border-radius: var(--radius-lg);
    margin-top: 18px;
    overflow: hidden;
    transition: border-color 0.2s;
  }
  details.advanced-card[open] {
    border-color: rgba(255, 255, 255, 0.16);
  }
  details.advanced-card > summary {
    padding: 14px 18px;
    font-size: 0.86rem;
    font-weight: 600;
    color: var(--text);
    cursor: pointer;
    user-select: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(255, 255, 255, 0.02);
    transition: background 0.15s;
  }
  details.advanced-card > summary:hover {
    background: rgba(255, 255, 255, 0.04);
  }
  .advanced-body {
    padding: 20px;
    border-top: 1px solid var(--panel-border);
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  .sub-section {
    background: rgba(255, 255, 255, 0.015);
    border: 1px solid var(--panel-border);
    border-radius: var(--radius-md);
    padding: 16px;
  }
  .sub-title {
    font-size: 0.84rem;
    font-weight: 600;
    color: #e2e8f0;
    margin: 0 0 12px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  /* Live Output Banner */
  .output-box {
    position: relative;
    margin-top: 6px;
  }
  .output-textarea {
    font-size: 0.84rem;
    line-height: 1.45;
    background: #06090c;
    border: 1px solid rgba(245, 158, 11, 0.35);
    color: #f8fafc;
    padding: 12px 14px;
    border-radius: var(--radius-md);
    word-break: break-all;
    min-height: 56px;
  }

  .btn-row {
    display: flex;
    gap: 8px;
    margin-top: 12px;
    flex-wrap: wrap;
  }
  button {
    background: var(--panel-hover);
    border: 1px solid var(--panel-border);
    color: var(--text);
    padding: 9px 15px;
    border-radius: var(--radius-md);
    cursor: pointer;
    font-size: 0.84rem;
    font-weight: 600;
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
  }
  button.primary:hover {
    background: var(--accent-hover);
    border-color: var(--accent-hover);
    box-shadow: 0 0 15px var(--accent-glow);
  }
  button.cyan-btn {
    border-color: rgba(6, 182, 212, 0.4);
    color: var(--cyan);
  }
  button.cyan-btn:hover {
    background: rgba(6, 182, 212, 0.12);
  }

  /* Code Tabs */
  .tabs {
    display: flex;
    gap: 6px;
    border-bottom: 1px solid var(--panel-border);
    margin: 18px 0 12px;
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
    background: #06090c;
    border: 1px solid var(--panel-border);
    padding: 14px;
    border-radius: var(--radius-md);
    overflow-x: auto;
    font-family: var(--font-mono);
    font-size: 0.8rem;
    color: #e2e8f0;
    margin: 0 0 10px;
    line-height: 1.45;
  }

  /* Live Inspector Drawer / Modal */
  #inspector-modal {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.75);
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
    border-radius: var(--radius-lg);
    width: 100%;
    max-width: 740px;
    max-height: 88vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 15px 50px rgba(0, 0, 0, 0.6);
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
    border-radius: var(--radius-md);
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

  /* Live Pulse Indicator */
  .live-pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 0.72rem;
    color: var(--green);
    font-weight: 600;
    background: rgba(16, 185, 129, 0.1);
    border: 1px solid rgba(16, 185, 129, 0.25);
    padding: 2px 8px;
    border-radius: 999px;
  }
  .pulse-dot {
    width: 6px;
    height: 6px;
    background: var(--green);
    border-radius: 50%;
    box-shadow: 0 0 6px var(--green);
  }

  #toast {
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translate(-50%, 8px);
    background: var(--accent);
    color: var(--accent-ink);
    padding: 9px 20px;
    border-radius: var(--radius-md);
    font-size: 0.85rem;
    font-weight: 700;
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.5);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s ease, transform 0.2s ease;
    z-index: 200;
  }
  #toast.show { opacity: 1; transform: translate(-50%, 0); }
</style>
</head>
<body>
<div class="container">
  <header>
    <div class="title-row">
      <h1>Universal CORS Proxy</h1>
      <div class="badges">
        <span class="live-pill" title="Options are auto-saved to browser cache"><span class="pulse-dot"></span> AUTO-SAVED</span>
        <span class="badge">Edge Streams</span>
        <span class="badge green">Web Crypto</span>
        <span class="badge cyan">Image Engine</span>
      </div>
    </div>
    <p class="subtitle">Real-time edge proxy generator with on-the-fly streaming transforms, image resizing, HMAC signed links, and instant code snippets.</p>
  </header>

  <!-- Main Config Card -->
  <div class="card">
    <div class="card-header">
      <h2 class="card-title">
        <span>Target Source URL</span>
      </h2>
      <div style="display:flex; align-items:center; gap:8px;">
        <span id="detected-platform" class="badge cyan" style="display:none;"></span>
        <button id="reset-btn" type="button" style="padding:4px 10px; font-size:0.75rem; background:transparent;" title="Reset all form options and clear cached state">🔄 Reset Form</button>
      </div>
    </div>

    <!-- Primary Source URL Input -->
    <div class="input-with-button">
      <input type="text" id="input-url" autofocus placeholder="https://example.com/asset.pdf or Google Drive, Dropbox, Box, GitHub link..." />
      <button id="paste-btn" type="button" title="Paste from clipboard">📋 Paste</button>
    </div>
    <div class="field-desc">Supports direct files, Google Drive (virus-scan bypass), Dropbox, OneDrive, Box, GitHub, GitLab, and direct media streams.</div>

    <!-- Quick Settings: Delivery Mode Toggle & Filename -->
    <div class="grid-2" style="margin-top: 16px;">
      <div>
        <label>Browser Action / Delivery Mode</label>
        <div class="segmented-control" id="delivery-segmented">
          <button type="button" class="segmented-btn active download-active" id="btn-mode-download" data-mode="attachment">
            📥 Download File
          </button>
          <button type="button" class="segmented-btn" id="btn-mode-inline" data-mode="inline">
            👁️ Open in Browser
          </button>
        </div>
        <div class="field-desc" id="delivery-desc">Forces Content-Disposition: attachment for downloads.</div>
      </div>

      <div>
        <label for="filename">Custom Filename (optional)</label>
        <input type="text" id="filename" placeholder="e.g. document.pdf" />
        <div class="field-desc">Sets the downloaded file name with UTF-8 RFC 5987 encoding.</div>
      </div>
    </div>

    <!-- Collapsible Advanced Options -->
    <details class="advanced-card" id="advanced-details">
      <summary>
        <span>⚙️ Advanced Options <span style="font-weight:400; color:var(--muted); font-size:0.78rem;">(Fallback Mirror, Image Resizing, Headers, Security)</span></span>
        <span style="font-size:0.8rem; color:var(--muted);">&#x25BC;</span>
      </summary>

      <div class="advanced-body">
        <!-- 1. Fallback & Backup Mirror -->
        <div class="sub-section">
          <div class="sub-title">🔄 Fallback & Backup Mirror URL</div>
          <label for="fallback-url">Fallback / Mirror URL (Optional)</label>
          <input type="text" id="fallback-url" placeholder="https://backup-mirror.cdn.com/asset.pdf" />
          <div class="field-desc">If the primary URL returns 404, 5xx, or network failure, the proxy seamlessly serves from this backup mirror.</div>
        </div>

        <!-- 2. On-the-Fly Image Resizing -->
        <div class="sub-section">
          <div class="sub-title">🖼️ On-the-Fly Image Resizing & Format Conversion</div>
          <div class="grid-2">
            <div>
              <label for="img-width">Width (px)</label>
              <input type="number" id="img-width" placeholder="e.g. 800" min="1" />
            </div>
            <div>
              <label for="img-height">Height (px)</label>
              <input type="number" id="img-height" placeholder="e.g. 600" min="1" />
            </div>
          </div>

          <div class="grid-2">
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

          <div class="grid-2">
            <div>
              <label for="img-quality">Quality (1-100)</label>
              <input type="number" id="img-quality" placeholder="85" min="1" max="100" />
            </div>
            <div>
              <label for="img-blur">Blur (0-250)</label>
              <input type="number" id="img-blur" placeholder="0 (No blur)" min="0" max="250" />
            </div>
          </div>

          <div class="grid-2">
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
              <label for="img-engine">Engine</label>
              <select id="img-engine">
                <option value="auto">Auto (Cloudflare cf.image + wsrv.nl fallback)</option>
                <option value="cf">Cloudflare Native Edge (cf.image)</option>
                <option value="wsrv">wsrv.nl Edge Engine</option>
              </select>
            </div>
          </div>
        </div>

        <!-- 3. Headers & Spoofing -->
        <div class="sub-section">
          <div class="sub-title">🛡️ Headers & Anti-Hotlink Spoofing</div>
          <div class="grid-2">
            <div>
              <label for="referer-mode">Referer Spoofing</label>
              <select id="referer-mode">
                <option value="auto">Auto (Spoof to Upstream Origin)</option>
                <option value="strip">Strip Referer (Omit completely)</option>
                <option value="custom">Custom Referer URL</option>
              </select>
            </div>
            <div>
              <label for="custom-referer">Custom Referer URL</label>
              <input type="text" id="custom-referer" placeholder="https://upstream.com/" disabled />
            </div>
          </div>

          <label for="custom-headers">Custom Upstream Request Headers (JSON)</label>
          <textarea id="custom-headers" placeholder='{"Authorization": "Bearer token", "User-Agent": "CustomBot"}'></textarea>
        </div>

        <!-- 4. Transforms & Overrides -->
        <div class="sub-section">
          <div class="sub-title">⚡ Transforms & MIME Overrides</div>
          <div class="grid-2">
            <div>
              <label for="mime-override">MIME-Type Override</label>
              <input type="text" id="mime-override" placeholder="application/pdf, video/mp4, text/plain" />
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

          <div class="grid-2">
            <div>
              <label for="replace-from">Text/JSON Find Pattern (Regex/String)</label>
              <input type="text" id="replace-from" placeholder="e.g. api.old.com" />
            </div>
            <div>
              <label for="replace-to">Replacement String</label>
              <input type="text" id="replace-to" placeholder="e.g. api.new.com" />
            </div>
          </div>
        </div>

        <!-- 5. Security & Caching -->
        <div class="sub-section">
          <div class="sub-title">🔒 Security, HMAC Signing & Caching</div>
          <div class="grid-2">
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
              <label for="allowed-origin">Origin Lock (Embed Gate)</label>
              <input type="text" id="allowed-origin" placeholder="https://mysite.com (optional)" />
            </div>
          </div>

          <div class="grid-2">
            <div>
              <label for="hmac-expiry">HMAC Link Expiration</label>
              <select id="hmac-expiry">
                <option value="none">No Expiry (Open link)</option>
                <option value="3600">Expires in 1 Hour</option>
                <option value="86400">Expires in 24 Hours</option>
                <option value="604800">Expires in 7 Days</option>
              </select>
            </div>
            <div>
              <label for="hmac-secret">HMAC Secret Key</label>
              <input type="password" id="hmac-secret" placeholder="Your HMAC secret key..." />
            </div>
          </div>
        </div>
      </div>
    </details>
  </div>

  <!-- Real-Time Generated Link & Snippets -->
  <div class="card" id="output-card">
    <div class="card-header">
      <h2 class="card-title">
        <span>⚡ Live Proxied Link</span>
      </h2>
      <div style="display:flex; gap:8px;">
        <button id="inspect-btn" class="cyan-btn" type="button">🔍 Inspect Headers</button>
        <button id="open-link-btn" type="button">↗ Open in Tab</button>
      </div>
    </div>

    <div class="output-box">
      <textarea id="output-url" class="output-textarea" readonly placeholder="Enter a URL above to generate your live proxy link..."></textarea>
    </div>

    <div class="btn-row">
      <button id="copy-link-btn" class="primary" type="button" style="flex:1;">📋 Copy Proxied Link</button>
    </div>

    <!-- Code Snippet Tabs -->
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
  // Elements
  const inputUrl = document.getElementById('input-url');
  const fallbackUrl = document.getElementById('fallback-url');
  const detectedPlatform = document.getElementById('detected-platform');
  const filenameInput = document.getElementById('filename');
  const btnModeDownload = document.getElementById('btn-mode-download');
  const btnModeInline = document.getElementById('btn-mode-inline');
  const deliveryDesc = document.getElementById('delivery-desc');

  const refererMode = document.getElementById('referer-mode');
  const customReferer = document.getElementById('custom-referer');
  const customHeaders = document.getElementById('custom-headers');
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

  const outputUrl = document.getElementById('output-url');
  const codeCurl = document.getElementById('code-curl');
  const codeFetch = document.getElementById('code-fetch');
  const codePython = document.getElementById('code-python');
  const toast = document.getElementById('toast');

  let activeDeliveryMode = 'attachment'; // 'attachment' or 'inline'

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
  }

  // Delivery Mode Toggle
  btnModeDownload.addEventListener('click', () => {
    activeDeliveryMode = 'attachment';
    btnModeDownload.className = 'segmented-btn active download-active';
    btnModeInline.className = 'segmented-btn';
    deliveryDesc.textContent = 'Forces Content-Disposition: attachment for downloads.';
    updateLiveProxy();
  });

  btnModeInline.addEventListener('click', () => {
    activeDeliveryMode = 'inline';
    btnModeInline.className = 'segmented-btn active inline-active';
    btnModeDownload.className = 'segmented-btn';
    deliveryDesc.textContent = 'Sets Content-Disposition: inline to render natively in browser.';
    updateLiveProxy();
  });

  // Toggle custom referer input
  refererMode.addEventListener('change', () => {
    customReferer.disabled = refererMode.value !== 'custom';
    updateLiveProxy();
  });

  // Platform Detection
  function detectPlatform(val) {
    const v = (val || '').toLowerCase();
    if (v.includes('drive.google.com') || v.includes('docs.google.com')) return 'Google Drive';
    if (v.includes('dropbox.com')) return 'Dropbox Direct';
    if (v.includes('box.com')) return 'Box Direct';
    if (v.includes('1drv.ms') || v.includes('onedrive.live.com') || v.includes('sharepoint.com')) return 'OneDrive / SharePoint';
    if (v.includes('github.com')) return 'GitHub Unwrapper';
    if (v.includes('gitlab.com')) return 'GitLab Unwrapper';
    return null;
  }

  // Web Crypto HMAC
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

  // REAL-TIME LINK BUILDER
  let debounceTimer = null;
  async function updateLiveProxy() {
    const rawUrl = inputUrl.value.trim();

    // Update platform badge
    const platform = detectPlatform(rawUrl);
    if (platform) {
      detectedPlatform.textContent = platform;
      detectedPlatform.style.display = 'inline-block';
    } else {
      detectedPlatform.style.display = 'none';
    }

    if (!rawUrl) {
      outputUrl.value = '';
      updateCodeSnippets('');
      return;
    }

    const proxied = new URL('/proxy', window.location.origin);
    proxied.searchParams.set('url', rawUrl);

    if (activeDeliveryMode === 'inline') {
      proxied.searchParams.set('disposition', 'inline');
    }

    if (filenameInput.value.trim()) {
      proxied.searchParams.set('filename', filenameInput.value.trim());
    }

    // Advanced options
    if (fallbackUrl.value.trim()) {
      proxied.searchParams.set('fallback', fallbackUrl.value.trim());
    }

    if (mimeOverride.value.trim()) {
      proxied.searchParams.set('type', mimeOverride.value.trim());
    }

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
        // do not break on invalid intermediate JSON while typing
      }
    }

    if (compressMode.value !== 'none') {
      proxied.searchParams.set('compress', compressMode.value);
    }

    if (replaceFrom.value.trim()) {
      proxied.searchParams.set('replace_from', replaceFrom.value.trim());
      proxied.searchParams.set('replace_to', replaceTo.value);
    }

    if (cacheTtl.value !== '86400') {
      proxied.searchParams.set('cache_ttl', cacheTtl.value);
    }

    if (allowedOrigin.value.trim()) {
      proxied.searchParams.set('allowed_origin', allowedOrigin.value.trim());
    }

    // Image resizing
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
        try {
          const canonical = buildCanonicalQuery(proxied);
          const sig = await computeHmacSignature(secret, canonical);
          proxied.searchParams.set('sig', sig);
        } catch (e) {
          console.warn('HMAC signing:', e);
        }
      }
    }

    const finalUrl = proxied.toString();
    outputUrl.value = finalUrl;
    updateCodeSnippets(finalUrl);
    saveFormToLocalStorage();
  }

  function updateCodeSnippets(finalUrl) {
    if (!finalUrl) {
      codeCurl.textContent = 'curl -L -s -O -J "<proxied-url-will-appear-here>"';
      codeFetch.textContent = '// Enter a URL above to view code snippet';
      codePython.textContent = '# Enter a URL above to view code snippet';
      return;
    }

    codeCurl.textContent = \`curl -L -s -O -J "\${finalUrl}"\`;
    codeFetch.textContent = \`// JavaScript fetch
const response = await fetch("\${finalUrl}");
if (!response.ok) throw new Error(\\\`HTTP \\\${response.status}: \\\${response.statusText}\\\`);

// For files / downloads:
const blob = await response.blob();
const downloadUrl = URL.createObjectURL(blob);
// e.g. window.open(downloadUrl) or <a href="\${downloadUrl}" download>

// Or for JSON APIs:
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
print(f"Downloaded: {filename}")\`;
  }

  // Real-time Event Listeners across ALL inputs & selects
  const allInputs = [
    inputUrl, fallbackUrl, filenameInput,
    refererMode, customReferer, customHeaders,
    mimeOverride, compressMode, replaceFrom, replaceTo,
    cacheTtl, allowedOrigin, hmacExpiry, hmacSecret,
    imgWidth, imgHeight, imgFit, imgFormat, imgQuality, imgBlur, imgRotate, imgEngine
  ];

  allInputs.forEach(el => {
    if (!el) return;
    el.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(updateLiveProxy, 30);
    });
    el.addEventListener('change', updateLiveProxy);
  });

  // Paste Button
  document.getElementById('paste-btn').addEventListener('click', async () => {
    try {
      inputUrl.value = await navigator.clipboard.readText();
      updateLiveProxy();
      showToast('Pasted URL from clipboard');
    } catch {
      showToast('Clipboard access denied');
    }
  });

  // Copy Link Button
  document.getElementById('copy-link-btn').addEventListener('click', async () => {
    if (!outputUrl.value) return showToast('Enter a URL first');
    await navigator.clipboard.writeText(outputUrl.value);
    showToast('Link copied to clipboard!');
  });

  // Open in Tab Button
  document.getElementById('open-link-btn').addEventListener('click', () => {
    if (outputUrl.value) window.open(outputUrl.value, '_blank');
  });

  // Snippet Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
      btn.classList.add('active');
      document.getElementById(\`tab-\${btn.dataset.tab}\`).style.display = 'block';
    });
  });

  // Copy Snippet Buttons
  document.querySelectorAll('.copy-snippet-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const code = document.getElementById(btn.dataset.target).textContent;
      await navigator.clipboard.writeText(code);
      showToast('Snippet copied!');
    });
  });

  // Format Helper
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
    const finalUrl = outputUrl.value.trim();
    if (!finalUrl) return showToast('Enter a URL first');

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

  // LocalStorage Form Cache
  const STORAGE_KEY = 'cors_proxy_form_cache_v1';
  const advancedDetails = document.getElementById('advanced-details');

  function saveFormToLocalStorage() {
    try {
      const data = {
        url: inputUrl.value,
        deliveryMode: activeDeliveryMode,
        filename: filenameInput.value,
        fallbackUrl: fallbackUrl.value,
        imgWidth: imgWidth.value,
        imgHeight: imgHeight.value,
        imgFit: imgFit.value,
        imgFormat: imgFormat.value,
        imgQuality: imgQuality.value,
        imgBlur: imgBlur.value,
        imgRotate: imgRotate.value,
        imgEngine: imgEngine.value,
        refererMode: refererMode.value,
        customReferer: customReferer.value,
        customHeaders: customHeaders.value,
        mimeOverride: mimeOverride.value,
        compressMode: compressMode.value,
        replaceFrom: replaceFrom.value,
        replaceTo: replaceTo.value,
        cacheTtl: cacheTtl.value,
        allowedOrigin: allowedOrigin.value,
        hmacExpiry: hmacExpiry.value,
        hmacSecret: hmacSecret.value,
        advancedOpen: advancedDetails ? advancedDetails.open : false,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      // LocalStorage might be restricted
    }
  }

  function loadFormFromLocalStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (!data || typeof data !== 'object') return false;

      if (data.url !== undefined) inputUrl.value = data.url;
      if (data.filename !== undefined) filenameInput.value = data.filename;
      if (data.fallbackUrl !== undefined) fallbackUrl.value = data.fallbackUrl;

      if (data.deliveryMode === 'inline') {
        activeDeliveryMode = 'inline';
        btnModeInline.className = 'segmented-btn active inline-active';
        btnModeDownload.className = 'segmented-btn';
        deliveryDesc.textContent = 'Sets Content-Disposition: inline to render natively in browser.';
      } else {
        activeDeliveryMode = 'attachment';
        btnModeDownload.className = 'segmented-btn active download-active';
        btnModeInline.className = 'segmented-btn';
        deliveryDesc.textContent = 'Forces Content-Disposition: attachment for downloads.';
      }

      if (data.imgWidth !== undefined) imgWidth.value = data.imgWidth;
      if (data.imgHeight !== undefined) imgHeight.value = data.imgHeight;
      if (data.imgFit !== undefined) imgFit.value = data.imgFit;
      if (data.imgFormat !== undefined) imgFormat.value = data.imgFormat;
      if (data.imgQuality !== undefined) imgQuality.value = data.imgQuality;
      if (data.imgBlur !== undefined) imgBlur.value = data.imgBlur;
      if (data.imgRotate !== undefined) imgRotate.value = data.imgRotate;
      if (data.imgEngine !== undefined) imgEngine.value = data.imgEngine;

      if (data.refererMode !== undefined) {
        refererMode.value = data.refererMode;
        customReferer.disabled = data.refererMode !== 'custom';
      }
      if (data.customReferer !== undefined) customReferer.value = data.customReferer;
      if (data.customHeaders !== undefined) customHeaders.value = data.customHeaders;
      if (data.mimeOverride !== undefined) mimeOverride.value = data.mimeOverride;
      if (data.compressMode !== undefined) compressMode.value = data.compressMode;
      if (data.replaceFrom !== undefined) replaceFrom.value = data.replaceFrom;
      if (data.replaceTo !== undefined) replaceTo.value = data.replaceTo;
      if (data.cacheTtl !== undefined) cacheTtl.value = data.cacheTtl;
      if (data.allowedOrigin !== undefined) allowedOrigin.value = data.allowedOrigin;
      if (data.hmacExpiry !== undefined) hmacExpiry.value = data.hmacExpiry;
      if (data.hmacSecret !== undefined) hmacSecret.value = data.hmacSecret;

      if (data.advancedOpen && advancedDetails) {
        advancedDetails.open = true;
      }
      return true;
    } catch (err) {
      return false;
    }
  }

  function resetForm() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {}

    inputUrl.value = '';
    filenameInput.value = '';
    fallbackUrl.value = '';
    activeDeliveryMode = 'attachment';
    btnModeDownload.className = 'segmented-btn active download-active';
    btnModeInline.className = 'segmented-btn';
    deliveryDesc.textContent = 'Forces Content-Disposition: attachment for downloads.';

    imgWidth.value = '';
    imgHeight.value = '';
    imgFit.value = 'scale-down';
    imgFormat.value = '';
    imgQuality.value = '';
    imgBlur.value = '';
    imgRotate.value = '';
    imgEngine.value = 'auto';

    refererMode.value = 'auto';
    customReferer.value = '';
    customReferer.disabled = true;
    customHeaders.value = '';
    mimeOverride.value = '';
    compressMode.value = 'none';
    replaceFrom.value = '';
    replaceTo.value = '';
    cacheTtl.value = '86400';
    allowedOrigin.value = '';
    hmacExpiry.value = 'none';
    hmacSecret.value = '';

    if (advancedDetails) advancedDetails.open = false;

    updateLiveProxy();
    showToast('Form reset to default');
  }

  const resetBtn = document.getElementById('reset-btn');
  if (resetBtn) resetBtn.addEventListener('click', resetForm);
  if (advancedDetails) advancedDetails.addEventListener('toggle', saveFormToLocalStorage);

  // Initialize: restore cached options and sync live proxy
  loadFormFromLocalStorage();
  updateLiveProxy();
</script>
</body>
</html>`;
