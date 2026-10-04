/**
 * Smart Multi-Source Resolvers & Unwrappers
 * Auto-detects Google Drive, Dropbox, OneDrive, Box, GitHub, GitLab
 * and resolves them to direct streaming resources.
 * Supports fallback/mirror URL resolution.
 */

import { validateTargetUrl } from './ssrf.js';

export const MAX_REDIRECTS = 5;
export const UPSTREAM_TIMEOUT_MS = 20_000;

/**
 * Detects and transforms known service links into direct download/stream URLs.
 * @param {string} inputUrl
 * @returns {{ url: string, platform: string|null, fileId?: string }}
 */
export function unwrapPlatformUrl(inputUrl) {
  let urlObj;
  try {
    urlObj = new URL(inputUrl);
  } catch {
    return { url: inputUrl, platform: null };
  }
  const host = urlObj.hostname.toLowerCase();

  // 1. GitHub blob / raw URLs
  if (host === 'github.com') {
    const match = urlObj.pathname.match(/^\/([^/]+)\/([^/]+)\/(?:blob|raw)\/([^/]+)\/(.+)$/);
    if (match) {
      const [, owner, repo, branch, path] = match;
      return {
        url: `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`,
        platform: 'GitHub (Raw)',
      };
    }
    return { url: inputUrl, platform: 'GitHub' };
  }

  // 2. GitLab blob URLs
  if (host === 'gitlab.com' || host.includes('gitlab')) {
    const match = urlObj.pathname.match(/^(\/.+?)\/-\/blob\/(.+)$/);
    if (match) {
      return {
        url: `${urlObj.origin}${match[1]}/-/raw/${match[2]}${urlObj.search}`,
        platform: 'GitLab (Raw)',
      };
    }
  }

  // 3. Dropbox share links -> direct streaming link
  if (host === 'dropbox.com' || host === 'www.dropbox.com') {
    const newUrl = new URL(inputUrl);
    newUrl.searchParams.set('dl', '1');
    return {
      url: newUrl.toString(),
      platform: 'Dropbox',
    };
  }

  // 4. Box share links
  if (host === 'app.box.com' || host.endsWith('.box.com')) {
    const match = urlObj.pathname.match(/^\/s\/([a-zA-Z0-9_-]+)/);
    if (match) {
      return {
        url: `https://app.box.com/index.php?rm=box_download_shared_file&shared_name=${match[1]}`,
        platform: 'Box',
      };
    }
  }

  // 5. OneDrive / SharePoint share links
  if (host === 'onedrive.live.com') {
    const newUrl = new URL(inputUrl);
    if (newUrl.pathname.includes('/redir') || newUrl.pathname.includes('/view.aspx')) {
      newUrl.pathname = '/download';
    } else {
      newUrl.searchParams.set('download', '1');
    }
    return {
      url: newUrl.toString(),
      platform: 'OneDrive',
    };
  }
  if (host.endsWith('sharepoint.com')) {
    const newUrl = new URL(inputUrl);
    newUrl.searchParams.set('download', '1');
    return {
      url: newUrl.toString(),
      platform: 'SharePoint',
    };
  }

  // 6. Google Drive
  const gdriveMatch = inputUrl.match(
    /https:\/\/(?:drive|docs)\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([a-zA-Z0-9_-]+)/
  );
  if (gdriveMatch) {
    return {
      url: inputUrl,
      platform: 'Google Drive',
      fileId: gdriveMatch[1],
    };
  }

  return { url: inputUrl, platform: null };
}

/**
 * Executes a fetch request with manual redirect following, enforcing SSRF validation on EVERY hop.
 */
