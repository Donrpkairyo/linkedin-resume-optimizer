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

class LinkedInService:
    def __init__(self):
        self.base_url = "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search"
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

    async def _get_with_retry(self, url: str, retries: int = 2) -> Optional[BeautifulSoup]:
        """Get URL content with retries."""
        async with httpx.AsyncClient(headers=self.headers, timeout=10.0) as client:
            for attempt in range(retries):
                try:
                    response = await client.get(url)
                    if response.status_code == 200:
                        return BeautifulSoup(response.content, 'html.parser')
                except Exception as e:
                    if attempt == retries - 1:
                        print(f"Failed to fetch {url}: {str(e)}")
                    continue
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
        return text.strip()

    def _transform_job_description(self, soup: BeautifulSoup) -> str:
        """Extract and clean job description."""
        try:
            description_div = soup.find('div', class_='description__text description__text--rich')
            if description_div:
                # Clean nested elements
                for element in description_div.find_all(['div', 'span', 'a']):
                    element.unwrap()
                
                text = description_div.get_text(separator='\n', strip=True)
                return self._clean_text(text)
        except Exception:
            pass
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
            print(f"Error getting job by URL: {str(e)}")
            return None

    async def search_jobs(
        self,
        keywords: str,
        location: str,
        job_type: Optional[str] = None,
        max_results: int = 10  # Limited results for faster loading
    ) -> List[JobDescription]:
        """Search for jobs."""
        cache_key = f"{keywords}:{location}:{job_type}:{max_results}"
        cached_result = self._get_cache(cache_key)
        if cached_result:
            print(f"Cache hit for {cache_key}")
            return cached_result

        print(f"Cache miss for {cache_key}")
        try:
            url = f"{self.base_url}?keywords={quote(keywords)}&location={quote(location)}"
            if job_type and job_type.lower() == 'remote':
                url += "&f_WT=2"
            
            soup = await self._get_with_retry(url)
            if not soup:
                return []

            divs = soup.find_all('div', class_='base-search-card__info')
            print(f"Found {len(divs)} job cards")
            
            async def process_job(item):
                try:
                    title_elem = item.find('h3')
                    company_elem = item.find('a', class_='hidden-nested-link')
                    location_elem = item.find('span', class_='job-search-card__location')
                    parent_div = item.parent
                    entity_urn = parent_div.get('data-entity-urn', '')
                    
                    if not all([title_elem, company_elem, entity_urn]):
                        return None
                    
                    job_id = entity_urn.split(':')[-1] if entity_urn else str(int(time.time()))
                    job_url = f'https://www.linkedin.com/jobs/view/{job_id}/'
                    
                    description_soup = await self._get_with_retry(job_url)
                    description = self._transform_job_description(description_soup) if description_soup else "Description not available"
                    
                    return JobDescription(
                        job_id=job_id,
                        title=self._clean_text(title_elem),
                        company=self._clean_text(company_elem),
                        location=self._clean_text(location_elem) if location_elem else "",
                        description=description,
                        url=job_url
                    )
                except Exception as e:
                    print(f"Error processing job: {str(e)}")
                    return None

            tasks = [process_job(item) for item in divs[:max_results]]
            results = await asyncio.gather(*tasks)
            jobs = [job for job in results if job is not None]
            
            result = jobs[:max_results]
            self._set_cache(cache_key, result)
            return result
            
        except Exception as e:
            print(f"Error during job search: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Error during job search: {str(e)}"
            )