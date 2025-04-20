from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class JobSearchRequest(BaseModel):
    keywords: str
    location: Optional[str] = None
    job_type: Optional[str] = None
    limit: int = Field(default=10, ge=1, le=100)

class JobDescription(BaseModel):
    job_id: Optional[str] = None
    title: str
    company: str
    location: str
    description: str
    url: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())

class ResumeOptimizationRequest(BaseModel):
    resume_text: str
    job_description: str
    preserve_format: bool = False

class ResumeOptimizationResponse(BaseModel):
    original_resume: str
    optimized_resume: str
    optimization_id: str
    changes_summary: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())