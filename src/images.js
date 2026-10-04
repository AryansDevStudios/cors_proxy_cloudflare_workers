/**
 * Edge Image Resizing Module
 * Supports on-the-fly image resizing, format conversion (WebP, AVIF), cropping,
 * quality adjustment, blur, and rotation using Cloudflare Native Image Resizing (cf.image)
 * with automatic fallback to edge processing (wsrv.nl).
 */

import { safeFetch } from './resolvers.js';

const VALID_FIT_MODES = new Set(['scale-down', 'contain', 'cover', 'crop', 'pad']);
const VALID_FORMATS = new Set(['webp', 'avif', 'jpeg', 'jpg', 'png', 'json']);

/**
 * Extracts image resizing options from URL search parameters.
 * Returns null if no resizing parameters are present.
 */
export function parseImageResizeOptions(searchParams) {
  const w = searchParams.get('width') || searchParams.get('w');
  const h = searchParams.get('height') || searchParams.get('h');
  const fit = searchParams.get('fit');
  const q = searchParams.get('quality') || searchParams.get('q');
  const format = searchParams.get('format') || searchParams.get('f') || searchParams.get('output');
  const blur = searchParams.get('blur');
  const sharpen = searchParams.get('sharpen');
  const rotate = searchParams.get('rotate');
  const engine = searchParams.get('image_engine') || 'auto';

  if (!w && !h && !fit && !q && !format && !blur && !sharpen && !rotate) {
    return null;
  }

  const options = {
    engine: engine.toLowerCase(),
  };

  if (w && !isNaN(parseInt(w, 10))) {
    options.width = Math.max(1, parseInt(w, 10));
  }
  if (h && !isNaN(parseInt(h, 10))) {
    options.height = Math.max(1, parseInt(h, 10));
  }
  if (fit && VALID_FIT_MODES.has(fit.toLowerCase())) {
    options.fit = fit.toLowerCase();
  }
  if (q && !isNaN(parseInt(q, 10))) {
    options.quality = Math.min(100, Math.max(1, parseInt(q, 10)));
  }
  if (format && VALID_FORMATS.has(format.toLowerCase())) {
    options.format = format.toLowerCase().replace('jpg', 'jpeg');
  }
  if (blur && !isNaN(parseInt(blur, 10))) {
    options.blur = Math.min(250, Math.max(1, parseInt(blur, 10)));
  }
  if (sharpen && !isNaN(parseFloat(sharpen))) {
    options.sharpen = Math.min(10, Math.max(0, parseFloat(sharpen)));
  }
  if (rotate && [90, 180, 270].includes(parseInt(rotate, 10))) {
    options.rotate = parseInt(rotate, 10);
  }

  return options;
}

/**
 * Builds Cloudflare Native Image Resizing (cf.image) options object.
 */
export function buildCfImageOptions(options) {
  const cfOpts = {};
  if (options.width) cfOpts.width = options.width;
  if (options.height) cfOpts.height = options.height;
  if (options.fit) cfOpts.fit = options.fit;
  if (options.quality) cfOpts.quality = options.quality;
  if (options.format) cfOpts.format = options.format;
  if (options.blur) cfOpts.blur = options.blur;
  if (options.sharpen) cfOpts.sharpen = options.sharpen;
  if (options.rotate) cfOpts.rotate = options.rotate;
  return cfOpts;
}

/**
 * Builds a wsrv.nl URL for edge image transformation fallback.
 */
export function buildWsrvUrl(targetUrl, options) {
  const urlObj = new URL('https://wsrv.nl');
  urlObj.searchParams.set('url', targetUrl);

  if (options.width) urlObj.searchParams.set('w', options.width.toString());
  if (options.height) urlObj.searchParams.set('h', options.height.toString());

  if (options.fit) {
    if (options.fit === 'scale-down') {
      urlObj.searchParams.set('fit', 'inside');
      urlObj.searchParams.set('we', 'true'); // without enlargement
    } else {
      urlObj.searchParams.set('fit', options.fit);
    }
  }

  if (options.quality) urlObj.searchParams.set('q', options.quality.toString());
  if (options.format) urlObj.searchParams.set('output', options.format);
  if (options.blur) urlObj.searchParams.set('blur', options.blur.toString());
  if (options.rotate) urlObj.searchParams.set('ro', options.rotate.toString());

  return urlObj.toString();
}

/**
 * Fetches an image with on-the-fly resizing applied.
 * Attempts Cloudflare Native Image Resizing (cf.image) first, and falls back to wsrv.nl
 * if Cloudflare Images is not enabled on the zone or returns error codes.
 */
export async function fetchResizedImage({ targetUrl, options, headers = {} }) {
  // If explicitly requested wsrv engine
  if (options.engine === 'wsrv') {
    const wsrvUrl = buildWsrvUrl(targetUrl, options);
    const response = await safeFetch(wsrvUrl, { headers });
    return { response, engineUsed: 'wsrv.nl' };
  }

  // Primary: Cloudflare Native cf.image
  const cfOptions = buildCfImageOptions(options);
  try {
    const response = await safeFetch(targetUrl, {
      headers,
      cf: { image: cfOptions },
    });

    // Cloudflare returns 9401 / 9402 / 9403 when Image Resizing is not purchased/enabled on the zone
    const isCfImageError = response.status >= 9400 && response.status <= 9499;
    if (isCfImageError && options.engine === 'auto') {
      console.warn(`Cloudflare Image Resizing returned ${response.status}. Falling back to wsrv.nl...`);
      const fallbackUrl = buildWsrvUrl(targetUrl, options);
      const fallbackRes = await safeFetch(fallbackUrl, { headers });
      return { response: fallbackRes, engineUsed: 'wsrv.nl (fallback)' };
    }

    return { response, engineUsed: 'cloudflare-edge' };
  } catch (err) {
    if (options.engine === 'auto') {
      console.warn(`Primary image fetch failed (${err.message}). Falling back to wsrv.nl...`);
      const fallbackUrl = buildWsrvUrl(targetUrl, options);
      const fallbackRes = await safeFetch(fallbackUrl, { headers });
      return { response: fallbackRes, engineUsed: 'wsrv.nl (fallback)' };
    }
    throw err;
  }
}
