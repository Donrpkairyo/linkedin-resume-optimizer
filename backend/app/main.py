from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
import os
import time

# Import routers
from app.api import jobs, optimize

# Load environment variables
load_dotenv()

# Create FastAPI app
app = FastAPI(
    title="LinkedIn Resume Optimizer API",
    description="API for LinkedIn job search and resume optimization",
    version="1.0.0"
)

# Configure CORS
origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:5175",
    "https://linkedin-resume-optimizer.vercel.app",
]

print(f"Allowed CORS origins: {origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(jobs.router, prefix="/api/jobs", tags=["jobs"])
app.include_router(optimize.router, prefix="/api/optimize", tags=["optimize"])

# Ping endpoint
@app.get("/api/ping")
async def ping():
    return {"status": "ok", "timestamp": int(time.time())}

# Health check endpoint
@app.get("/health")
async def health_check():
    return JSONResponse(
        status_code=200,
        content={
            "status": "healthy",
            "version": "1.0.0",
            "environment": os.getenv("ENVIRONMENT", "development"),
            "services": {
                "linkedin": "active",
                "resume_optimizer": "active"
            }
        }
    )

# Root endpoint
@app.get("/ping")
async def ping():
    return {"status": "ok", "timestamp": int(time.time())}

@app.get("/")
async def root():
    return {"message": "LinkedIn Resume Optimizer API is running"}

# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": str(exc.detail),
            "status_code": exc.status_code
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={
            "detail": f"Internal server error: {str(exc)}",
            "status_code": 500
        }
    )
