import asyncio
from collections.abc import AsyncIterator

from app.models import AuditRequest
from app.providers.search import DuckDuckGoSearch


class AuditService:
    def __init__(self, provider=None):
        self.provider = provider or DuckDuckGoSearch()

    async def stream(self, request: AuditRequest) -> AsyncIterator[dict]:
        company = request.company_name.strip()
        city = request.city.strip()
        sector = request.sector.strip() or "commerce"
        jobs = [
            ("web", "Recherche web", f'"{company}" "{city}"'),
            ("website", "Site Internet", f'"{company}" "{city}" site officiel'),
            ("instagram", "Instagram", f'site:instagram.com "{company}" "{city}"'),
            ("facebook", "Facebook", f'site:facebook.com "{company}" "{city}"'),
            ("youtube", "YouTube", f'site:youtube.com "{company}" "{city}"'),
            ("linkedin", "LinkedIn", f'site:linkedin.com/company "{company}" "{city}"'),
            ("directories", "Annuaires professionnels", f'"{company}" "{city}" annuaire'),
            ("competitors", "Concurrents locaux", f'{sector} "{city}" concurrents'),
        ]
        queue: asyncio.Queue = asyncio.Queue()
        results: dict[str, list[dict]] = {}
        finished = 0

        async def run_one(key: str, label: str, query: str):
            await queue.put({"type": "source_started", "source": key, "label": label})
            try:
                data = await self.provider.search(query, key)
                results[key] = data
                await queue.put({"type": "source_completed", "source": key, "label": label, "status": "done" if data else "empty", "count": len(data), "results": data})
            except Exception as exc:  # one provider failure must not abort the audit
                results[key] = []
                await queue.put({"type": "source_completed", "source": key, "label": label, "status": "limited", "count": 0, "message": str(exc)[:180], "results": []})

        tasks = [asyncio.create_task(run_one(*job)) for job in jobs]
        pending = len(tasks)
        while pending:
            event = await queue.get()
            if event["type"] == "source_completed":
                finished += 1
                event["progress"] = round(finished / len(jobs) * 100)
            yield event
            if event["type"] == "source_completed":
                pending -= 1
        await asyncio.gather(*tasks, return_exceptions=True)
        unique = {}
        for items in results.values():
            for item in items:
                unique.setdefault(item["url"], item)
        yield {
            "type": "audit_completed",
            "progress": 100,
            "summary": {
                "company_name": company,
                "city": city,
                "sources_checked": len(jobs),
                "results_count": len(unique),
                "results": list(unique.values()),
                "notice": "Découverte web indicative : chaque résultat doit être vérifié. Les profils sociaux ne sont pas confirmés par la plateforme elle-même.",
            },
        }
