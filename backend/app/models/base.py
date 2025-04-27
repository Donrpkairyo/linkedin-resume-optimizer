from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class JobDescription(BaseModel):
    job_id: str
    title: str
    company: str
    location: str
    description: str
    url: str
    ago_time: Optional[str] = None
    created_at: str

class JobSearchRequest(BaseModel):
    keywords: str
    location: Optional[str] = None
    date_posted: Optional[str] = None
    job_type: Optional[str] = None
    remote_filter: Optional[str] = None
    experience_level: Optional[str] = None
    sort_by: Optional[str] = None
    page: Optional[int] = None
    limit: Optional[str] = None

class JobSearchResponse(BaseModel):
    jobs: List[JobDescription]
    total: int
    has_more: bool

class ResumeOptimizationRequest(BaseModel):
    resume_text: str
    job_description: str
    preserve_format: Optional[bool] = False

class ResumeOptimizationResponse(BaseModel):
    original_resume: str
    optimized_resume: str
    optimization_id: str
    created_at: str
    changes_summary: Optional[str] = None

class ErrorResponse(BaseModel):
    detail: str
    error_code: Optional[str] = None
    status_code: Optional[int] = None
