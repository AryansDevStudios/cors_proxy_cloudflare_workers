/**
 * Edge Streaming Transformations Module
 * Provides on-the-fly Compression/Decompression, Range slicing TransformStream,
 * text/JSON regex streaming replacement, and HTMLRewriter injection.
 */

/**
 * Creates a stream slicer for byte ranges (e.g. bytes=start-end).
 * Allows pause/resume and seeking even when upstream origin returns full 200 responses.
 */
export function createRangeSlicer(start, end) {
  let currentOffset = 0;
  return new TransformStream({
    transform(chunk, controller) {
      const chunkStart = currentOffset;
      const chunkEnd = currentOffset + chunk.byteLength - 1;
      currentOffset += chunk.byteLength;

      // Entire chunk is before start offset
      if (chunkEnd < start) {
        return;
      }
      // Chunk begins past end offset: terminate early to abort upstream read
      if (end !== undefined && chunkStart > end) {
        controller.terminate();
        return;
      }

      // Slice the overlapping portion of this chunk
      const sliceStart = Math.max(0, start - chunkStart);
      const sliceEnd = end !== undefined ? Math.min(chunk.byteLength, end - chunkStart + 1) : chunk.byteLength;

      controller.enqueue(chunk.subarray(sliceStart, sliceEnd));

      if (end !== undefined && chunkEnd >= end) {
        controller.terminate();
      }
    },
  });
}

/**
 * Parses HTTP Range header string into start and end byte offsets.
 * e.g. "bytes=100-500" -> { start: 100, end: 500 }
 * e.g. "bytes=100-" -> { start: 100, end: undefined }
 */
export function parseRangeHeader(rangeHeader) {
  if (!rangeHeader) return null;
  const match = rangeHeader.match(/bytes=(\d+)-(\d*)/i);
  if (!match) return null;

  const start = parseInt(match[1], 10);
  const end = match[2] ? parseInt(match[2], 10) : undefined;
  if (isNaN(start) || (end !== undefined && (isNaN(end) || end < start))) {
    return null;
  }
  return { start, end };
}

/**
 * Pipes a readable stream through CompressionStream.
 */
export function compressStream(stream, format = 'gzip') {
  if (typeof CompressionStream === 'undefined') {
    throw new Error('CompressionStream is not supported in this runtime');
  }
  return stream.pipeThrough(new CompressionStream(format));
}

/**
 * Pipes a readable stream through DecompressionStream.
 */
export function decompressStream(stream, format = 'gzip') {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('DecompressionStream is not supported in this runtime');
  }
  return stream.pipeThrough(new DecompressionStream(format));
}

/**
 * Creates a streaming text transform for find-and-replace regex replacements.
 * @param {Array<{ from: string, to: string, flags?: string }>} replacements
 */
export function createTextReplaceStream(replacements) {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  return new TransformStream({
    transform(chunk, controller) {
      let text = decoder.decode(chunk, { stream: true });
      for (const { from, to, flags } of replacements) {
        try {
          const regex = new RegExp(from, flags || 'g');
          text = text.replace(regex, to);
        } catch {
          // Fall back to literal replace if invalid regex
          text = text.replaceAll(from, to);
        }
      }
      controller.enqueue(encoder.encode(text));
    },
    flush(controller) {
      const remainder = decoder.decode();
      if (remainder) {
        let text = remainder;
        for (const { from, to, flags } of replacements) {
          try {
            const regex = new RegExp(from, flags || 'g');
            text = text.replace(regex, to);
          } catch {
            text = text.replaceAll(from, to);
          }
        }
        controller.enqueue(encoder.encode(text));
      }
    },
  });
}

/**
 * Injects CSS / JS into HTML responses using Cloudflare Workers' HTMLRewriter when available.
 */
export function applyHtmlRewriter(response, { injectCss, injectJs }) {
  if (typeof HTMLRewriter === 'undefined' || (!injectCss && !injectJs)) {
    return response;
  }

  let rewriter = new HTMLRewriter();

  if (injectCss) {
    const cssTag = injectCss.startsWith('http')
      ? `<link rel="stylesheet" href="${injectCss}" />`
      : `<style>${injectCss}</style>`;

    rewriter = rewriter.on('head', {
      element(el) {
        el.append(cssTag, { html: true });
      },
    });
  }

  if (injectJs) {
    const jsTag = injectJs.startsWith('http')
      ? `<script src="${injectJs}"></script>`
      : `<script>${injectJs}</script>`;

    rewriter = rewriter.on('body', {
      element(el) {
        el.append(jsTag, { html: true });
      },
    });
  }

  return rewriter.transform(response);
}

/**
 * Checks if a MIME type represents textual assets suitable for string replacement.
 */
export function isTextualMime(contentType) {
  if (!contentType) return false;
  const mime = contentType.toLowerCase().split(';')[0].trim();
  return (
    mime.startsWith('text/') ||
    mime === 'application/json' ||
    mime === 'application/javascript' ||
    mime === 'text/javascript' ||
    mime === 'application/xml' ||
    mime === 'text/xml' ||
    mime === 'application/ld+json' ||
    mime === 'application/x-yaml' ||
    mime === 'application/sql'
  );
}
