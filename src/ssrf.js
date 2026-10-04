/**
 * SSRF (Server-Side Request Forgery) Protection Module
 * Restricts the worker from fetching private/internal IP ranges, cloud metadata,
 * and dangerous local network destinations.
 */

// Blocked TLDs and well-known internal hostnames
const BLOCKED_HOSTNAME_PATTERNS = [
  /^localhost$/i,
  /\.localhost$/i,
  /\.local$/i,
  /\.internal$/i,
  /\.lan$/i,
  /\.home\.arpa$/i,
  /\.corp$/i,
  /^metadata\.google\.internal$/i,
  /^instance-data$/i,
];

// Blocked ports: prevent probing internal services (SSH, SMTP, Redis, databases, etc.)
const BLOCKED_PORTS = new Set([
  21,   // FTP
  22,   // SSH
  23,   // Telnet
  25,   // SMTP
  110,  // POP3
  143,  // IMAP
  3306, // MySQL
  5432, // PostgreSQL
  6379, // Redis
  9200, // Elasticsearch
  11211,// Memcached
  27017 // MongoDB
]);

/**
 * Parses IPv4 address in standard dotted-quad, octal, hex, or 32-bit integer format.
 * Returns unsigned 32-bit integer or null if invalid.
 */
export function parseIpv4ToNumber(str) {
  if (!str) return null;
  const trimmed = str.trim();

  // 32-bit integer hex (e.g. 0x7f000001)
  if (/^0x[0-9a-f]+$/i.test(trimmed)) {
    const val = parseInt(trimmed, 16);
    return val >= 0 && val <= 0xffffffff ? val >>> 0 : null;
  }

  // 32-bit integer decimal (e.g. 2130706433)
  if (/^\d+$/.test(trimmed)) {
    const num = Number(trimmed);
    return num >= 0 && num <= 0xffffffff ? num >>> 0 : null;
  }

  // Dotted notation (up to 4 parts)
  const parts = trimmed.split('.');
  if (parts.length === 4) {
    let num = 0;
    for (let i = 0; i < 4; i++) {
      const part = parts[i];
      let val;
      if (/^0x[0-9a-f]+$/i.test(part)) {
        val = parseInt(part, 16);
      } else if (/^0[0-7]+$/.test(part)) {
        val = parseInt(part, 8);
      } else if (/^\d+$/.test(part)) {
        val = parseInt(part, 10);
      } else {
        return null;
      }
      if (val < 0 || val > 255) return null;
      num = (num << 8) | val;
    }
    return num >>> 0;
  }

  return null;
}

/**
 * Checks whether an IPv4 32-bit number falls into private, loopback, or reserved CIDRs:
 * - 0.0.0.0/8 (Current network)
 * - 10.0.0.0/8 (Private)
 * - 100.64.0.0/10 (Carrier-grade NAT)
 * - 127.0.0.0/8 (Loopback)
 * - 169.254.0.0/16 (Link-local & cloud metadata)
 * - 172.16.0.0/12 (Private)
 * - 192.168.0.0/16 (Private)
 * - 198.18.0.0/15 (Benchmarking)
 * - 224.0.0.0/4 (Multicast & reserved Class E)
 */
export function isPrivateIpv4(ipNum) {
  if (ipNum === null || ipNum === undefined) return false;
  const b0 = (ipNum >>> 24) & 0xff;
  const b1 = (ipNum >>> 16) & 0xff;

  if (b0 === 0) return true; // 0.0.0.0/8
  if (b0 === 10) return true; // 10.0.0.0/8
  if (b0 === 127) return true; // 127.0.0.0/8
  if (b0 === 169 && b1 === 254) return true; // 169.254.0.0/16 (Metadata)
  if (b0 === 172 && b1 >= 16 && b1 <= 31) return true; // 172.16.0.0/12
  if (b0 === 192 && b1 === 168) return true; // 192.168.0.0/16
  if (b0 === 100 && b1 >= 64 && b1 <= 127) return true; // 100.64.0.0/10
  if (b0 === 198 && (b1 === 18 || b1 === 19)) return true; // 198.18.0.0/15
  if (b0 >= 224) return true; // 224.0.0.0/4
  return false;
}

/**
 * Checks whether an IPv6 address is loopback, link-local, unique-local, or IPv4-mapped private.
 */
export function isBlockedIpv6(host) {
  const clean = host.replace(/^\[|\]$/g, '').toLowerCase();

  // Loopback & unspecified
  if (clean === '::1' || clean === '::' || clean === '0:0:0:0:0:0:0:1' || clean === '0:0:0:0:0:0:0:0') {
    return true;
  }
  // IPv6 Link-local (fe80::/10)
  if (clean.startsWith('fe80:') || /^fe[89ab]/i.test(clean)) {
    return true;
  }
  // IPv6 Unique local (fc00::/7)
  if (/^f[cd][0-9a-f]{2}:/i.test(clean)) {
    return true;
  }
  // IPv4-mapped IPv6 (::ffff:127.0.0.1 or ::ffff:7f00:1)
  const v4Mapped = clean.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (v4Mapped) {
    const num = parseIpv4ToNumber(v4Mapped[1]);
    if (num !== null && isPrivateIpv4(num)) return true;
  }

  return false;
}

/**
 * Checks if a hostname is private, loopback, metadata, or forbidden.
 */
export function isBlockedHost(hostname) {
  if (!hostname) return true;
  const host = hostname.toLowerCase();

  // Hostname regex rules
  if (BLOCKED_HOSTNAME_PATTERNS.some((pattern) => pattern.test(host))) {
    return true;
  }

  // IPv6
  if (host.startsWith('[') || host.includes(':')) {
    if (isBlockedIpv6(host)) return true;
  }

  // IPv4 (dotted quad, decimal, hex, octal)
  const ipNum = parseIpv4ToNumber(host);
  if (ipNum !== null) {
    return isPrivateIpv4(ipNum);
  }

  return false;
}

/**
 * Validates a target URL against protocol, SSRF, and dangerous port rules.
 */
export function validateTargetUrl(targetUrl) {
  let parsed;
  try {
    parsed = new URL(targetUrl);
  } catch {
    throw new Error('Invalid URL format');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only http and https URLs are supported');
  }

  if (isBlockedHost(parsed.hostname)) {
    throw new Error('This host is not allowed (private, loopback or metadata address)');
  }

  if (parsed.port) {
    const portNum = parseInt(parsed.port, 10);
    if (BLOCKED_PORTS.has(portNum)) {
      throw new Error(`Port ${portNum} is blocked for security`);
    }
  }

  return parsed;
}