export async function safeFetch(targetUrl, init = {}, redirectsLeft = MAX_REDIRECTS) {
  validateTargetUrl(targetUrl);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(targetUrl, {
      ...init,
      redirect: 'manual',
      signal: controller.signal,
    });
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

/**
 * Handles Google Drive downloads including large-file virus-scan bypass pages.
 */
export async function resolveGoogleDrive(fileId, extraHeaders = {}, finalMethod = 'GET') {
  const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
  const first = await safeFetch(downloadUrl, { headers: extraHeaders });
  const contentType = first.headers.get('content-type') || '';

  // Direct file stream (small files)
  if (!contentType.includes('text/html')) {
    return first;
  }

  // Large file confirmation page
  const body = await first.text();
  const cookie = first.headers.get('set-cookie');

  // Pattern 1: <form id="download-form" action="...">
  const formMatch = body.match(/<form[^>]+id="download-form"[^>]*action="([^"]+)"/i) ||
                    body.match(/<form[^>]*action="([^"]+)"[^>]*id="download-form"/i);

  // Pattern 2: <a id="uc-download-link" href="...">
  const linkMatch = body.match(/<a[^>]+id="uc-download-link"[^>]*href="([^"]+)"/i) ||
                    body.match(/<a[^>]+href="([^"]*uc\?export=download[^"]*)"/i);

  // Pattern 3: confirm token in form or body
  const confirmTokenMatch = body.match(/name="confirm"\s+value="([^"]+)"/i) ||
                            body.match(/confirm=([a-zA-Z0-9_-]+)/i);

  let finalUrl = null;
  if (formMatch) {
    finalUrl = formMatch[1].replace(/&amp;/g, '&');
  } else if (linkMatch) {
    finalUrl = linkMatch[1].replace(/&amp;/g, '&');
  } else if (confirmTokenMatch) {
    finalUrl = `https://drive.google.com/uc?export=download&confirm=${confirmTokenMatch[1]}&id=${fileId}`;
  }

  if (!finalUrl) {
    // If confirmation could not be parsed, check if it's private or not found
    if (body.includes('Access denied') || body.includes('You need access')) {
      throw new Error('Google Drive file is private or requires authorization.');
    }
    throw new Error('Google Drive file not found or confirmation page format changed.');
  }

  if (!finalUrl.startsWith('http')) {
    finalUrl = `https://drive.google.com${finalUrl}`;
  }

  const fetchHeaders = { ...extraHeaders };
  if (cookie) fetchHeaders['Cookie'] = cookie;

  return safeFetch(finalUrl, { method: finalMethod, headers: fetchHeaders });
}

/**
 * Fetches resource, attempting smart platform unwrapping, and falls back to mirror URL if primary fails.
 */
export async function fetchWithPlatformAndFallback({
  primaryUrl,
  fallbackUrl,
  method = 'GET',
  headers = {},
}) {
  let primaryError = null;
  let primaryStatus = null;
  let unwrappedInfo = unwrapPlatformUrl(primaryUrl);

  try {
    let response;
    if (unwrappedInfo.platform === 'Google Drive' && unwrappedInfo.fileId) {
      response = await resolveGoogleDrive(unwrappedInfo.fileId, headers, method);
    } else {
      response = await safeFetch(unwrappedInfo.url, { method, headers });
    }

    // Treat 404 and 5xx as failures that can trigger fallback
    if (response.ok || (response.status < 400 && response.status >= 200) || response.status === 206) {
      return {
        response,
        source: 'primary',
        platform: unwrappedInfo.platform,
        resolvedUrl: unwrappedInfo.url,
      };
    }

    primaryStatus = response.status;
    if (!fallbackUrl) {
      return {
        response,
        source: 'primary',
        platform: unwrappedInfo.platform,
        resolvedUrl: unwrappedInfo.url,
      };
    }
  } catch (err) {
    primaryError = err;
    if (!fallbackUrl) {
      throw err;
    }
  }

  // Primary failed, attempt fallback / mirror URL
  try {
    const fallbackUnwrapped = unwrapPlatformUrl(fallbackUrl);
    let fallbackResponse;
    if (fallbackUnwrapped.platform === 'Google Drive' && fallbackUnwrapped.fileId) {
      fallbackResponse = await resolveGoogleDrive(fallbackUnwrapped.fileId, headers, method);
    } else {
      fallbackResponse = await safeFetch(fallbackUnwrapped.url, { method, headers });
    }

    return {
      response: fallbackResponse,
      source: 'fallback',
      platform: fallbackUnwrapped.platform,
      resolvedUrl: fallbackUnwrapped.url,
      primaryStatus: primaryStatus || (primaryError ? primaryError.message : 'failed'),
    };
  } catch (fallbackErr) {
    const reason = primaryError ? primaryError.message : `HTTP ${primaryStatus}`;
    throw new Error(`Both primary (${reason}) and fallback (${fallbackErr.message}) failed`);
  }
}
