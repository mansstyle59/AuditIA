import json
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from app.models import AuditRequest
from app.services.audit import AuditService

app = FastAPI(title="AuditIA Intelligence 360 API", version="0.1.0")
origins = os.getenv("AUDITIA_ALLOWED_ORIGINS", "https://mansstyle59.github.io").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in origins if origin.strip()],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "auditia-python", "version": "0.1.0"}


@app.post("/api/v1/audits/stream")
async def stream_audit(request: AuditRequest):
    async def events():
        async for event in AuditService().stream(request):
            yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
