// AuditIA — validation stricte des URL publiques côté serveur.
// Aucun accès réseau : validation déterministe des adresses et hôtes réservés.

const BLOCKED_HOSTS = new Set([
  "localhost", "localhost.localdomain", "ip6-localhost", "ip6-loopback",
  "metadata", "metadata.google.internal", "metadata.azure.com", "metadata.aws.internal",
  "instance-data.ec2.internal", "host.docker.internal", "gateway.docker.internal",
]);

const BLOCKED_SUFFIXES = [
  ".localhost", ".local", ".internal", ".home.arpa", ".test", ".invalid", ".example",
  ".onion", ".lan", ".corp", ".intranet", ".private",
  // Services DNS qui permettent de résoudre un nom vers une IP arbitraire.
  ".nip.io", ".sslip.io", ".xip.io", ".localtest.me", ".lvh.me", ".vcap.me", ".traefik.me",
];

function parseIPv4(host: string): number[] | null {
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) return null;
  const parts = host.split(".").map(Number);
  return parts.every(n => Number.isInteger(n) && n >= 0 && n <= 255) ? parts : null;
}

function isNonPublicIPv4(parts: number[] | null): boolean {
  if (!parts) return true;
  const [a, b, c] = parts;
  if (a === 0 || a === 10 || a === 127 || a >= 224) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT / shared address space
  if (a === 169 && b === 254) return true; // link-local + cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return true; // special-use / TEST-NET
  if (a === 192 && b === 88 && c === 99) return true; // 6to4 relay anycast
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
  if (a === 198 && b === 51 && c === 100) return true; // TEST-NET-2
  if (a === 203 && b === 0 && c === 113) return true; // TEST-NET-3
  return false;
}

function parseIPv6(host: string): number[] | null {
  let value = String(host || "").toLowerCase().replace(/^\[|\]$/g, "");
  if (!value.includes(":") || value.includes("%")) return null;

  // URL normalise généralement les adresses IPv4 intégrées en groupes hexadécimaux.
  // Cette conversion couvre aussi les représentations IPv4 pointées.
  if (value.includes(".")) {
    const colon = value.lastIndexOf(":");
    if (colon < 0) return null;
    const ipv4 = parseIPv4(value.slice(colon + 1));
    if (!ipv4) return null;
    const tail = `${((ipv4[0] << 8) | ipv4[1]).toString(16)}:${((ipv4[2] << 8) | ipv4[3]).toString(16)}`;
    value = value.slice(0, colon + 1) + tail;
  }

  const halves = value.split("::");
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const tokens = [...left, ...right];
  if (tokens.some(token => !/^[0-9a-f]{1,4}$/.test(token))) return null;
  if (halves.length === 1 && left.length !== 8) return null;

  const missing = 8 - left.length - right.length;
  if (halves.length === 2 && missing < 1) return null;
  const groups = [...left, ...Array(missing).fill("0"), ...right].map(token => parseInt(token, 16));
  return groups.length === 8 && groups.every(n => Number.isInteger(n) && n >= 0 && n <= 0xffff) ? groups : null;
}

function isNonPublicIPv6(host: string): boolean {
  const groups = parseIPv6(host);
  if (!groups) return true;
  if (groups.every(n => n === 0)) return true; // unspecified
  if (groups.slice(0, 7).every(n => n === 0) && groups[7] === 1) return true; // loopback
  if ((groups[0] & 0xfe00) === 0xfc00) return true; // ULA fc00::/7
  if ((groups[0] & 0xffc0) === 0xfe80) return true; // link-local fe80::/10
  if ((groups[0] & 0xff00) === 0xff00) return true; // multicast

  if (groups.slice(0, 5).every(n => n === 0) && groups[5] === 0xffff) {
    const mapped = [(groups[6] >> 8) & 255, groups[6] & 255, (groups[7] >> 8) & 255, groups[7] & 255];
    return isNonPublicIPv4(mapped);
  }
  if (groups.slice(0, 6).every(n => n === 0)) return true; // deprecated IPv4-compatible range

  // Autoriser uniquement l'espace IPv6 global unicast 2000::/3.
  if ((groups[0] & 0xe000) !== 0x2000) return true;
  if (groups[0] === 0x2001 && (
    groups[1] === 0x0db8 || groups[1] === 0x0002 ||
    (groups[1] >= 0x0010 && groups[1] <= 0x001f) ||
    (groups[1] >= 0x0020 && groups[1] <= 0x002f)
  )) return true; // documentation, benchmarking and ORCHID ranges
  if (groups[0] === 0x3fff) return true; // documentation range
  return false;
}

export function isPublicHttpUrl(value: unknown): boolean {
  if (typeof value !== "string" || !value.trim()) return false;
  let url: URL;
  try { url = new URL(value.trim()); } catch { return false; }
  if ((url.protocol !== "https:" && url.protocol !== "http:") || url.username || url.password) return false;

  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (!host || BLOCKED_HOSTS.has(host) || BLOCKED_SUFFIXES.some(suffix => host.endsWith(suffix))) return false;
  if (host.includes(":")) return !isNonPublicIPv6(host);

  const ipv4 = parseIPv4(host);
  if (ipv4) return !isNonPublicIPv4(ipv4);

  // Un nom sans point est normalement un alias de réseau local.
  if (!host.includes(".")) return false;
  const labels = host.split(".");
  if (labels.some(label => !label || label.length > 63 || label.startsWith("-") || label.endsWith("-") || !/^[a-z0-9-]+$/.test(label))) return false;
  return true;
}
