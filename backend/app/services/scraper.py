import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException
import json
import asyncio
import logging
from typing import Optional, List, Dict
import random

logger = logging.getLogger(__name__)

class LinkedInScraper:
    def __init__(self):
        self._driver = None
        self._wait_time = 10

    async def init(self):
        """Initialize the browser in headless mode"""
        if not self._driver:
            options = uc.ChromeOptions()
            options.add_argument('--headless')
            options.add_argument('--disable-gpu')
            options.add_argument('--no-sandbox')
            options.add_argument('--disable-dev-shm-usage')
            options.add_argument('--window-size=1920,1080')
            
            # Add random user agent
            user_agents = [
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
            ]
            options.add_argument(f'user-agent={random.choice(user_agents)}')
            
            self._driver = uc.Chrome(options=options)

    async def close(self):
        """Close the browser"""
        if self._driver:
            self._driver.quit()
            self._driver = None

    async def get_jobs(self, url: str) -> List[Dict]:
        """Get jobs from LinkedIn search page"""
        try:
            await self.init()
            self._driver.get(url)
            
            # Wait for job cards to load
            WebDriverWait(self._driver, self._wait_time).until(
                EC.presence_of_element_located((By.CLASS_NAME, "base-card"))
            )

            # Scroll down to load all content
            self._driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            await asyncio.sleep(2)  # Wait for dynamic content

            # Extract job cards
            job_cards = self._driver.find_elements(By.CLASS_NAME, "base-card")
            jobs = []

            for card in job_cards:
                try:
                    title = card.find_element(By.CLASS_NAME, "base-search-card__title").text
                    company = card.find_element(By.CLASS_NAME, "base-search-card__subtitle").text
                    location = card.find_element(By.CLASS_NAME, "job-search-card__location").text
                    link = card.find_element(By.CLASS_NAME, "base-card__full-link").get_attribute("href")
                    
                    try:
                        time_elem = card.find_element(By.CLASS_NAME, "job-search-card__listdate")
                        ago_time = time_elem.text
                    except:
                        ago_time = None

                    job_id = link.split('/')[-1].split('?')[0]
                    
                    jobs.append({
                        "job_id": job_id,
                        "title": title,
                        "company": company,
                        "location": location,
                        "url": link,
                        "ago_time": ago_time
                    })
                except Exception as e:
                    logger.error(f"Error parsing job card: {str(e)}")
                    continue

            return jobs

        except Exception as e:
            logger.error(f"Error getting jobs: {str(e)}")
            return []
        finally:
            await self.close()

    async def get_job_description(self, url: str) -> Optional[str]:
        """Get job description from LinkedIn job page"""
        try:
            await self.init()
            self._driver.get(url)
            
            # Wait for description to load
            description_elem = WebDriverWait(self._driver, self._wait_time).until(
                EC.presence_of_element_located((By.CLASS_NAME, "description__text"))
            )
            
            # Get the text content
            description = description_elem.text.strip()
            return description

        except TimeoutException:
            logger.error(f"Timeout waiting for job description at {url}")
            return None
        except Exception as e:
            logger.error(f"Error getting job description: {str(e)}")
            return None
        finally:
            await self.close()

# Create a singleton instance
scraper = LinkedInScraper()