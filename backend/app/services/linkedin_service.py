import asyncio
from bs4 import BeautifulSoup
import httpx
import re
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from urllib.parse import quote
from app.models.base import JobSearchRequest, JobSearchResponse, JobDescription

class CacheEntry:
    def __init__(self, data, timestamp):
        self.data = data
        self.timestamp = timestamp
        self.access_count = 0
        self.last_access = timestamp

    def is_valid(self, ttl_seconds: int = 300):  # 5 minutes TTL
        now = datetime.now()
        age = (now - self.timestamp).total_seconds()
        
        # Extend TTL based on access frequency and recency
        if self.access_count > 10:
            ttl_seconds *= 2
        if (now - self.last_access).total_seconds() < 60:
            ttl_seconds *= 1.5
            
        return age < ttl_seconds
    
    def access(self):
        self.access_count += 1
        self.last_access = datetime.now()

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
        self.rate_limiter = RateLimiter(calls=30, period=60)  # 30 calls per minute
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        self._cache: Dict[str, CacheEntry] = {}
        self._description_cache: Dict[str, CacheEntry] = {}
        self._cleanup_task = asyncio.create_task(self._cache_cleanup())

    async def _cache_cleanup(self):
        """Periodically clean up expired cache entries"""
        while True:
            try:
                await asyncio.sleep(300)  # Run every 5 minutes
                now = datetime.now()
                
                # Clean search cache
                expired_keys = [
                    key for key, entry in self._cache.items()
                    if (now - entry.timestamp).total_seconds() > 3600  # 1 hour max
                ]
                for key in expired_keys:
                    del self._cache[key]
                
                # Clean description cache
                expired_keys = [
                    key for key, entry in self._description_cache.items()
                    if (now - entry.timestamp).total_seconds() > 7200  # 2 hours max
                ]
                for key in expired_keys:
                    del self._description_cache[key]
                    
            except Exception as e:
                print(f"Cache cleanup error: {str(e)}")

    def _get_cache(self, key: str, cache: Dict[str, CacheEntry] = None) -> Optional[any]:
        """Get data from cache if it exists and is valid."""
        cache = cache or self._cache
        if key in cache and cache[key].is_valid():
            cache[key].access()
            return cache[key].data
        return None

    def _set_cache(self, key: str, data: any, cache: Dict[str, CacheEntry] = None):
        """Set data in cache with current timestamp."""
        cache = cache or self._cache
        cache[key] = CacheEntry(data, datetime.now())

    async def _get_with_retry(self, url: str, retries: int = 3) -> Optional[BeautifulSoup]:
        """Get URL content with smart retries."""
        async with httpx.AsyncClient(headers=self.headers, timeout=30.0) as client:
            for attempt in range(retries):
                try:
                    if attempt > 0:
                        await asyncio.sleep(2 ** attempt)  # Exponential backoff
                        print(f"Retry attempt {attempt + 1} for URL: {url}")
                        
                    response = await client.get(url)
                    print(f"Response status: {response.status_code} for URL: {url}")
                    
                    if response.status_code == 200:
                        return BeautifulSoup(response.content, 'html.parser')
                    elif response.status_code == 404:
                        return None
                    elif response.status_code == 429:  # Rate limit hit
                        if attempt < retries - 1:
                            continue  # Try again with backoff
                        return None  # Skip this job rather than fail
                    else:
                        if attempt == retries - 1:
                            return None  # Skip problematic jobs on final attempt
                        
                except Exception:
                    if attempt == retries - 1:
                        return None  # Skip on final attempt instead of failing
                    
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

    async def search_jobs(self, request: JobSearchRequest) -> JobSearchResponse:
        """Search for jobs with pagination and caching."""
        try:
            start = int(request.page or 0) * 10  # Each page has 10 results
            cache_key = f"{request.keywords}:{request.location}:{request.job_type}:{start}"
            
            cached = self._get_cache(cache_key)
            if cached:
                return cached

            # Build search URL with all filters
            url = f"{self.base_url}?keywords={quote(request.keywords)}&start={start}"
            if request.location:
                url += f"&location={quote(request.location)}"
            if request.job_type:
                url += f"&f_JT={self._get_job_type_filter(request.job_type)}"
            if request.remote_filter:
                url += f"&f_WT={self._get_remote_filter(request.remote_filter)}"
            if request.experience_level:
                url += f"&f_E={self._get_experience_level_filter(request.experience_level)}"
            if request.date_posted:
                url += f"&f_TPR={self._get_date_filter(request.date_posted)}"
            
            await self.rate_limiter.acquire()
            soup = await self._get_with_retry(url)
            
            if not soup:
                return JobSearchResponse(jobs=[], total=0, has_more=False)
            
            divs = soup.find_all('div', class_='base-search-card__info')
            if not divs:
                return JobSearchResponse(jobs=[], total=0, has_more=False)

            jobs = []
            for item in divs:
                try:
                    title_elem = item.find('h3')
                    company_elem = item.find('a', class_='hidden-nested-link')
                    location_elem = item.find('span', class_='job-search-card__location')
                    time_elem = item.find('time', class_='job-search-card__listdate')
                    job_id = item.parent.get('data-entity-urn', '').split(':')[-1]

                    if not all([title_elem, company_elem, job_id]):
                        continue

                    url = f'https://www.linkedin.com/jobs/view/{job_id}'  # Remove trailing slash

                    jobs.append(JobDescription(
                        job_id=job_id,
                        title=self._clean_text(title_elem),
                        company=self._clean_text(company_elem),
                        location=self._clean_text(location_elem) if location_elem else "",
                        description="",
                        url=url,
                        ago_time=self._clean_text(time_elem) if time_elem else None,
                        created_at=datetime.now().isoformat()
                    ))
                except Exception:
                    continue

            result = JobSearchResponse(
                jobs=jobs,
                total=100 if len(jobs) >= 10 else len(jobs),
                has_more=len(jobs) >= 10
            )

            self._set_cache(cache_key, result)
            return result

        except Exception as e:
            print(f"Error searching jobs: {str(e)}")
            return JobSearchResponse(jobs=[], total=0, has_more=False)

    async def get_job_description(self, job_id: str) -> str:
        """Get description for a specific job ID with caching."""
        try:
            cache_key = f"desc:{job_id}"
            cached = self._get_cache(cache_key, self._description_cache)
            if cached:
                return cached

            # Remove any trailing slashes from job_id
            job_id = job_id.rstrip('/')
            url = f"https://www.linkedin.com/jobs/view/{job_id}"
            await self.rate_limiter.acquire()
            
            soup = await self._get_with_retry(url)
            if not soup:
                return ""

            description_div = soup.find('div', class_='description__text description__text--rich')
            if not description_div:
                return ""

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
            description = self._clean_text(text)
            
            self._set_cache(cache_key, description, self._description_cache)
            return description
            
        except Exception as e:
            print(f"Error getting description: {str(e)}")
            return ""

    def _get_job_type_filter(self, job_type: str) -> str:
        filters = {
            'full-time': 'F',
            'part-time': 'P',
            'contract': 'C',
            'temporary': 'T',
            'volunteer': 'V',
            'internship': 'I'
        }
        return filters.get(job_type.lower(), '')

    def _get_remote_filter(self, remote_filter: str) -> str:
        filters = {
            'remote': '2',
            'on-site': '1',
            'hybrid': '3'
        }
        return filters.get(remote_filter.lower(), '')

    def _get_experience_level_filter(self, experience_level: str) -> str:
        filters = {
            'internship': '1',
            'entry level': '2',
            'associate': '3',
            'senior': '4',
            'director': '5',
            'executive': '6'
        }
        return filters.get(experience_level.lower(), '')

    def _get_date_filter(self, date_posted: str) -> str:
        filters = {
            '24hr': 'r86400',
            'past week': 'r604800',
            'past month': 'r2592000'
        }
        return filters.get(date_posted.lower(), '')
