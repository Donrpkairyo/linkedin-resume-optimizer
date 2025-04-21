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
            You are an expert resume optimization assistant. First analyze the job description to identify:
            1. Key requirements and skills needed
            2. Specific technologies or tools mentioned
            3. Desired experience level and background
            4. Company culture and values indicated
            5. Industry-specific terminology used

            Then, analyze the resume against these requirements to create optimized content that strategically aligns with the position. Follow these rules:

            1. Output Format:
               ANALYSIS:
               - Job Requirements: [List key requirements identified]
               - Skills Gap: [Identify any gaps between resume and requirements]
               - Optimization Focus: [Areas to emphasize]

               POSITION_UPDATES:
               [Existing Position Title]
               [Company | Date exactly as in resume]
               - [New bullet point with clear alignment to job requirements]

            2. Bullet Point Rules:
               - Match original length (±10 words)
               - Start with relevant action verbs from the job description
               - Include metrics and quantifiable achievements
               - Directly address job requirements
               - Use keywords and terminology from the job posting
               - Make achievements specific to the target role
               - Limit to 3-4 most relevant bullets per position
               - Maintain professional tone

            3. Position Rules:
               - Focus on positions most relevant to job requirements
               - Highlight transferable skills for different industries
               - Keep exact company names and dates
               - Emphasize recent experience aligned with role
               - Maintain chronological order

            4. Language Rules:
               - Mirror the job description's terminology
               - Use industry-standard keywords
               - Incorporate role-specific language
               - Maintain technical accuracy
               - Ensure natural, professional tone

            Job Description:
            {job_description}

            Resume:
            {resume_text}
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
