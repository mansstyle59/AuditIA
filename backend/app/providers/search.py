from urllib.parse import quote_plus

import httpx
from bs4 import BeautifulSoup


class DuckDuckGoSearch:
    """Best-effort public web discovery. Not an official or guaranteed API."""

    endpoint = "https://html.duckduckgo.com/html/"

    async def search(self, query: str, source: str, limit: int = 8) -> list[dict]:
        headers = {"User-Agent": "AuditIA-Research/0.1 (+https://github.com/mansstyle59/AuditIA)"}
        async with httpx.AsyncClient(timeout=12, follow_redirects=True, headers=headers) as client:
            response = await client.get(self.endpoint, params={"q": query})
            response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")
        found = []
        for item in soup.select(".result"):
            link = item.select_one("a.result__a")
            if not link or not link.get("href", "").startswith("http"):
                continue
            snippet = item.select_one(".result__snippet")
            found.append({
                "title": link.get_text(" ", strip=True)[:240],
                "url": link["href"],
                "snippet": snippet.get_text(" ", strip=True)[:500] if snippet else "",
                "source": source,
            })
            if len(found) >= limit:
                break
        return found
