/**
 * Developer Experience UI Module
 * Serves the modern, wide 2-column reactive developer dashboard with:
 * - Two-column split layout (Left: Controls & Advanced Options, Right: Live Output & Snippets)
 * - Zero-click real-time generation across all inputs
 * - Fixed robust snippet generation for cURL, JavaScript fetch, and Python requests
 * - LocalStorage form state caching with reset button
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
    --bg: #07090c;
    --panel: #0d1217;
    --panel-border: rgba(255, 255, 255, 0.08);
    --panel-hover: #131b22;
    --input-bg: #080c10;
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
    background: radial-gradient(circle at 50% 0%, #111a24 0%, var(--bg) 75%);
    color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    padding: 24px 28px;
    display: flex;
    justify-content: center;
  }
  .app-container {
    width: 100%;
    max-width: 1560px;
  }

  /* Header */
  header {
    margin-bottom: 24px;
    border-bottom: 1px solid var(--panel-border);
    padding-bottom: 18px;
  }
  .header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 14px;
  }
  h1 {
    font-size: 1.5rem;
    font-weight: 750;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 10px;
    letter-spacing: -0.4px;
    color: #fff;
  }
  .badge-cluster {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
  }
  .badge {
    font-size: 0.72rem;
    font-weight: 600;
    padding: 4px 10px;
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
    margin: 6px 0 0;
    line-height: 1.45;
  }

  /* Two Column Split Grid */
  .layout-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
    gap: 24px;
    align-items: start;
  }
  @media (max-width: 1080px) {
    .layout-grid {
      grid-template-columns: 1fr;
    }
  }

  .left-col {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  .right-col {
    display: flex;
    flex-direction: column;
    gap: 20px;
    position: sticky;
    top: 24px;
  }
  @media (max-width: 1080px) {
    .right-col { position: static; }
  }

  /* Cards */
  .card {
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-radius: var(--radius-lg);
    padding: 22px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
  }
  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }
  .card-title {
    font-size: 0.98rem;
    font-weight: 650;
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
  textarea { resize: vertical; min-height: 56px; }

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
  .segmented-btn.active.download-active {
    background: rgba(245, 158, 11, 0.2);
    color: var(--accent);
    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
  }
  .segmented-btn.active.inline-active {
    background: rgba(6, 182, 212, 0.2);
    color: var(--cyan);
    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
  }
  .segmented-btn.active.standard-active {
    background: rgba(6, 182, 212, 0.2);
    color: var(--cyan);
    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
  }
  .segmented-btn.active.encrypted-active {
    background: rgba(245, 158, 11, 0.2);
    color: var(--accent);
    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
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
    background: rgba(0, 0, 0, 0.25);
    border: 1px solid var(--panel-border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    transition: border-color 0.2s;
  }
  details.advanced-card[open] {
    border-color: rgba(255, 255, 255, 0.16);
  }
  details.advanced-card > summary {
    padding: 14px 18px;
    font-size: 0.88rem;
    font-weight: 600;
    color: var(--text);
    cursor: pointer;
    user-select: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(255, 255, 255, 0.02);
  }
  details.advanced-card > summary:hover {
    background: rgba(255, 255, 255, 0.04);
  }
  .advanced-body {
    padding: 18px;
    border-top: 1px solid var(--panel-border);
    display: flex;
    flex-direction: column;
    gap: 18px;
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

  /* Live Output */
  .output-box {
    position: relative;
    margin-top: 6px;
  }
  .output-textarea {
    font-size: 0.86rem;
    line-height: 1.5;
    background: #05080b;
    border: 1px solid rgba(245, 158, 11, 0.35);
    color: #f8fafc;
    padding: 13px 15px;
    border-radius: var(--radius-md);
    word-break: break-all;
    min-height: 76px;
    box-shadow: inset 0 2px 6px rgba(0,0,0,0.4);
  }
  .output-textarea:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-glow);
  }

  .meta-pills {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    margin-top: 12px;
  }
  .meta-pill {
    font-size: 0.72rem;
    font-weight: 600;
    padding: 3px 9px;
    border-radius: var(--radius-sm);
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--panel-border);
    color: var(--muted);
  }
  .meta-pill.highlight {
    color: var(--accent);
    background: rgba(245, 158, 11, 0.1);
    border-color: rgba(245, 158, 11, 0.25);
  }

  .btn-row {
    display: flex;
    gap: 8px;
    margin-top: 14px;
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
    box-shadow: 0 0 16px var(--accent-glow);
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
    background: #05080b;
    border: 1px solid var(--panel-border);
    padding: 14px;
    border-radius: var(--radius-md);
    overflow-x: auto;
    font-family: var(--font-mono);
    font-size: 0.8rem;
    color: #e2e8f0;
    margin: 0 0 10px;
    line-height: 1.5;
  }

  /* Live Inspector Drawer / Modal */
  #inspector-modal {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.78);
    backdrop-filter: blur(5px);
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
    max-width: 760px;
    max-height: 88vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.7);
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
    padding: 3px 9px;
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
    padding: 10px 22px;
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

  /* Help Button & Modal */
  .help-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(245, 158, 11, 0.12);
    color: var(--accent);
    border: 1px solid rgba(245, 158, 11, 0.3);
    padding: 6px 14px;
    border-radius: var(--radius-sm);
    font-size: 0.8rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .help-btn:hover {
    background: var(--accent);
    color: var(--accent-ink);
    border-color: var(--accent);
    transform: translateY(-1px);
  }

  #how-modal {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.78);
    backdrop-filter: blur(8px);
    display: none;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
  }
  #how-modal.show { display: flex; }
  .how-card {
    background: var(--panel-bg);
    border: 1px solid var(--panel-border);
    border-radius: var(--radius-lg);
    width: 100%;
    max-width: 820px;
    max-height: 88vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8);
    overflow: hidden;
  }
  .how-header {
    padding: 16px 22px;
    border-bottom: 1px solid var(--panel-border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(255, 255, 255, 0.02);
  }
  .how-body {
    padding: 22px;
    overflow-y: auto;
    font-size: 0.87rem;
    color: var(--text);
    line-height: 1.6;
  }
  .how-section {
    margin-bottom: 20px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid var(--panel-border);
    border-radius: var(--radius-md);
    padding: 16px 18px;
  }
  .how-section-title {
    font-size: 0.95rem;
    font-weight: 700;
    color: #fff;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .how-code-block {
    background: #090d16;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: var(--radius-sm);
    padding: 10px 14px;
    font-family: var(--font-mono);
    font-size: 0.82rem;
    color: var(--cyan);
    margin: 8px 0;
    overflow-x: auto;
    word-break: break-all;
  }
  .badge-tag {
    display: inline-block;
    padding: 2px 7px;
    border-radius: 4px;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
  }
  .badge-tag.green { background: rgba(16, 185, 129, 0.15); color: var(--green); border: 1px solid rgba(16, 185, 129, 0.3); }
  .badge-tag.cyan { background: rgba(6, 182, 212, 0.15); color: var(--cyan); border: 1px solid rgba(6, 182, 212, 0.3); }
  .badge-tag.amber { background: rgba(245, 158, 11, 0.15); color: var(--accent); border: 1px solid rgba(245, 158, 11, 0.3); }

  /* Footer */
  .app-footer {
    margin-top: 36px;
    padding-top: 20px;
    border-top: 1px solid var(--panel-border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.82rem;
    color: var(--muted);
    flex-wrap: wrap;
    gap: 12px;
  }
  .footer-links {
    display: flex;
    align-items: center;
    gap: 18px;
  }
  .github-link, .footer-link {
    color: var(--muted);
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: color 0.15s ease;
    cursor: pointer;
  }
  .github-link:hover, .footer-link:hover {
    color: var(--cyan);
  }
</style>
</head>
<body>
<div class="app-container">
  <header>
    <div class="header-row">
      <div>
        <h1>Universal CORS Proxy</h1>
        <p class="subtitle">High-performance edge proxy with on-the-fly streaming transforms, image resizing, HMAC signing, and instant code generation.</p>
      </div>
      <div class="badge-cluster">
        <button id="how-to-use-btn" class="help-btn" type="button">📖 How to Use</button>
        <span class="live-pill" title="Options are auto-saved to browser cache"><span class="pulse-dot"></span> AUTO-SAVED</span>
        <span class="badge">Edge Streams</span>
        <span class="badge green">Web Crypto</span>
        <span class="badge cyan">Image Engine</span>
      </div>
    </div>
  </header>

  <div class="layout-grid">
    <!-- LEFT COLUMN: Form Controls & Advanced Configuration -->
    <div class="left-col">
      <!-- Main Target Source Card -->
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

            <div class="grid-2">
              <div>
                <label for="img-filter">Visual Filter / Effect</label>
                <select id="img-filter">
                  <option value="">None (Normal)</option>
                  <option value="grayscale">Grayscale (B&amp;W)</option>
                  <option value="sepia">Sepia (Vintage)</option>
                  <option value="negate">Invert / Negate</option>
                </select>
              </div>
              <div>
                <label for="img-sharpen">Sharpen (0-10)</label>
                <input type="number" id="img-sharpen" placeholder="0 (No sharpening)" min="0" max="10" step="0.5" />
              </div>
            </div>

            <div class="grid-2">
              <div>
                <label for="img-flip">Flip &amp; Mirror Orientation</label>
                <select id="img-flip">
                  <option value="">None (Normal)</option>
                  <option value="flop">Horizontal Mirror (Flop)</option>
                  <option value="flip">Vertical Flip</option>
                  <option value="both">Both (Horizontal &amp; Vertical)</option>
                </select>
              </div>
              <div>
                <label for="img-mask">Mask / Shape Crop</label>
                <select id="img-mask">
                  <option value="">None (Standard bounds)</option>
                  <option value="circle">Circular Avatar Crop</option>
                </select>
              </div>
            </div>

            <div class="grid-2">
              <div>
                <label for="img-bg">Background / Canvas Color</label>
                <input type="text" id="img-bg" placeholder="e.g. #ffffff or transparent" />
              </div>
              <div>
                <label for="img-dpr">Device Pixel Ratio (DPR)</label>
                <select id="img-dpr">
                  <option value="">1x (Standard)</option>
                  <option value="2">2x (Retina)</option>
                  <option value="3">3x (Ultra-HD)</option>
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
                <label for="hmac-expiry">HMAC / Token Expiration</label>
                <select id="hmac-expiry">
                  <option value="none">No Expiry (Open link)</option>
                  <option value="3600">Expires in 1 Hour</option>
                  <option value="86400">Expires in 24 Hours</option>
                  <option value="604800">Expires in 7 Days</option>
                </select>
              </div>
              <div>
                <label for="hmac-secret">Secret Key (Optional Override)</label>
                <input type="password" id="hmac-secret" placeholder="Auto-uses server secret key (leave blank)" />
                <div class="field-hint">Leave blank to automatically use server key</div>
              </div>
            </div>
          </div>
        </div>
      </details>
    </div>

    <!-- RIGHT COLUMN: Real-Time Output & Multi-Language Snippets (Sticky) -->
    <div class="right-col">
      <!-- Live Proxied Link Card -->
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">
            <span>⚡ Live Proxied Link</span>
          </h2>
          <div style="display:flex; gap:8px;">
            <button id="inspect-btn" class="cyan-btn" type="button">🔍 Inspect Headers</button>
            <button id="open-link-btn" type="button">↗ Open in Tab</button>
          </div>
        </div>

        <!-- Link Format Two-Tab Selector -->
        <div style="margin-bottom: 14px;">
          <div class="segmented-control" id="link-format-segmented">
            <button type="button" class="segmented-btn active standard-active" id="btn-format-standard" data-format="standard">
              🌐 Standard Proxy (<code style="font-size:0.75rem;">/proxy?url=...</code>)
            </button>
            <button type="button" class="segmented-btn" id="btn-format-encrypted" data-format="encrypted">
              🔒 Opaque Encrypted (<code style="font-size:0.75rem;">/s/...</code>)
            </button>
          </div>
          <div class="field-desc" id="link-format-desc" style="margin-top:6px;">
            🌐 <strong>Standard Link</strong>: Transparent query parameters. Target URL, blur, rotation, and headers are visible in the URL.
          </div>
        </div>

        <div class="output-box">
          <textarea id="output-url" class="output-textarea" readonly placeholder="Enter a URL on the left to see your live proxy link..."></textarea>
        </div>

        <div class="meta-pills" id="meta-pills-container">
          <span class="meta-pill highlight" id="meta-pill-mode">📥 Download</span>
          <span class="meta-pill" id="meta-pill-cache">TTL: 1 Day</span>
          <span class="meta-pill" id="meta-pill-platform" style="display:none;">Generic</span>
          <span class="meta-pill" id="meta-pill-image" style="display:none;">Image Resized</span>
          <span class="meta-pill" id="meta-pill-encrypted" style="display:none;">🔒 Encrypted (AES-256)</span>
        </div>

        <div class="btn-row">
          <button id="copy-link-btn" class="primary" type="button" style="flex:1;">📋 Copy Proxied Link</button>
        </div>
      </div>

      <!-- Code Snippets Card -->
      <div class="card">
        <div class="card-header" style="margin-bottom:12px;">
          <h2 class="card-title">
            <span>💻 Instant Code Snippets</span>
          </h2>
        </div>

        <!-- Code Snippet Tabs -->
        <div class="tabs">
          <button class="tab-btn active" data-tab="curl">cURL</button>
          <button class="tab-btn" data-tab="fetch">JavaScript (fetch)</button>
          <button class="tab-btn" data-tab="python">Python (requests)</button>
        </div>

        <div id="tab-curl" class="tab-content">
          <pre><code id="code-curl"></code></pre>
          <button type="button" class="copy-snippet-btn" data-target="code-curl">📋 Copy cURL</button>
        </div>
        <div id="tab-fetch" class="tab-content" style="display:none;">
          <pre><code id="code-fetch"></code></pre>
          <button type="button" class="copy-snippet-btn" data-target="code-fetch">📋 Copy Fetch Snippet</button>
        </div>
        <div id="tab-python" class="tab-content" style="display:none;">
          <pre><code id="code-python"></code></pre>
          <button type="button" class="copy-snippet-btn" data-target="code-python">📋 Copy Python Snippet</button>
        </div>
      </div>
    </div>
  </div>

  <footer class="app-footer">
    <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
      <span><strong>Universal CORS Proxy</strong> &copy; 2026 AryansDevStudios</span>
      <span>•</span>
      <span>High-Performance Edge Worker</span>
    </div>
    <div class="footer-links">
      <a href="https://github.com/AryansDevStudios/cors_proxy_cloudflare_workers" target="_blank" rel="noopener noreferrer" class="github-link">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
        GitHub Repository
      </a>
      <button id="footer-how-btn" class="footer-link" type="button" style="background:none; border:none; padding:0; font-size:inherit;">📖 How to Use</button>
    </div>
  </footer>
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

<!-- Interactive 'How to Use' Modal -->
<div id="how-modal">
  <div class="how-card">
    <div class="how-header">
      <div style="display:flex; align-items:center; gap:10px;">
        <h3 style="margin:0; font-size:1.15rem; color:#fff;">📖 Quickstart &amp; Address Guide</h3>
        <span class="badge-tag green">v1.2</span>
      </div>
      <button id="close-how-btn" type="button" style="padding:4px 12px; font-size:1.1rem; cursor:pointer;">&times; Close</button>
    </div>
    <div class="how-body">
      <!-- Section 1: Address Options -->
      <div class="how-section">
        <div class="how-section-title">
          <span>🌐 1. Address Formats</span>
          <span class="badge-tag cyan">Clean &amp; Direct</span>
        </div>
        <p style="margin:4px 0 8px 0; color:var(--muted); font-size:0.84rem;">
          You can use either clean direct paths or encrypted tokens depending on your privacy requirements:
        </p>
        <div style="font-weight:600; color:#fff;">Option A: Clean Direct Path (Recommended)</div>
        <div style="font-size:0.8rem; color:var(--muted);">Simply prepend your CORS proxy domain to any destination URL:</div>
        <div class="how-code-block">https://corsproxy.adsbackend01.workers.dev/https://example.com/photo.jpg?disposition=inline</div>

        <div style="margin-top:12px; font-weight:600; color:#fff;">Option B: Opaque Encrypted Token (AES-256-GCM)</div>
        <div style="font-size:0.8rem; color:var(--muted);">Completely conceals the origin URL and all visual modifiers inside a tamper-proof cryptographic token. Zero database required:</div>
        <div class="how-code-block">https://corsproxy.adsbackend01.workers.dev/s/APbirUwbgzB3iZvmBMxhKWB1WOQtfa...</div>

        <div style="margin-top:12px; font-weight:600; color:#fff;">Option C: Legacy URL Query</div>
        <div style="font-size:0.8rem; color:var(--muted);">Standard query parameter format for backwards compatibility:</div>
        <div class="how-code-block">https://corsproxy.adsbackend01.workers.dev/proxy?url=https%3A%2F%2Fexample.com%2Fphoto.jpg</div>
      </div>

      <!-- Section 2: Mixed Content & HTTP to HTTPS -->
      <div class="how-section">
        <div class="how-section-title">
          <span>🔒 2. HTTP to HTTPS &amp; Mixed Content Solution</span>
          <span class="badge-tag green">Bypass Browser Blocks</span>
        </div>
        <p style="margin:0 0 8px 0; color:var(--muted); font-size:0.84rem;">
          Modern web browsers automatically block insecure HTTP assets when called from an HTTPS webpage (Mixed Content error). This proxy runs over HTTPS, connects to the HTTP source server on the edge, and delivers it securely to your browser:
        </p>
        <div class="how-code-block">https://corsproxy.adsbackend01.workers.dev/http://insecure-api.com/data.json</div>
      </div>

      <!-- Section 3: Visual Image Editing -->
      <div class="how-section">
        <div class="how-section-title">
          <span>🎨 3. Edge Image Transformation Modifiers</span>
          <span class="badge-tag amber">Cloudflare cf.image + wsrv.nl</span>
        </div>
        <p style="margin:0 0 8px 0; color:var(--muted); font-size:0.84rem;">
          Append query modifiers to transform images in real time at edge CDN speed:
        </p>
        <ul style="margin:0; padding-left:20px; font-size:0.82rem; color:var(--muted); line-height:1.7;">
          <li><code>w=800&amp;h=600</code>: Width and height dimensions in pixels</li>
          <li><code>fit=cover|contain|scale-down|crop|pad</code>: Resizing fit mode</li>
          <li><code>format=webp|avif|jpeg|png</code>: Next-gen compression formats</li>
          <li><code>q=85</code>: Quality level (1 to 100)</li>
          <li><code>blur=25</code>: Gaussian blur intensity (0 to 250)</li>
          <li><code>sharpen=3</code>: Sharpening clarity filter (0 to 10)</li>
          <li><code>rotate=90|180|270</code>: Angular rotation</li>
          <li><code>filter=grayscale|sepia|negate</code>: Color and artistic filters</li>
          <li><code>flip=true</code> / <code>flop=true</code>: Vertical flip and horizontal mirror</li>
          <li><code>mask=circle</code>: Circular avatar crop</li>
          <li><code>bg=%23ffffff</code>: Background fill color for padded canvas</li>
          <li><code>dpr=2</code>: High-DPI / Retina display scaling</li>
        </ul>
      </div>

      <!-- Section 4: Headers & Security -->
      <div class="how-section" style="margin-bottom:0;">
        <div class="how-section-title">
          <span>🛡️ 4. Header Spoofing &amp; Delivery Control</span>
        </div>
        <ul style="margin:0; padding-left:20px; font-size:0.82rem; color:var(--muted); line-height:1.7;">
          <li><code>disposition=inline</code>: Forces browser to render natively in browser tabs.</li>
          <li><code>disposition=attachment&amp;filename=doc.pdf</code>: Triggers immediate download with custom UTF-8 filename.</li>
          <li><code>referer=auto|strip|https://...</code>: Spoofs upstream referer to bypass anti-hotlinking protections.</li>
          <li><code>cache_ttl=86400</code>: Custom Cloudflare edge cache duration in seconds.</li>
        </ul>
      </div>
    </div>
  </div>
</div>

<div id="toast"></div>

<script>
  // Element references
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
  const btnFormatStandard = document.getElementById('btn-format-standard');
  const btnFormatEncrypted = document.getElementById('btn-format-encrypted');
  const linkFormatDesc = document.getElementById('link-format-desc');

  const imgWidth = document.getElementById('img-width');
  const imgHeight = document.getElementById('img-height');
  const imgFit = document.getElementById('img-fit');
  const imgFormat = document.getElementById('img-format');
  const imgQuality = document.getElementById('img-quality');
  const imgBlur = document.getElementById('img-blur');
  const imgRotate = document.getElementById('img-rotate');
  const imgEngine = document.getElementById('img-engine');
  const imgFilter = document.getElementById('img-filter');
  const imgSharpen = document.getElementById('img-sharpen');
  const imgFlip = document.getElementById('img-flip');
  const imgMask = document.getElementById('img-mask');
  const imgBg = document.getElementById('img-bg');
  const imgDpr = document.getElementById('img-dpr');

  const howToUseBtn = document.getElementById('how-to-use-btn');
  const footerHowBtn = document.getElementById('footer-how-btn');
  const closeHowBtn = document.getElementById('close-how-btn');
  const howModal = document.getElementById('how-modal');

  const outputUrl = document.getElementById('output-url');
  const metaPillMode = document.getElementById('meta-pill-mode');
  const metaPillCache = document.getElementById('meta-pill-cache');
  const metaPillPlatform = document.getElementById('meta-pill-platform');
  const metaPillImage = document.getElementById('meta-pill-image');
  const metaPillEncrypted = document.getElementById('meta-pill-encrypted');

  const codeCurl = document.getElementById('code-curl');
  const codeFetch = document.getElementById('code-fetch');
  const codePython = document.getElementById('code-python');
  const toast = document.getElementById('toast');

  let activeDeliveryMode = 'attachment'; // 'attachment' or 'inline'
  let activeLinkFormat = 'standard'; // 'standard' or 'encrypted'

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
  }

  // Link Format Segmented Control (Standard vs Encrypted)
  btnFormatStandard.addEventListener('click', () => {
    activeLinkFormat = 'standard';
    btnFormatStandard.className = 'segmented-btn active standard-active';
    btnFormatEncrypted.className = 'segmented-btn';
    linkFormatDesc.innerHTML = '🌐 <strong>Standard Link</strong>: Transparent query parameters. Target URL, blur, rotation, and headers are visible in the URL.';
    updateLiveProxy();
  });

  btnFormatEncrypted.addEventListener('click', () => {
    activeLinkFormat = 'encrypted';
    btnFormatEncrypted.className = 'segmented-btn active encrypted-active';
    btnFormatStandard.className = 'segmented-btn';
    linkFormatDesc.innerHTML = '🔒 <strong>Encrypted Opaque Link</strong>: Stateless AES-256-GCM token (<code style="color:var(--cyan);">/s/...</code>). Origin URL and all modifiers are completely sealed &amp; tamper-proof.';
    updateLiveProxy();
  });

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
    return urlObj.pathname + '?' + cleanParams.toString();
  }

  // Web Crypto AES-256-GCM Opaque Token Encryption
  function bufferToBase64Url(bytes) {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
  }

  async function computeAesGcmToken(payload, secret) {
    const enc = new TextEncoder();
    const digest = await window.crypto.subtle.digest('SHA-256', enc.encode(secret));
    const key = await window.crypto.subtle.importKey(
      'raw',
      digest,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const jsonStr = JSON.stringify(payload);
    const ciphertextBuffer = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      enc.encode(jsonStr)
    );
    const ciphertextBytes = new Uint8Array(ciphertextBuffer);
    const combined = new Uint8Array(iv.length + ciphertextBytes.length);
    combined.set(iv, 0);
    combined.set(ciphertextBytes, iv.length);
    return bufferToBase64Url(combined);
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
      metaPillPlatform.textContent = platform;
      metaPillPlatform.style.display = 'inline-block';
    } else {
      detectedPlatform.style.display = 'none';
      metaPillPlatform.style.display = 'none';
    }

    metaPillMode.textContent = activeDeliveryMode === 'inline' ? '👁️ Inline' : '📥 Download';

    if (!rawUrl) {
      outputUrl.value = '';
      metaPillImage.style.display = 'none';
      if (metaPillEncrypted) metaPillEncrypted.style.display = 'none';
      updateCodeSnippets('');
      return;
    }

    // Check if Opaque Encrypted Token mode is active
    if (activeLinkFormat === 'encrypted') {
      const secret = hmacSecret.value.trim();
      metaPillEncrypted.style.display = 'inline-block';
      metaPillEncrypted.textContent = secret ? '🔒 AES-256 (Custom Key)' : '🔒 AES-256 Server Key';
      metaPillEncrypted.className = 'meta-pill highlight';

      const payload = { url: rawUrl };
      if (activeDeliveryMode === 'inline') payload.disposition = 'inline';
      if (filenameInput.value.trim()) payload.filename = filenameInput.value.trim();
      if (fallbackUrl.value.trim()) payload.fallback = fallbackUrl.value.trim();
      if (mimeOverride.value.trim()) payload.type = mimeOverride.value.trim();
      if (refererMode.value === 'strip') payload.referer = 'strip';
      else if (refererMode.value === 'custom' && customReferer.value.trim()) payload.referer = customReferer.value.trim();
      if (customHeaders.value.trim()) {
        try { payload.headers = JSON.parse(customHeaders.value.trim()); } catch {}
      }
      if (compressMode.value !== 'none') payload.compress = compressMode.value;
      if (replaceFrom.value.trim()) {
        payload.replace_from = replaceFrom.value.trim();
        payload.replace_to = replaceTo.value;
      }
      if (cacheTtl.value !== '86400') payload.cache_ttl = cacheTtl.value;
      if (allowedOrigin.value.trim()) payload.allowed_origin = allowedOrigin.value.trim();

      // Image resizing options
      let hasImageResize = false;
      if (imgWidth.value.trim()) { payload.w = imgWidth.value.trim(); hasImageResize = true; }
      if (imgHeight.value.trim()) { payload.h = imgHeight.value.trim(); hasImageResize = true; }
      if (imgWidth.value.trim() || imgHeight.value.trim()) {
        if (imgFit.value) payload.fit = imgFit.value;
      }
      if (imgFormat.value) { payload.format = imgFormat.value; hasImageResize = true; }
      if (imgQuality.value.trim()) { payload.q = imgQuality.value.trim(); hasImageResize = true; }
      if (imgBlur.value.trim() && imgBlur.value.trim() !== '0') { payload.blur = imgBlur.value.trim(); hasImageResize = true; }
      if (imgSharpen.value.trim() && imgSharpen.value.trim() !== '0') { payload.sharpen = imgSharpen.value.trim(); hasImageResize = true; }
      if (imgRotate.value) { payload.rotate = imgRotate.value; hasImageResize = true; }
      if (imgFilter.value) { payload.filter = imgFilter.value; hasImageResize = true; }
      if (imgFlip.value === 'flip') { payload.flip = 'true'; hasImageResize = true; }
      else if (imgFlip.value === 'flop') { payload.flop = 'true'; hasImageResize = true; }
      else if (imgFlip.value === 'both') { payload.flip = 'true'; payload.flop = 'true'; hasImageResize = true; }
      if (imgMask.value) { payload.mask = imgMask.value; hasImageResize = true; }
      if (imgBg.value.trim()) { payload.bg = imgBg.value.trim(); hasImageResize = true; }
      if (imgDpr.value) { payload.dpr = imgDpr.value; hasImageResize = true; }
      if (imgEngine.value !== 'auto') payload.image_engine = imgEngine.value;

      if (hasImageResize) {
        metaPillImage.style.display = 'inline-block';
        let imgLabel = 'Resize';
        if (imgWidth.value.trim() && imgHeight.value.trim()) imgLabel = imgWidth.value.trim() + 'x' + imgHeight.value.trim();
        else if (imgWidth.value.trim()) imgLabel = imgWidth.value.trim() + 'w';
        else if (imgHeight.value.trim()) imgLabel = imgHeight.value.trim() + 'h';
        if (imgFormat.value) imgLabel += ' (' + imgFormat.value + ')';
        metaPillImage.textContent = imgLabel;
      } else {
        metaPillImage.style.display = 'none';
      }

      if (hmacExpiry.value !== 'none') {
        payload.expires = Math.floor(Date.now() / 1000) + parseInt(hmacExpiry.value, 10);
      }

      try {
        if (secret) {
          const token = await computeAesGcmToken(payload, secret);
          const opaqueUrl = window.location.origin + '/s/' + token;
          outputUrl.value = opaqueUrl;
          updateCodeSnippets(opaqueUrl);
          saveFormToLocalStorage();
        } else {
          // Automatic server-side encryption via Worker's stored ENCRYPTION_KEY
          const res = await fetch('/encrypt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (res.ok) {
            const data = await res.json();
            outputUrl.value = data.encryptedUrl;
            updateCodeSnippets(data.encryptedUrl);
            saveFormToLocalStorage();
          } else {
            const errText = await res.text();
            outputUrl.value = '⚠️ Server encryption error: ' + errText;
          }
        }
      } catch (err) {
        console.error('Encryption error:', err);
      }
      return;
    } else {
      if (metaPillEncrypted) metaPillEncrypted.style.display = 'none';
    }

    const modParams = new URLSearchParams();

    if (activeDeliveryMode === 'inline') {
      modParams.set('disposition', 'inline');
    }

    if (filenameInput.value.trim()) {
      modParams.set('filename', filenameInput.value.trim());
    }

    // Advanced options
    if (fallbackUrl.value.trim()) {
      modParams.set('fallback', fallbackUrl.value.trim());
    }

    if (mimeOverride.value.trim()) {
      modParams.set('type', mimeOverride.value.trim());
    }

    if (refererMode.value === 'strip') {
      modParams.set('referer', 'strip');
    } else if (refererMode.value === 'custom' && customReferer.value.trim()) {
      modParams.set('referer', customReferer.value.trim());
    }

    if (customHeaders.value.trim()) {
      try {
        JSON.parse(customHeaders.value.trim());
        modParams.set('headers', customHeaders.value.trim());
      } catch {
        // do not break on intermediate typing
      }
    }

    if (compressMode.value !== 'none') {
      modParams.set('compress', compressMode.value);
    }

    if (replaceFrom.value.trim()) {
      modParams.set('replace_from', replaceFrom.value.trim());
      modParams.set('replace_to', replaceTo.value);
    }

    if (cacheTtl.value !== '86400') {
      modParams.set('cache_ttl', cacheTtl.value);
      metaPillCache.textContent = cacheTtl.value === '0' ? 'Cache: Bypass' : 'TTL: ' + cacheTtl.value + 's';
    } else {
      metaPillCache.textContent = 'TTL: 1 Day';
    }

    if (allowedOrigin.value.trim()) {
      modParams.set('allowed_origin', allowedOrigin.value.trim());
    }

    // Image resizing options
    let hasImageResize = false;
    if (imgWidth.value.trim()) { modParams.set('w', imgWidth.value.trim()); hasImageResize = true; }
    if (imgHeight.value.trim()) { modParams.set('h', imgHeight.value.trim()); hasImageResize = true; }
    if (imgWidth.value.trim() || imgHeight.value.trim()) {
      if (imgFit.value) modParams.set('fit', imgFit.value);
    }
    if (imgFormat.value) { modParams.set('format', imgFormat.value); hasImageResize = true; }
    if (imgQuality.value.trim()) { modParams.set('q', imgQuality.value.trim()); hasImageResize = true; }
    if (imgBlur.value.trim() && imgBlur.value.trim() !== '0') { modParams.set('blur', imgBlur.value.trim()); hasImageResize = true; }
    if (imgSharpen.value.trim() && imgSharpen.value.trim() !== '0') { modParams.set('sharpen', imgSharpen.value.trim()); hasImageResize = true; }
    if (imgRotate.value) { modParams.set('rotate', imgRotate.value); hasImageResize = true; }
    if (imgFilter.value) { modParams.set('filter', imgFilter.value); hasImageResize = true; }
    if (imgFlip.value === 'flip') { modParams.set('flip', 'true'); hasImageResize = true; }
    else if (imgFlip.value === 'flop') { modParams.set('flop', 'true'); hasImageResize = true; }
    else if (imgFlip.value === 'both') { modParams.set('flip', 'true'); modParams.set('flop', 'true'); hasImageResize = true; }
    if (imgMask.value) { modParams.set('mask', imgMask.value); hasImageResize = true; }
    if (imgBg.value.trim()) { modParams.set('bg', imgBg.value.trim()); hasImageResize = true; }
    if (imgDpr.value) { modParams.set('dpr', imgDpr.value); hasImageResize = true; }
    if (imgEngine.value !== 'auto') { modParams.set('image_engine', imgEngine.value); }

    if (hasImageResize) {
      metaPillImage.style.display = 'inline-block';
      let imgLabel = 'Resize';
      if (imgWidth.value.trim() && imgHeight.value.trim()) imgLabel = imgWidth.value.trim() + 'x' + imgHeight.value.trim();
      else if (imgWidth.value.trim()) imgLabel = imgWidth.value.trim() + 'w';
      else if (imgHeight.value.trim()) imgLabel = imgHeight.value.trim() + 'h';
      if (imgFormat.value) imgLabel += ' (' + imgFormat.value + ')';
      metaPillImage.textContent = imgLabel;
    } else {
      metaPillImage.style.display = 'none';
    }

    // HMAC Signing
    const expirySec = hmacExpiry.value;
    const secret = hmacSecret.value.trim();
    if (expirySec !== 'none') {
      const expires = Math.floor(Date.now() / 1000) + parseInt(expirySec, 10);
      modParams.set('expires', expires.toString());
      if (secret) {
        try {
          const canonical = buildCanonicalQuery(new URL(window.location.origin + '/' + rawUrl + '?' + modParams.toString()));
          const sig = await computeHmacSignature(secret, canonical);
          modParams.set('sig', sig);
        } catch (e) {
          console.warn('HMAC error:', e);
        }
      }
    }

    const qs = modParams.toString();
    let finalUrl = window.location.origin + '/' + rawUrl;
    if (qs) {
      finalUrl += (finalUrl.includes('?') ? '&' : '?') + qs;
    }
    outputUrl.value = finalUrl;
    updateCodeSnippets(finalUrl);
    saveFormToLocalStorage();
  }

  // ROBUST SNIPPET GENERATOR (Uses clean string arrays to prevent nested template literal syntax issues)
  function updateCodeSnippets(finalUrl) {
    if (!finalUrl) {
      codeCurl.textContent = 'curl -L -s -O -J "<proxied-url-will-appear-here>"';
      codeFetch.textContent = '// Enter a URL on the left to generate fetch snippet';
      codePython.textContent = '# Enter a URL on the left to generate requests snippet';
      return;
    }

    codeCurl.textContent = 'curl -L -s -O -J "' + finalUrl + '"';

    codeFetch.textContent = [
      '// JavaScript fetch',
      'const response = await fetch("' + finalUrl + '");',
      'if (!response.ok) {',
      '  throw new Error("HTTP " + response.status + ": " + response.statusText);',
      '}',
      '',
      '// For files / downloads:',
      'const blob = await response.blob();',
      'const downloadUrl = URL.createObjectURL(blob);',
      '// window.open(downloadUrl);',
      '',
      '// Or for JSON APIs:',
      '// const data = await response.json();'
    ].join('\\n');

    codePython.textContent = [
      '# Python requests streaming download',
      'import requests',
      '',
      'url = "' + finalUrl + '"',
      'with requests.get(url, stream=True) as response:',
      '    response.raise_for_status()',
      '    filename = "downloaded_file"',
      '    with open(filename, "wb") as f:',
      '        for chunk in response.iter_content(chunk_size=65536):',
      '            f.write(chunk)',
      'print(f"Downloaded: {filename}")'
    ].join('\\n');
  }

  // Real-time Event Listeners across ALL inputs & selects
  const allInputs = [
    inputUrl, fallbackUrl, filenameInput,
    refererMode, customReferer, customHeaders,
    mimeOverride, compressMode, replaceFrom, replaceTo,
    cacheTtl, allowedOrigin, hmacExpiry, hmacSecret,
    imgWidth, imgHeight, imgFit, imgFormat, imgQuality, imgBlur, imgRotate, imgEngine,
    imgFilter, imgSharpen, imgFlip, imgMask, imgBg, imgDpr
  ];

  allInputs.forEach(el => {
    if (!el) return;
    el.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(updateLiveProxy, 30);
    });
    el.addEventListener('change', updateLiveProxy);
  });

  // How to Use Modal Handlers
  const openHowModal = () => howModal && howModal.classList.add('show');
  const closeHowModal = () => howModal && howModal.classList.remove('show');
  if (howToUseBtn) howToUseBtn.addEventListener('click', openHowModal);
  if (footerHowBtn) footerHowBtn.addEventListener('click', openHowModal);
  if (closeHowBtn) closeHowBtn.addEventListener('click', closeHowModal);
  if (howModal) howModal.addEventListener('click', (e) => { if (e.target === howModal) closeHowModal(); });

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
  const copyLinkBtn = document.getElementById('copy-link-btn');
  copyLinkBtn.addEventListener('click', async () => {
    if (!outputUrl.value) return showToast('Enter a URL first');
    await navigator.clipboard.writeText(outputUrl.value);
    const origText = copyLinkBtn.textContent;
    copyLinkBtn.textContent = '✓ Copied to clipboard!';
    showToast('Proxied link copied!');
    setTimeout(() => { copyLinkBtn.textContent = origText; }, 1800);
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
      document.getElementById('tab-' + btn.dataset.tab).style.display = 'block';
    });
  });

  // Copy Snippet Buttons
  document.querySelectorAll('.copy-snippet-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const code = document.getElementById(btn.dataset.target).textContent;
      await navigator.clipboard.writeText(code);
      const origText = btn.textContent;
      btn.textContent = '✓ Copied!';
      showToast('Code snippet copied!');
      setTimeout(() => { btn.textContent = origText; }, 1800);
    });
  });

  // Format Helper
  function formatBytes(bytes) {
    if (!bytes || isNaN(bytes)) return 'Unknown';
    const num = parseInt(bytes, 10);
    if (num < 1024) return num + ' B';
    if (num < 1048576) return (num / 1024).toFixed(1) + ' KB';
    if (num < 1073741824) return (num / 1048576).toFixed(1) + ' MB';
    return (num / 1073741824).toFixed(2) + ' GB';
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

      inspectLatency.textContent = duration + ' ms';
      inspectStatusBadge.textContent = res.status + ' ' + (res.statusText || 'OK');
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
        row.innerHTML = '<td class="header-key">' + k + '</td><td>' + v + '</td>';
        headersTableBody.appendChild(row);
      }
    } catch (err) {
      inspectStatusBadge.textContent = 'FAILED';
      inspectLatency.textContent = '-';
      headersTableBody.innerHTML = '<tr><td colspan="2" style="color:var(--red);">Inspection error: ' + err.message + '</td></tr>';
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
        imgSharpen: imgSharpen.value,
        imgRotate: imgRotate.value,
        imgEngine: imgEngine.value,
        imgFilter: imgFilter.value,
        imgFlip: imgFlip.value,
        imgMask: imgMask.value,
        imgBg: imgBg.value,
        imgDpr: imgDpr.value,
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
        linkFormat: activeLinkFormat,
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
      if (data.imgSharpen !== undefined) imgSharpen.value = data.imgSharpen;
      if (data.imgRotate !== undefined) imgRotate.value = data.imgRotate;
      if (data.imgEngine !== undefined) imgEngine.value = data.imgEngine;
      if (data.imgFilter !== undefined) imgFilter.value = data.imgFilter;
      if (data.imgFlip !== undefined) imgFlip.value = data.imgFlip;
      if (data.imgMask !== undefined) imgMask.value = data.imgMask;
      if (data.imgBg !== undefined) imgBg.value = data.imgBg;
      if (data.imgDpr !== undefined) imgDpr.value = data.imgDpr;

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

      if (data.linkFormat === 'encrypted') {
        activeLinkFormat = 'encrypted';
        btnFormatEncrypted.className = 'segmented-btn active encrypted-active';
        btnFormatStandard.className = 'segmented-btn';
        linkFormatDesc.innerHTML = '🔒 <strong>Encrypted Opaque Link</strong>: Stateless AES-256-GCM token (<code style="color:var(--cyan);">/s/...</code>). Origin URL and all modifiers are completely sealed &amp; tamper-proof.';
      } else {
        activeLinkFormat = 'standard';
        btnFormatStandard.className = 'segmented-btn active standard-active';
        btnFormatEncrypted.className = 'segmented-btn';
        linkFormatDesc.innerHTML = '🌐 <strong>Standard Link</strong>: Transparent query parameters. Target URL, blur, rotation, and headers are visible in the URL.';
      }

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
    imgSharpen.value = '';
    imgRotate.value = '';
    imgEngine.value = 'auto';
    imgFilter.value = '';
    imgFlip.value = '';
    imgMask.value = '';
    imgBg.value = '';
    imgDpr.value = '';

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

    activeLinkFormat = 'standard';
    btnFormatStandard.className = 'segmented-btn active standard-active';
    btnFormatEncrypted.className = 'segmented-btn';
    linkFormatDesc.innerHTML = '🌐 <strong>Standard Link</strong>: Transparent query parameters. Target URL, blur, rotation, and headers are visible in the URL.';

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
