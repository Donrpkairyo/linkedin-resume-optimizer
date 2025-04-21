from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from urllib.parse import urlparse, unquote

from app.models.base import JobDescription, JobSearchRequest
from app.services.linkedin_service import LinkedInService

router = APIRouter()
linkedin_service = LinkedInService()

@router.post("/search", response_model=List[JobDescription])
async def search_jobs(request: JobSearchRequest):
    """
    Search for jobs on LinkedIn based on keywords and filters.
    """
    try:
        jobs = await linkedin_service.search_jobs(
            keywords=request.keywords,
            location=request.location or "",
            job_type=request.job_type,
            max_results=request.limit
        )
        return jobs
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error searching jobs: {str(e)}"
        )

@router.get("/url", response_model=JobDescription)
async def get_job_by_url(
    url: str = Query(..., description="LinkedIn job posting URL")
):
    """
    Get job details from a LinkedIn job posting URL.
    """
    try:
        # Validate URL
        parsed_url = urlparse(url)
        if not parsed_url.netloc.endswith('linkedin.com'):
            raise HTTPException(
                status_code=400,
                detail="Invalid LinkedIn URL"
            )

        # Extract job ID from URL, handling both /view/ID and /view/ID/ formats
        path_parts = [p for p in parsed_url.path.split('/') if p]
        if len(path_parts) < 2 or path_parts[-2] != 'view':
            raise HTTPException(
                status_code=400,
                detail="Invalid LinkedIn job URL format. Expected format: /jobs/view/[ID]"
            )
            
        job_id = path_parts[-1].split('?')[0]  # Remove any query parameters
        if not job_id.isdigit():
            raise HTTPException(
                status_code=400,
                detail="Invalid job ID in URL"
            )

        # Use the service to fetch job details
        soup = await linkedin_service._get_with_retry(url)
        if not soup:
            raise HTTPException(
                status_code=404,
                detail="Job posting not found"
            )

        # Extract job details
        title_elem = soup.find('h1', class_='top-card-layout__title')
        company_elem = soup.find('a', class_='topcard__org-name-link')
        location_elem = soup.find('span', class_='topcard__flavor--bullet')

        if not all([title_elem, company_elem]):
            raise HTTPException(
                status_code=404,
                detail="Could not extract job details"
            )

        description = linkedin_service._transform_job_description(soup)

        return JobDescription(
            job_id=job_id,
            title=linkedin_service._clean_text(title_elem),
            company=linkedin_service._clean_text(company_elem),
            location=linkedin_service._clean_text(location_elem) if location_elem else "",
            description=description,
            url=url
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching job details: {str(e)}"
        )