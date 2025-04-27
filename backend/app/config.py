from typing import List
from pydantic import BaseSettings

class Settings(BaseSettings):
    app_name: str = "LinkedIn Resume Optimizer"
    app_version: str = "1.0.0"
    app_description: str = "Optimize your resume for job applications"
    api_prefix: str = "/api"
    openapi_url: str = "/openapi.json"
    docs_url: str = "/docs"
    redoc_url: str = "/redoc"
    debug: bool = True
    gemini_api_key: str = ""
    
    # CORS settings
    allowed_origins: List[str] = ["http://localhost:3000"]
    allowed_methods: List[str] = ["*"]
    allowed_headers: List[str] = ["*"]
    allow_credentials: bool = True

    class Config:
        env_file = ".env"
        case_sensitive = True

def get_settings() -> Settings:
    return Settings()