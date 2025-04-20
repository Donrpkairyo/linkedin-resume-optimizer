from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
import os

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
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
environment = os.getenv("ENVIRONMENT", "development")

# Define allowed origins based on environment
if environment == "production":
    # In production, only allow the specified frontend URL and its HTTPS variant
    https_frontend_url = frontend_url.replace("http://", "https://")
    origins = [frontend_url, https_frontend_url]
else:
    # In development, allow localhost variants
    origins = [
        frontend_url,
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ]

# Remove any None or empty values from origins
origins = [origin for origin in origins if origin]

# Log the allowed origins
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

# Health check endpoint
@app.get("/health")
async def health_check():
    return JSONResponse(
        status_code=200,
        content={
            "status": "healthy",
            "version": "1.0.0",
            "environment": os.getenv("ENVIRONMENT", "production"),
            "services": {
                "linkedin": "active",
                "resume_optimizer": "active"
            }
        }
    )

# Root endpoint
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

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True
    )