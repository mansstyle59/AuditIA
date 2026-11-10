from pydantic import BaseModel, Field, HttpUrl


class AuditRequest(BaseModel):
    company_name: str = Field(min_length=2, max_length=160)
    city: str = Field(min_length=2, max_length=120)
    sector: str = Field(default="commerce", max_length=120)
    website: HttpUrl | None = None


class SearchResult(BaseModel):
    title: str
    url: str
    snippet: str = ""
    source: str

