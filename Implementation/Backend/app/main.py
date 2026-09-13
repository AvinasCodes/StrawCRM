import os
import logging
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.routes import auth, tickets, customers, ai, analytics, dashboard, upload, users

# Configure logging without logging secrets or credentials
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("strawcrm.app")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    docs_url="/docs" if settings.ENVIRONMENT == "development" else None,
    redoc_url=None,
)

# Enforce secure CORS policy with multi-port localhost support in development
origins = list(set(settings.ALLOWED_ORIGINS + [settings.FRONTEND_URL]))
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"^(https?://(localhost|127\.0\.0\.1)(:\d+)?|https://.*\.onrender\.com)$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    response.headers["Content-Security-Policy"] = "default-src 'self'"
    return response


from fastapi import HTTPException
from starlette.exceptions import HTTPException as StarletteHTTPException

# Safe Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    if isinstance(exc, (HTTPException, StarletteHTTPException)):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
        )
    logger.error("Unhandled exception on %s: %s", request.url.path, str(exc))
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": f"An unexpected error occurred: {str(exc)}"},
    )


# Health check
@app.get("/health", tags=["Health"])
@app.get("/api/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT,
    }


@app.get("/api/health/email", tags=["Health"])
async def email_health():
    smtp_user = os.getenv("SMTP_USER") or settings.SMTP_USER or ""
    smtp_pass = os.getenv("SMTP_PASSWORD") or settings.SMTP_PASSWORD or ""
    return {
        "configured": bool(smtp_user and smtp_pass),
        "user": smtp_user[:4] + "***@" + smtp_user.split("@")[-1] if "@" in smtp_user else "none",
        "host": settings.SMTP_HOST,
        "port": settings.SMTP_PORT,
    }


@app.post("/api/health/email/test", tags=["Health"])
async def test_email_dispatch(to: str = "avinasharyan481@gmail.com"):
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    from email.utils import formataddr
    from app.services.email_service import EmailService

    smtp_user = os.getenv("SMTP_USER") or settings.SMTP_USER
    smtp_pass = os.getenv("SMTP_PASSWORD") or settings.SMTP_PASSWORD
    smtp_host = os.getenv("SMTP_HOST") or settings.SMTP_HOST

    diagnostics = {}

    # Test Port 465 (SSL)
    try:
        with smtplib.SMTP_SSL(smtp_host, 465, timeout=10) as s:
            s.login(smtp_user, smtp_pass)
            msg = MIMEMultipart()
            msg["Subject"] = "[StrawCRM] Direct SSL Port 465 Test"
            msg["From"] = formataddr(("StrawCRM Support", smtp_user))
            msg["To"] = to
            msg.attach(MIMEText("Testing live SSL delivery on port 465.", "plain"))
            s.sendmail(smtp_user, [to], msg.as_string())
        diagnostics["port_465_ssl"] = "SUCCESS"
    except Exception as e:
        diagnostics["port_465_ssl"] = f"ERROR: {type(e).__name__} - {str(e)}"

    # Test Port 587 (STARTTLS)
    try:
        with smtplib.SMTP(smtp_host, 587, timeout=10) as s:
            s.ehlo()
            s.starttls()
            s.ehlo()
            s.login(smtp_user, smtp_pass)
            msg = MIMEMultipart()
            msg["Subject"] = "[StrawCRM] STARTTLS Port 587 Test"
            msg["From"] = formataddr(("StrawCRM Support", smtp_user))
            msg["To"] = to
            msg.attach(MIMEText("Testing live STARTTLS delivery on port 587.", "plain"))
            s.sendmail(smtp_user, [to], msg.as_string())
        diagnostics["port_587_starttls"] = "SUCCESS"
    except Exception as e:
        diagnostics["port_587_starttls"] = f"ERROR: {type(e).__name__} - {str(e)}"

    ticket = {
        "ticket_id": "TKT-TEST",
        "subject": "Render Live SMTP Test via EmailService",
        "customer_name": "Test Customer",
        "priority": "Normal",
        "status": "Open",
        "description": "Testing live email delivery from Render deployment using EmailService",
    }
    brevo_key = (os.getenv("BREVO_API_KEY") or getattr(settings, "BREVO_API_KEY", "") or "").strip()
    resend_key = (os.getenv("RESEND_API_KEY") or getattr(settings, "RESEND_API_KEY", "") or "").strip()
    diagnostics["brevo_configured"] = bool(brevo_key)
    diagnostics["resend_configured"] = bool(resend_key)
    diagnostics["email_service_result"] = service_success
    diagnostics["recipient"] = to

    return diagnostics


# Include Application Routers
app.include_router(auth.router)
app.include_router(tickets.router)
app.include_router(customers.router)
app.include_router(upload.router)
app.include_router(ai.router)
app.include_router(analytics.router)
app.include_router(dashboard.router)
app.include_router(users.router)

# Realtime WebSocket Endpoint for Multi-Browser / Multi-Client Synchronizations
from fastapi import WebSocket, WebSocketDisconnect
from app.core.ws_manager import ws_manager
import json


@app.websocket("/ws")
@app.websocket("/api/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data:
                try:
                    payload = json.loads(data)
                    if payload.get("type") == "ping":
                        await websocket.send_json({"type": "pong"})
                except Exception:
                    pass
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)


# Mount uploads static directory for ticket attachments
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
