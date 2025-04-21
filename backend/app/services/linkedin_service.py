import asyncio
from bs4 import BeautifulSoup
import httpx
import re
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from urllib.parse import quote

from fastapi import HTTPException
from app.models.base import JobDescription, ResumeOptimizationResponse

class CacheEntry:
    def __init__(self, data, timestamp):
        self.data = data
        self.timestamp = timestamp

    def is_valid(self, ttl_seconds: int = 300):  # 5 minutes TTL
        return (datetime.now() - self.timestamp) < timedelta(seconds=ttl_seconds)

class RateLimiter:
    def __init__(self, calls: int, period: int):
        self.calls = calls
        self.period = period
        self.timestamps = []

    async def acquire(self):
        now = time.time()
        self.timestamps = [t for t in self.timestamps if now - t <= self.period]
        
        if len(self.timestamps) >= self.calls:
            sleep_time = self.timestamps[0] + self.period - now
            if sleep_time > 0:
                await asyncio.sleep(sleep_time)
        
        self.timestamps.append(now)

class LinkedInService:
    def __init__(self):
        self.base_url = "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search"
        self.rate_limiter = RateLimiter(calls=30, period=60)  # Increased to 30 calls per minute
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        self._cache: Dict[str, CacheEntry] = {}

    def _get_cache(self, key: str) -> Optional[List[JobDescription]]:
        """Get data from cache if it exists and is valid."""
        if key in self._cache and self._cache[key].is_valid():
            return self._cache[key].data
        return None

    def _set_cache(self, key: str, data: List[JobDescription]):
        """Set data in cache with current timestamp."""
        self._cache[key] = CacheEntry(data, datetime.now())

    async def _get_with_retry(self, url: str, retries: int = 3, delay: float = 0.5) -> Optional[BeautifulSoup]:
        """Get URL content with retries and rate limiting."""
        async with httpx.AsyncClient(headers=self.headers, timeout=30.0) as client:
            for attempt in range(retries):
                try:
                    await self.rate_limiter.acquire()
                    response = await client.get(url)
                    
                    if response.status_code == 200:
                        return BeautifulSoup(response.content, 'html.parser')
                    elif response.status_code == 429:
                        delay *= 2  # Exponential backoff
                        await asyncio.sleep(delay)
                    else:
                        raise HTTPException(
                            status_code=response.status_code,
                            detail=f"LinkedIn API error: {response.text}"
                        )
                        
                except (httpx.RequestError, asyncio.TimeoutError) as e:
                    if attempt == retries - 1:
                        raise HTTPException(
                            status_code=503,
                            detail=f"Failed to fetch LinkedIn data: {str(e)}"
                        )
                    await asyncio.sleep(delay)
        return None

    def _clean_text(self, text: str) -> str:
        """Clean text by removing HTML tags and normalizing whitespace."""
        if not text:
            return ""
            
        if hasattr(text, 'get_text'):
            text = text.get_text()
            
        text = re.sub(r'<[^>]*?>', '', text)
        text = re.sub(r'[\n\r\t]+', ' ', text)
        text = re.sub(r'\s+', ' ', text)
        text = re.sub(r'</div>', '', text)
        return text.strip()

    def _transform_job_description(self, soup: BeautifulSoup) -> str:
        """Extract and clean job description."""
        try:
            description_div = soup.find('div', class_='description__text description__text--rich')
            if description_div:
                # Clean nested elements
                for element in description_div.find_all(['div', 'span', 'a']):
                    element.unwrap()
                    
                # Handle bullet points
                for ul in description_div.find_all('ul'):
                    for li in ul.find_all('li'):
                        li.insert(0, '• ')
                        li.unwrap()
                    ul.unwrap()
                
                text = description_div.get_text(separator='\n', strip=True)
                return self._clean_text(text)
                
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Error extracting job description: {str(e)}"
            )
            
        return "Description not available"

    async def get_job_by_url(self, url: str) -> Optional[JobDescription]:
        """Get job details from a LinkedIn job URL."""
        try:
            soup = await self._get_with_retry(url)
            if not soup:
                return None

            title_elem = soup.find('h1', class_='top-card-layout__title')
            company_elem = soup.find('a', class_='topcard__org-name-link')
            location_elem = soup.find('span', class_='topcard__flavor--bullet')
            description = self._transform_job_description(soup)

            if not all([title_elem, company_elem]):
                return None

            job_id = url.split('/')[-1].split('?')[0]
            return JobDescription(
                job_id=job_id,
                title=self._clean_text(title_elem),
                company=self._clean_text(company_elem),
                location=self._clean_text(location_elem) if location_elem else "",
                description=description,
                url=url
            )
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Error fetching job details: {str(e)}"
            )

    async def search_jobs(
        self,
        keywords: str,
        location: str,
        job_type: Optional[str] = None,
        max_results: int = 10,  # Default to 10 for first page
        start: int = 0  # Added start parameter for pagination
    ) -> List[JobDescription]:
        """Search for jobs with pagination and caching support."""
        cache_key = f"{keywords}:{location}:{job_type}:{start}:{max_results}"
        cached_result = self._get_cache(cache_key)
        if cached_result:
            return cached_result

        try:
            keywords = quote(keywords)
            location = quote(location)
            
            url = f"{self.base_url}?keywords={keywords}&location={location}&start={start}"
            if job_type and job_type.lower() == 'remote':
                url += "&f_WT=2"
            
            soup = await self._get_with_retry(url)
            if not soup:
                return []
            
            divs = soup.find_all('div', class_='base-search-card__info')
            if not divs:
                return []

            jobs = []
            for item in divs:
                try:
                    title_elem = item.find('h3')
                    company_elem = item.find('a', class_='hidden-nested-link')
                    location_elem = item.find('span', class_='job-search-card__location')
                    parent_div = item.parent
                    entity_urn = parent_div.get('data-entity-urn', '')
                    
                    if not all([title_elem, company_elem, entity_urn]):
                        continue
                    
                    job_id = entity_urn.split(':')[-1] if entity_urn else str(int(time.time()))
                    job_url = f'https://www.linkedin.com/jobs/view/{job_id}/'
                    
                    # Create job without description first
                    job = JobDescription(
                        job_id=job_id,
                        title=self._clean_text(title_elem),
                        company=self._clean_text(company_elem),
                        location=self._clean_text(location_elem) if location_elem else "",
                        description="Loading...",  # Placeholder
                        url=job_url
                    )
                    jobs.append(job)
                    
                    if len(jobs) >= max_results:
                        break
                        
                except Exception:
                    continue

            # Cache the initial results with placeholder descriptions
            self._set_cache(cache_key, jobs)
            return jobs
            
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Error during job search: {str(e)}"
            )