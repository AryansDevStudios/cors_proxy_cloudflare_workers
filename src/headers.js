/**
 * Headers & Payload Control Module
 * Handles CORS headers, custom query headers, MIME/disposition overrides,
 * Referer/Origin spoofing, filename resolution, and passthrough headers.
 */

export const EXTENSION_BY_MIME = {
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

  // Archives
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

  // Executables & images
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
};

const FORBIDDEN_CLIENT_HEADERS = new Set([
  'host',
  'connection',
  'keep-alive',
  'transfer-encoding',
  'upgrade',
  'content-length',
]);

/**
 * Returns standard or origin-restricted CORS headers.
 */
export function corsHeaders(extra = {}, allowedOrigin = '*') {
  return {
    'Access-Control-Allow-Origin': allowedOrigin || '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Expose-Headers':
      'Content-Disposition, Content-Type, Content-Length, Content-Range, Accept-Ranges, ETag, Last-Modified, X-Cache-Status, X-Cache-TTL, X-Proxy-Source, X-Proxy-Primary-Status',
    'Access-Control-Max-Age': '86400',
    ...extra,
  };
}

/**
 * Parses user-supplied custom headers from query parameters.
 * Supports:
 * - ?headers={"Authorization":"Bearer ...","User-Agent":"..."}
 */
export function parseCustomHeaders(headersParam) {
  if (!headersParam) return {};
  let parsed;
  try {
    parsed = typeof headersParam === 'string' ? JSON.parse(headersParam) : headersParam;
  } catch {
    throw new Error('Invalid headers query parameter: must be valid JSON object');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Invalid headers query parameter: must be an object of key-value pairs');
  }

  const result = {};
  for (const [key, value] of Object.entries(parsed)) {
    const lowerKey = key.toLowerCase();
    if (!FORBIDDEN_CLIENT_HEADERS.has(lowerKey) && typeof value === 'string') {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Strips or spoofs Referer and Origin headers to bypass CDN hotlink protections.
 */
export function buildRefererOriginHeaders(targetUrl, refererParam, originParam, clientHeaders = null) {
  const parsedTarget = new URL(targetUrl);
  const headers = {};

  // Referer resolution
  if (refererParam) {
    if (refererParam === 'strip' || refererParam === 'none') {
      // Intentionally omit
    } else if (refererParam === 'spoof' || refererParam === 'auto') {
      headers['Referer'] = `${parsedTarget.origin}/`;
    } else {
      headers['Referer'] = refererParam;
    }
  } else {
    // Default: auto-spoof to upstream origin to prevent hotlink blocks
    headers['Referer'] = `${parsedTarget.origin}/`;
  }

  // Origin resolution
  if (originParam) {
    if (originParam === 'strip' || originParam === 'none') {
      // Intentionally omit
    } else if (originParam === 'spoof' || originParam === 'auto') {
      headers['Origin'] = parsedTarget.origin;
    } else {
      headers['Origin'] = originParam;
    }
  } else {
    // Default spoof origin
    headers['Origin'] = parsedTarget.origin;
  }

  return headers;
}

/**
 * Strips control characters from filename.
 */
export function sanitizeFilename(name) {
  return (name || '').replace(/[\x00-\x1F\x7F]/g, '').replace(/[\\/]/g, '_').trim();
}

/**
 * Extracts filename from Content-Disposition header.
 */
export function filenameFromDisposition(disposition) {
  if (!disposition) return null;
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
        // Fall back to filename
      }
    }
  }

  return parameters.get('filename') || null;
}

/**
 * Guesses suitable filename from query, headers, or URL path, appending extension if missing.
 */
export function guessFilename(originalUrl, upstreamResponse, filenameParam) {
  const disposition = upstreamResponse.headers.get('content-disposition') || '';
  const headerFilename = filenameFromDisposition(disposition);

  let urlFilename = '';
  try {
    urlFilename = decodeURIComponent(new URL(originalUrl).pathname.split('/').filter(Boolean).pop() || '');
  } catch {
    // Ignore malformed URL path
  }

  let filename = sanitizeFilename(filenameParam || headerFilename || urlFilename || '') || 'downloaded-file';

  if (!filename.includes('.')) {
    const contentType = (upstreamResponse.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    const ext = EXTENSION_BY_MIME[contentType];
    if (ext) filename += '.' + ext;
  }

  return filename;
}

/**
 * Builds RFC 5987 / UTF-8 compliant Content-Disposition value.
 */
export function buildContentDisposition(dispositionType, filename) {
  const type = dispositionType === 'inline' ? 'inline' : 'attachment';
  if (!filename) {
    return type;
  }
  const fallback = filename.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '\\$&');
  const encoded = encodeURIComponent(filename).replace(/[!'()*]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  );
  return `${type}; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

/**
 * Forwards relevant cache & byte-range upstream headers to client.
 */
export function buildPassthroughHeaders(upstream) {
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
