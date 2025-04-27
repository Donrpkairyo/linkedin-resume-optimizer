from fastapi import APIRouter, HTTPException, Body, Response
from app.models.base import JobSearchRequest, JobSearchResponse
from app.services.linkedin_service import LinkedInService
from app.services.gemini_service import GeminiService
from typing import Dict
import asyncio
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

router = APIRouter()
linkedin_service = LinkedInService()
gemini_service = GeminiService()

@router.post("/search", response_model=JobSearchResponse)
async def search_jobs(
    request: JobSearchRequest = Body(...),
    response: Response = None
) -> JobSearchResponse:
    """
    Search for jobs on LinkedIn with pagination support.
    Returns jobs with basic info, descriptions are loaded separately.
    """
    try:
        if not request.keywords:
            raise HTTPException(
                status_code=400,
                detail="Keywords are required for job search"
            )

        logger.info(f"Searching jobs: keywords='{request.keywords}', location='{request.location}', page={request.page}")
        
        # Add small delay to prevent rapid requests
        await asyncio.sleep(1)
        
        # Set cache headers
        if response:
            cache_time = 300  # 5 minutes
            response.headers.update({
                "Cache-Control": f"public, max-age={cache_time}",
                "Vary": "Accept-Encoding",
                "X-Cache-TTL": str(cache_time)
            })
        
        result = await linkedin_service.search_jobs(request)
        
        logger.info(f"Found {len(result.jobs)} jobs for keywords='{request.keywords}'")
        
        # If no jobs found, return empty response instead of error
        if not result.jobs:
            return JobSearchResponse(jobs=[], total=0, has_more=False)
            
        return result
        
    except Exception as e:
        error_msg = str(e).lower()
        if "rate limit" in error_msg or "too many requests" in error_msg:
            retry_after = 60
            reset_time = datetime.now() + timedelta(minutes=1)
            
            logger.warning(f"Rate limit hit for keywords='{request.keywords}'. Retry after {retry_after}s")
            
            # Set retry headers
            if response:
                response.headers.update({
                    "Retry-After": str(retry_after),
                    "X-RateLimit-Reset": str(int(reset_time.timestamp())),
                    "X-RateLimit-Remaining": "0"
                })
            raise HTTPException(
                status_code=429,
                detail="LinkedIn is rate limiting requests. Please wait a few minutes before trying again."
            )
            
        logger.error(f"Error searching jobs: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error searching jobs: {str(e)}"
        )

@router.get("/{job_id}/description")
async def get_job_description(
    job_id: str,
    response: Response = None
) -> str:
    """Get the full description for a specific job."""
    try:
        logger.info(f"Fetching description for job_id={job_id}")
        
        # Add small delay to prevent rapid requests
        await asyncio.sleep(1)
        
        # Set cache headers for longer caching of descriptions
        if response:
            cache_time = 3600  # 1 hour
            response.headers.update({
                "Cache-Control": f"public, max-age={cache_time}",
                "Vary": "Accept-Encoding",
                "X-Cache-TTL": str(cache_time)
            })
        
        description = await linkedin_service.get_job_description(job_id)
        
        if not description:
            logger.warning(f"No description found for job_id={job_id}")
            raise HTTPException(
                status_code=404,
                detail="Job description not found"
            )
            
        logger.info(f"Successfully fetched description for job_id={job_id} (length={len(description)})")
        return description
        
    except Exception as e:
        error_msg = str(e).lower()
        if "rate limit" in error_msg or "too many requests" in error_msg:
            retry_after = 60
            reset_time = datetime.now() + timedelta(minutes=1)
            
            logger.warning(f"Rate limit hit for job_id={job_id}. Retry after {retry_after}s")
            
            # Set retry headers
            if response:
                response.headers.update({
                    "Retry-After": str(retry_after),
                    "X-RateLimit-Reset": str(int(reset_time.timestamp())),
                    "X-RateLimit-Remaining": "0"
                })
            raise HTTPException(
                status_code=429,
                detail="LinkedIn is rate limiting requests. Please wait a few minutes before trying again."
            )
            
        logger.error(f"Error fetching description: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching job description: {str(e)}"
        )

@router.post("/optimize")
async def optimize_resume(
    data: Dict[str, str] = Body(...),
    response: Response = None
) -> str:
    """
    Optimize resume for a specific job listing.
    Expects a URL to the LinkedIn job posting.
    """
    try:
        if "url" not in data:
            raise HTTPException(
                status_code=400,
                detail="Job URL is required"
            )
            
        job_id = data["url"].split("/")[-1].split("?")[0]
        logger.info(f"Optimizing resume for job_id={job_id}")
        
        # Add small delay to prevent rapid requests
        await asyncio.sleep(1)
        
        # No caching for optimization results
        if response:
            response.headers.update({
                "Cache-Control": "no-store, no-cache",
                "Pragma": "no-cache"
            })
        
        description = await linkedin_service.get_job_description(job_id)
        
        if not description:
            logger.warning(f"No description found for job_id={job_id} during optimization")
            raise HTTPException(
                status_code=404,
                detail="Job description not found"
            )
            
        logger.info(f"Optimizing resume with description (length={len(description)})")
        optimization = await gemini_service.optimize_resume(description)
        return optimization
        
    except Exception as e:
        error_msg = str(e).lower()
        if "rate limit" in error_msg or "too many requests" in error_msg:
            retry_after = 300  # 5 minutes
            reset_time = datetime.now() + timedelta(minutes=5)
            
            logger.warning(f"Rate limit hit during optimization for job_id={job_id}. Retry after {retry_after}s")
            
            # Set retry headers
            if response:
                response.headers.update({
                    "Retry-After": str(retry_after),
                    "X-RateLimit-Reset": str(int(reset_time.timestamp())),
                    "X-RateLimit-Remaining": "0"
                })
            raise HTTPException(
                status_code=429,
                detail="Service is rate limited. Please wait a few minutes."
            )
            
        logger.error(f"Error optimizing resume: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error optimizing resume: {str(e)}"
        )
