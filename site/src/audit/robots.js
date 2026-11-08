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
      // Un nouveau groupe commence après le premier Allow/Disallow.
      if (!current || current.rules.length) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      if (value) current.agents.push(value.toLowerCase());
      continue;
    }

    if (current && (key === "allow" || key === "disallow") && value) {
      current.rules.push({ directive: key, pattern: value });
    }
  }

  return groups.filter(group => group.agents.length);
}

function matchingGroups(groups, userAgent) {
  const productToken = String(userAgent || "AuditIA").toLowerCase().split(/[\s/]+/)[0];
  const specific = [];

  for (const group of groups) {
    for (const agent of group.agents) {
      if (agent !== "*" && productToken.includes(agent)) {
        specific.push({ group, specificity: agent.length });
      }
    }
  }

  if (specific.length) {
    const longest = Math.max(...specific.map(item => item.specificity));
    return [...new Set(specific.filter(item => item.specificity === longest).map(item => item.group))];
  }

  return groups.filter(group => group.agents.includes("*"));
}

function ruleRegex(pattern) {
  const endAnchored = pattern.endsWith("$");
  const body = endAnchored ? pattern.slice(0, -1) : pattern;
  const escaped = body.replace(/[.+?^{}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp("^" + escaped + (endAnchored ? "$" : ""));
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
  const cleanText = String(text || "").split(/\r?\n/).map(line => line.replace(/#.*$/, "").trim()).filter(Boolean);
  const groups = parseGroups(text);
  const path = String(pathAndQuery || "/").split("#")[0];
  const normalizedPath = path.startsWith("/") ? path : "/" + path;

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

  const matching = selected.flatMap(group => group.rules.map(rule => ({ ...rule, regex: ruleRegex(rule.pattern) })))
    .filter(rule => {
      try { return rule.regex.test(normalizedPath); } catch { return false; }
    })
    .sort((a, b) => {
      const diff = ruleSpecificity(b.pattern) - ruleSpecificity(a.pattern);
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
