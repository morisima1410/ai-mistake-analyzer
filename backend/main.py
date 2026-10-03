"""
Main FastAPI entry point for AI Mistake Analyzer.
Serves backend API endpoints and frontend HTML, CSS, and JS assets.
"""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import uvicorn

from backend.database import init_db
from backend.ml_model import ml_classifier
from backend.routes import auth, dashboard, analyze, history, profile, contact

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup: initialize database tables and train initial ML classifier."""
    init_db()
    print("[AI Mistake Analyzer] Database tables initialized.")

    ml_classifier.train()
    print("[AI Mistake Analyzer] scikit-learn classifier ready.")

    yield
    print("[AI Mistake Analyzer] Shutdown complete.")


app = FastAPI(
    title="AI Mistake Analyzer API",
    description="Educational AI/ML diagnostics for student mistake comprehension",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routers
app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(analyze.router)
app.include_router(history.router)
app.include_router(profile.router)
app.include_router(contact.router)


@app.get("/api/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "ml_model_trained": ml_classifier.is_trained,
        "classes": ml_classifier.labels,
    }


# Static Assets Mounts
css_dir = os.path.join(FRONTEND_DIR, "css")
js_dir = os.path.join(FRONTEND_DIR, "js")

if os.path.exists(css_dir):
    app.mount("/css", StaticFiles(directory=css_dir), name="css")

if os.path.exists(js_dir):
    app.mount("/js", StaticFiles(directory=js_dir), name="js")


# Page Routes
def serve_html(filename: str, status_code: int = 200):
    file_path = os.path.join(FRONTEND_DIR, filename)
    if os.path.exists(file_path):
        return FileResponse(file_path, status_code=status_code)
    # Root fallback
    root_path = os.path.join(BASE_DIR, filename)
    return FileResponse(root_path, status_code=status_code)


@app.get("/", response_class=FileResponse)
@app.get("/index", response_class=FileResponse)
@app.get("/home", response_class=FileResponse)
@app.get("/index.html", response_class=FileResponse)
def page_welcome():
    return serve_html("index.html")


@app.get("/register", response_class=FileResponse)
@app.get("/signup", response_class=FileResponse)
@app.get("/register.html", response_class=FileResponse)
def page_register():
    return serve_html("register.html")


@app.get("/login", response_class=FileResponse)
@app.get("/signin", response_class=FileResponse)
@app.get("/login.html", response_class=FileResponse)
def page_login():
    return serve_html("login.html")


@app.get("/dashboard", response_class=FileResponse)
@app.get("/dashboard.html", response_class=FileResponse)
def page_dashboard():
    return serve_html("dashboard.html")


@app.get("/analyze", response_class=FileResponse)
@app.get("/analyze.html", response_class=FileResponse)
def page_analyze():
    return serve_html("analyze.html")


@app.get("/history", response_class=FileResponse)
@app.get("/history.html", response_class=FileResponse)
def page_history():
    return serve_html("history.html")


@app.get("/profile", response_class=FileResponse)
@app.get("/profile.html", response_class=FileResponse)
def page_profile():
    return serve_html("profile.html")


@app.get("/contact", response_class=FileResponse)
@app.get("/contact.html", response_class=FileResponse)
def page_contact():
    return serve_html("contact.html")


@app.get("/about", response_class=FileResponse)
@app.get("/about-us", response_class=FileResponse)
@app.get("/about.html", response_class=FileResponse)
def page_about():
    return serve_html("about.html")


@app.get("/404", response_class=FileResponse)
@app.get("/404.html", response_class=FileResponse)
def page_not_found():
    return serve_html("404.html", status_code=404)


@app.exception_handler(404)
async def custom_404_handler(request, exc):
    return serve_html("404.html", status_code=404)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")
    print(f"Starting server at http://{host}:{port} ...")
    uvicorn.run("backend.main:app", host=host, port=port, reload=True)
