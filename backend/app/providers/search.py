import asyncio
import os
from urllib.parse import parse_qs, urlparse

import httpx
from bs4 import BeautifulSoup

BRAVE_ENDPOINT = "https://api.search.brave.com/res/v1/web/search"
DDG_ENDPOINT = "https://html.duckduckgo.com/html/"
USER_AGENT = "AuditIA-Research/0.3 (+https://github.com/mansstyle59/AuditIA)"
TIMEOUT = httpx.Timeout(12.0, connect=5.0)
TRANSIENT_STATUS = {429, 500, 502, 503, 504}


class BraveSearch:
    """Official, keyed search API. Preferred whenever BRAVE_SEARCH_API_KEY is configured."""

    name = "brave"
    reliability = "api-officielle"

    def __init__(self, api_key: str, transport: httpx.AsyncBaseTransport | None = None):
        self.api_key = api_key
        self.transport = transport

    @staticmethod
    def parse_results(payload: dict, source: str, limit: int = 8) -> list[dict]:
        found, seen = [], set()
        for item in (payload.get("web") or {}).get("results") or []:
            url = str(item.get("url") or "").strip()
            if not url.startswith(("https://", "http://")) or url in seen:
                continue
            seen.add(url)
            found.append({
                "title": str(item.get("title") or "")[:240],
                "url": url,
                "snippet": str(item.get("description") or "")[:500],
                "source": source,
                "provider": BraveSearch.name,
            })
            if len(found) >= max(1, limit):
                break
        return found

    async def search(self, query: str, source: str, limit: int = 8) -> list[dict]:
        params = {"q": query, "count": str(max(1, min(limit, 20))), "country": "fr", "search_lang": "fr"}
        headers = {"Accept": "application/json", "X-Subscription-Token": self.api_key, "User-Agent": USER_AGENT}
        async with httpx.AsyncClient(timeout=TIMEOUT, headers=headers, transport=self.transport) as client:
            response = await client.get(BRAVE_ENDPOINT, params=params)
            response.raise_for_status()
            return self.parse_results(response.json(), source, limit)


class DuckDuckGoSearch:
    """Best-effort public web discovery without an API key. Results are indicative only."""

    name = "duckduckgo"
    reliability = "indicatif"
    endpoint = DDG_ENDPOINT

    def __init__(self, transport: httpx.AsyncBaseTransport | None = None, retry_delay: float = 1.5):
        self.transport = transport
        self.retry_delay = retry_delay

    @staticmethod
    def _destination(href: str) -> str:
        parsed = urlparse(href)
        if parsed.hostname and parsed.hostname.endswith("duckduckgo.com"):
            target = parse_qs(parsed.query).get("uddg", [])
            if target:
                return target[0]
        return href

    @classmethod
    def parse_results(cls, html: str, source: str, limit: int = 8) -> list[dict]:
        soup = BeautifulSoup(html, "html.parser")
        found, seen = [], set()
        for item in soup.select(".result"):
            link = item.select_one("a.result__a")
            if not link:
                continue
            url = cls._destination(link.get("href", "").strip())
            if not url.startswith(("https://", "http://")) or url in seen:
                continue
            seen.add(url)
            snippet = item.select_one(".result__snippet")
            found.append({
                "title": link.get_text(" ", strip=True)[:240],
                "url": url,
                "snippet": snippet.get_text(" ", strip=True)[:500] if snippet else "",
                "source": source,
                "provider": cls.name,
            })
            if len(found) >= max(1, limit):
                break
        return found

    async def search(self, query: str, source: str, limit: int = 8) -> list[dict]:
        headers = {"User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml"}
        last_error: Exception | None = None
        # Une seule nouvelle tentative, et seulement sur erreur transitoire (limitation ou serveur).
        for attempt in range(2):
            try:
                async with httpx.AsyncClient(timeout=TIMEOUT, follow_redirects=True, headers=headers, transport=self.transport) as client:
                    response = await client.get(self.endpoint, params={"q": query})
                if response.status_code in TRANSIENT_STATUS and attempt == 0:
                    last_error = httpx.HTTPStatusError(f"HTTP {response.status_code}", request=response.request, response=response)
                    await asyncio.sleep(self.retry_delay)
                    continue
                response.raise_for_status()
                return self.parse_results(response.text, source, limit)
            except httpx.TimeoutException as exc:
                last_error = exc
                if attempt == 0:
                    await asyncio.sleep(self.retry_delay)
                    continue
        raise last_error or RuntimeError("Recherche indisponible")


def build_default_provider(environ: dict | None = None, transport: httpx.AsyncBaseTransport | None = None):
    """Brave si une clé officielle est configurée, sinon DuckDuckGo (résultats indicatifs)."""
    env = os.environ if environ is None else environ
    key = (env.get("BRAVE_SEARCH_API_KEY") or "").strip()
    if key:
        return BraveSearch(key, transport=transport)
    return DuckDuckGoSearch(transport=transport)
