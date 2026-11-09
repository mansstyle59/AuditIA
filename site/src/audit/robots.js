/* AuditIA — interprétation minimale de robots.txt pour les crawls déclenchés par l'application.
   Parser pur : aucune requête réseau, aucune dépendance au DOM. */

function parseGroups(text) {
  const groups = [];
  let current = null;

  for (const rawLine of String(text || "").split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const match = line.match(/^([a-z][a-z-]*)\s*:\s*(.*?)\s*$/i);
    if (!match) continue;

    const key = match[1].toLowerCase();
    const value = match[2].trim();

    if (key === "user-agent") {
      // Plusieurs User-agent consécutifs appartiennent au même groupe.
      // Un nouveau groupe commence après toute directive Allow/Disallow,
      // même si son motif est vide (une règle vide reste une règle RFC 9309).
      if (!current || current.ruleSeen) {
        current = { agents: [], rules: [], ruleSeen: false };
        groups.push(current);
      }
      if (value) current.agents.push(value.toLowerCase());
      continue;
    }

    if (current && (key === "allow" || key === "disallow")) {
      // Une directive vide autorise tout, mais termine le bloc User-agent
      // avant le groupe suivant.
      current.ruleSeen = true;
      if (value) current.rules.push({ directive: key, pattern: value });
    }
  }

  return groups.filter(group => group.agents.length);
}

function matchingGroups(groups, userAgent) {
  const productToken = String(userAgent || "AuditIA").toLowerCase().split(/[\s/]+/)[0];
  const specific = [];

  for (const group of groups) {
    if (group.agents.some(agent => agent !== "*" && productToken.includes(agent))) {
      specific.push(group);
    }
  }

  // RFC 9309 §2.2.1 : si plusieurs groupes correspondent au produit,
  // leurs règles sont combinées. Le groupe "*" ne sert que de repli.
  if (specific.length) return [...new Set(specific)];
  return groups.filter(group => group.agents.includes("*"));
}

function matchesRobotsPattern(pattern, path) {
  const endAnchored = pattern.endsWith("$");
  const body = endAnchored ? pattern.slice(0, -1) : pattern;
  let p = 0, t = 0, lastStar = -1, retry = 0;

  // Glob matching in linear time; avoids compiling untrusted robots rules into regexes.
  while (t < path.length) {
    if (p < body.length && body[p] === path[t]) {
      p++;
      t++;
      if (p === body.length && !endAnchored) return true;
    } else if (p < body.length && body[p] === "*") {
      lastStar = p++;
      retry = t;
    } else if (lastStar !== -1) {
      p = lastStar + 1;
      t = ++retry;
    } else {
      return false;
    }
  }

  while (p < body.length && body[p] === "*") p++;
  return endAnchored ? p === body.length && t === path.length : p === body.length;
}

// RFC 9309 : decoder les caractères non réservés (%7E → ~), mais
// conserver les caractères réservés encodés (%2F reste distinct de /).
function normalizeRobotsEncoding(value) {
  return String(value || "").replace(/%([0-9a-f]{2})/gi, (match, hex) => {
    const code = Number.parseInt(hex, 16);
    const char = String.fromCharCode(code);
    return /[A-Za-z0-9._~-]/.test(char) ? char : "%" + hex.toUpperCase();
  });
}

function ruleSpecificity(pattern) {
  return Array.from(pattern).filter(char => char !== "*" && char !== "$").length;
}

/**
 * Évalue les règles robots pour le jeton de crawler AuditIA.
 * pathAndQuery doit être pathname + search, sans fragment.
 * Un fichier vide/commentaire seul est permissif ; un fichier non interprétable
 * renvoie allowed=null afin que l'appelant puisse suspendre le crawl par prudence.
 */
export function parseRobotsPolicy(text, userAgent = "AuditIA", pathAndQuery = "/") {
  const rawText = String(text || "");
  const safePath = String(pathAndQuery || "/");
  if (rawText.length > 512 * 1024) {
    return { status: "too-large", allowed: null, matchedRule: null, userAgent, path: safePath };
  }
  const lines = rawText.split(/\r?\n/);
  if (lines.length > 10000) {
    return { status: "too-large", allowed: null, matchedRule: null, userAgent, path: safePath };
  }
  const cleanText = lines.map(line => line.replace(/#.*$/, "").trim()).filter(Boolean);
  const ruleLines = cleanText.filter(line => /^(?:allow|disallow)\s*:/i.test(line));
  if (ruleLines.length > 5000 || ruleLines.some(line => line.replace(/^(?:allow|disallow)\s*:/i, "").trim().length > 2048)) {
    return { status: "too-large", allowed: null, matchedRule: null, userAgent, path: safePath };
  }
  const groups = parseGroups(rawText);
  const path = String(pathAndQuery || "/").split("#")[0];
  const normalizedPath = normalizeRobotsEncoding(path.startsWith("/") ? path : "/" + path);

  const meaningfulText = cleanText.filter(line => !/^sitemap\s*:/i.test(line));
  if (!meaningfulText.length) {
    return { status: "empty", allowed: true, matchedRule: null, userAgent, path: normalizedPath };
  }
  if (!groups.length) {
    return { status: "invalid", allowed: null, matchedRule: null, userAgent, path: normalizedPath };
  }

  const selected = matchingGroups(groups, userAgent);
  if (!selected.length) {
    return { status: "available", allowed: true, matchedRule: null, userAgent, path: normalizedPath };
  }

  const matching = selected.flatMap(group => group.rules)
    .map(rule => ({ ...rule, normalizedPattern: normalizeRobotsEncoding(rule.pattern) }))
    .filter(rule => matchesRobotsPattern(rule.normalizedPattern, normalizedPath))
    .sort((a, b) => {
      const diff = ruleSpecificity(b.normalizedPattern) - ruleSpecificity(a.normalizedPattern);
      if (diff) return diff;
      if (a.directive !== b.directive) return a.directive === "allow" ? -1 : 1;
      return 0;
    });

  const winner = matching[0] || null;
  return {
    status: "available",
    allowed: !winner || winner.directive === "allow",
    matchedRule: winner ? winner.directive + ": " + winner.pattern : null,
    userAgent,
    path: normalizedPath,
  };
}


/* A proxy response cannot reliably distinguish an origin 404 from a proxy error.
   Empty or HTML responses must not be interpreted as permission to crawl. */
export function isRobotsResponseUnverifiable(text) {
  const body = String(text || "").trim();
  return !body || /^\s*</.test(body) || /<html|<body/i.test(body);
}
