import os
from typing import Optional
import google.generativeai as genai
import httpx
from fastapi import HTTPException
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class ResumeService:
    def __init__(self):
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable is not set")

        genai.configure(api_key=api_key)
        self.client = genai.GenerativeModel('gemini-1.5-pro-latest')

    async def optimize_resume(
        self,
        resume_text: str,
        job_description: str
    ) -> str:
        """
        Optimize resume text based on job description using Gemini Pro.
        """
        try:
            prompt = f"""
            Analyze this resume against the job description and create optimized bullet points. Give suggestions that stratigically align closer to the position and really tailor each to best match the job. Follow these rules exactly:

            1. Output Format:
               POSITION_UPDATES:
               [Existing Position Title]
               [Company | Date exactly as in resume]
               - [New bullet point]

            2. Bullet Point Rules:
               - Match original length (±10 words)
               - Start with strong action verbs
               - Include metrics when present
               - Focus on achievements relevant to job requirements
               - Keep original tone and professionalism
               - Avoid generic statements and make it really specific
               - Limit to 3-4 bullets per position
               - Total length similar to original

            3. Position Rules:
               - Only update existing positions
               - Don't update every single bullet point
               - Keep exact company names and dates
               - Focus on most recent/relevant positions
               - Maintain chronological order

            4. Language Rules:
               - Use concise, impactful language
               - Incorporate job-specific keywords naturally
               - Keep industry-standard terms
               - Preserve technical terminology

            Resume:
            {resume_text}

            Job Description:
            {job_description}
            """

            # Run synchronously since Gemini's Python SDK doesn't support async
            response = self.client.generate_content(prompt)
            optimized_content = response.text.strip()

            # Validate the response
            if not optimized_content or len(optimized_content) < 50:
                raise ValueError("Invalid optimization result received")

            return optimized_content

        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Resume optimization failed: {str(e)}"
            )

    def _validate_inputs(self, resume_text: str, job_description: str) -> None:
        """
        Validate the input texts.
        """
        if not resume_text or len(resume_text.strip()) < 50:
            raise HTTPException(
                status_code=400,
                detail="Resume text is too short or empty"
            )

        if not job_description or len(job_description.strip()) < 50:
            raise HTTPException(
                status_code=400,
                detail="Job description is too short or empty"
            )

    async def process_optimization_request(
        self,
        resume_text: str,
        job_description: str,
    ) -> dict:
        """
        Process a resume optimization request.
        """
        try:
            # Validate inputs
            self._validate_inputs(resume_text, job_description)

            # Get optimized resume
            optimized_content = await self.optimize_resume(
                resume_text=resume_text,
                job_description=job_description
            )

            return {
                "original_resume": resume_text,
                "optimized_resume": optimized_content,
                "optimization_id": os.urandom(8).hex(),
                "changes_summary": "Resume optimized with job-specific keywords and achievements"
            }

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Error processing optimization request: {str(e)}"
            )
