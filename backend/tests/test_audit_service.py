import pytest

from app.models import AuditRequest
from app.providers.search import DuckDuckGoSearch
from app.services.audit import AuditService


class FakeProvider:
    async def search(self, query: str, source: str):
        if source == "facebook":
            raise RuntimeError("provider unavailable")
        if source == "instagram":
            await __import__("asyncio").sleep(0.01)
        return [{
            "title": f"Result {source}",
            "url": "https://example.com/shared" if source == "web" else f"https://example.com/{source}",
            "snippet": "",
            "source": source,
        }]


@pytest.mark.asyncio
async def test_stream_reports_each_source_and_finishes_at_100_percent():
    service = AuditService(provider=FakeProvider(), concurrency=2)
    events = [event async for event in service.stream(
        AuditRequest(company_name="Boulangerie Martin", city="Narbonne", sector="boulangerie")
    )]
    completed = [event for event in events if event["type"] == "source_completed"]
    assert len(completed) == 9
    assert sorted(event["progress"] for event in completed) == sorted(
        round(i / 9 * 100) for i in range(1, 10)
    )
    assert any(event["source"] == "facebook" and event["status"] == "limited" for event in completed)
    assert events[-1]["type"] == "audit_completed"
    assert events[-1]["progress"] == 100
    assert events[-1]["summary"]["results_count"] == 8


def test_search_parser_decodes_duckduckgo_redirect_and_deduplicates():
    html = """
    <div class="result">
      <a class="result__a" href="https://duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fpage">Example</a>
      <a class="result__snippet">A public result</a>
    </div>
    <div class="result">
      <a class="result__a" href="https://example.com/page">Duplicate</a>
    </div>
    """
    results = DuckDuckGoSearch.parse_results(html, "web")
    assert len(results) == 1
    assert results[0]["url"] == "https://example.com/page"
    assert results[0]["source"] == "web"


def test_build_default_provider_prefers_official_api_when_key_is_set():
    from app.providers.search import BraveSearch, build_default_provider

    assert isinstance(build_default_provider({}), DuckDuckGoSearch)
    provider = build_default_provider({"BRAVE_SEARCH_API_KEY": "test-key"})
    assert isinstance(provider, BraveSearch)
    assert provider.reliability == "api-officielle"


@pytest.mark.asyncio
async def test_brave_provider_parses_official_api_response_and_sends_key():
    import httpx
    from app.providers.search import BraveSearch

    seen = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["token"] = request.headers.get("X-Subscription-Token")
        seen["q"] = request.url.params.get("q")
        return httpx.Response(200, json={"web": {"results": [
            {"title": "Boulangerie Martin", "url": "https://example.com/martin", "description": "Pain"},
            {"title": "Doublon", "url": "https://example.com/martin"},
            {"title": "Sans lien", "url": "ftp://nope"},
        ]}})

    provider = BraveSearch("secret-key", transport=httpx.MockTransport(handler))
    results = await provider.search('"Martin" "Narbonne"', "web")
    assert seen == {"token": "secret-key", "q": '"Martin" "Narbonne"'}
    assert [r["url"] for r in results] == ["https://example.com/martin"]
    assert results[0]["provider"] == "brave"


@pytest.mark.asyncio
async def test_duckduckgo_retries_once_on_rate_limit_then_succeeds():
    import httpx
    from app.providers.search import DuckDuckGoSearch

    calls = {"n": 0}
    html = '<div class="result"><a class="result__a" href="https://example.com/ok">OK</a></div>'

    def handler(request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        if calls["n"] == 1:
            return httpx.Response(429)
        return httpx.Response(200, text=html)

    provider = DuckDuckGoSearch(transport=httpx.MockTransport(handler), retry_delay=0)
    results = await provider.search("boulangerie", "web")
    assert calls["n"] == 2
    assert results[0]["url"] == "https://example.com/ok"
    assert results[0]["provider"] == "duckduckgo"
