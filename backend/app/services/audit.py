import asyncio
from collections.abc import AsyncIterator
from urllib.parse import urlparse

from app.models import AuditRequest
from app.providers.search import build_default_provider


class AuditService:
    """Orchestrates independent public-source searches and streams real progress."""

    def __init__(self, provider=None, *, concurrency: int = 3, source_timeout: float = 18):
        self.provider = provider or build_default_provider()
        self.semaphore = asyncio.Semaphore(max(1, concurrency))
        self.source_timeout = source_timeout

    @staticmethod
    def _jobs(request: AuditRequest) -> list[tuple[str, str, str]]:
        company = request.company_name.strip()
        city = request.city.strip()
        sector = request.sector.strip() or "commerce"
        jobs = [
            ("web", "Recherche web", f'"{company}" "{city}"'),
            ("website", "Site Internet officiel", f'"{company}" "{city}" site officiel'),
            ("instagram", "Instagram", f'site:instagram.com "{company}" "{city}"'),
            ("facebook", "Facebook", f'site:facebook.com "{company}" "{city}"'),
            ("youtube", "YouTube", f'site:youtube.com "{company}" "{city}"'),
            ("tiktok", "TikTok", f'site:tiktok.com "{company}" "{city}"'),
            ("linkedin", "LinkedIn", f'site:linkedin.com/company "{company}" "{city}"'),
            ("directories", "Annuaires professionnels", f'"{company}" "{city}" annuaire'),
            ("competitors", "Concurrents locaux", f'{sector} "{city}" concurrents'),
        ]
        if request.website:
            host = urlparse(str(request.website)).netloc
            jobs.insert(1, ("provided_website", "Site communiqué", f'"{host}"'))
        return jobs

    async def stream(self, request: AuditRequest) -> AsyncIterator[dict]:
        company = request.company_name.strip()
        city = request.city.strip()
        jobs = self._jobs(request)
        queue: asyncio.Queue = asyncio.Queue()
        results: dict[str, list[dict]] = {}
        finished = 0

        async def run_one(key: str, label: str, query: str):
            await queue.put({"type": "source_started", "source": key, "label": label})
            try:
                async with self.semaphore:
                    data = await asyncio.wait_for(
                        self.provider.search(query, key), timeout=self.source_timeout
                    )
                clean = [
                    item for item in data
                    if isinstance(item, dict) and str(item.get("url", "")).startswith(("http://", "https://"))
                ]
                results[key] = clean
                await queue.put({
                    "type": "source_completed", "source": key, "label": label,
                    "status": "done" if clean else "empty",
                    "count": len(clean), "results": clean,
                })
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                results[key] = []
                await queue.put({
                    "type": "source_completed", "source": key, "label": label,
                    "status": "limited", "count": 0,
                    "message": str(exc)[:180] or "Source indisponible", "results": [],
                })

        tasks = [asyncio.create_task(run_one(*job)) for job in jobs]
        pending = len(tasks)
        try:
            while pending:
                event = await queue.get()
                if event["type"] == "source_completed":
                    finished += 1
                    pending -= 1
                    event["progress"] = round(finished / len(jobs) * 100)
                    event["completed_sources"] = finished
                    event["total_sources"] = len(jobs)
                yield event
            await asyncio.gather(*tasks, return_exceptions=True)
        finally:
            for task in tasks:
                if not task.done():
                    task.cancel()
            await asyncio.gather(*tasks, return_exceptions=True)

        unique: dict[str, dict] = {}
        for items in results.values():
            for item in items:
                unique.setdefault(item["url"], item)
        completed = sum(bool(results.get(key)) for key, _, _ in jobs)
        yield {
            "type": "audit_completed",
            "progress": 100,
            "summary": {
                "company_name": company,
                "city": city,
                "sources_checked": len(jobs),
                "sources_with_results": completed,
                "results_count": len(unique),
                "results": list(unique.values()),
                "source_status": {
                    key: ("done" if results.get(key) else "empty_or_limited")
                    for key, _, _ in jobs
                },
                "search_provider": getattr(self.provider, "name", "inconnu"),
                "search_reliability": getattr(self.provider, "reliability", "indicatif"),
                "notice": (
                    "Découverte web indicative : chaque résultat doit être vérifié. "
                    "Les profils sociaux ne sont pas confirmés par la plateforme elle-même."
                    + (" Recherche par relais public sans API officielle : fiabilité moindre."
                       if getattr(self.provider, "reliability", "") == "indicatif" else "")
                ),
            },
        }
