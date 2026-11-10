from urllib.parse import parse_qs, urlparse

import httpx
from bs4 import BeautifulSoup


class DuckDuckGoSearch:
    """Best-effort public web discovery; this is not an official search API."""

    endpoint = "https://html.duckduckgo.com/html/"

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
            })
            if len(found) >= max(1, limit):
                break
        return found

    async def search(self, query: str, source: str, limit: int = 8) -> list[dict]:
        headers = {
            "User-Agent": "AuditIA-Research/0.2 (+https://github.com/mansstyle59/AuditIA)",
            "Accept": "text/html,application/xhtml+xml",
        }
        timeout = httpx.Timeout(12.0, connect=5.0)
        async with httpx.AsyncClient(
            timeout=timeout, follow_redirects=True, headers=headers
        ) as client:
            response = await client.get(self.endpoint, params={"q": query})
            response.raise_for_status()
        return self.parse_results(response.text, source, limit)
