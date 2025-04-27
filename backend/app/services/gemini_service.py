import os
from typing import Optional
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()
import google.generativeai as genai
from fastapi import HTTPException
from datetime import datetime

class GeminiService:
    def __init__(self):
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable is not set")

        genai.configure(api_key=api_key)
        self.client = genai.GenerativeModel('gemini-2.0-flash')

    def _validate_text(self, text: str, field_name: str, min_length: int = 50) -> None:
        """Validate text input."""
        if not text or len(text.strip()) < min_length:
            raise HTTPException(
                status_code=400,
                detail=f"{field_name} is too short or empty"
            )

    async def optimize_resume(self, job_description: str, resume_text: Optional[str] = None) -> str:
        """
        Optimize resume based on job description using Gemini Pro.
        """
        try:
            self._validate_text(job_description, "Job description")
            if resume_text:
                self._validate_text(resume_text, "Resume text")

            prompt = f"""
            You are an expert resume optimization assistant. First analyze the job description to identify key requirements, and then optimize the resume content.

            Analyze the following:
            1. Key technical skills and requirements
            2. Required experience level
            3. Company values and culture fit
            4. Industry-specific terminology
            5. Desired achievements and metrics

            Then provide output in EXACTLY this format:

            ANALYSIS :
            [Brief analysis of key findings]
            [Brief summary of gaps]
            [A suggested new position Summary section matching the original length (±35 words)]

            POSITION_UPDATES:
            [Exact Position Title As Shown in Resume]
            [Exact Company & Dates As Shown in Resume]
            - [Optimized bullet point starting with action verb]
            - [Optimized bullet point with metrics]
            - [Optimized bullet point showing impact]
            
            Bullet Point Rules:
               - Match original length (±10 words)
               - Start with relevant action verbs from the job description
               - Include metrics and quantifiable achievements
               - Directly address job requirements
               - ALLWAYS use keywords and terminology from the job posting
               - Make achievements specific to the target role and if the skill is not mentioned create it based on the resume context.
               - Limit to 3-4 most relevant bullets per position
               - Maintain professional tone

            3. Position Rules:
               - Focus on positions most relevant to job requirements
               - Highlight transferable skills for different industries
               - Keep exact company names and dates
               - Emphasize recent experience aligned with role
               - Maintain chronological order

            4. Language Rules:
               - ALLWAYS mirror the job description's terminology
               - Use industry-standard keywords
               - Incorporate role-specific language
               - Maintain technical accuracy
               - Ensure natural, professional tone
               - ALLWAYS use british english spelling

            Job Description:
            {job_description}

            {f'Resume: {resume_text}' if resume_text else 'Provide general optimization advice based on the job requirements.'}
            """

            # Generate optimization content
            generation_config = genai.types.GenerationConfig(
                temperature=0.7,
                max_output_tokens=2048,
            )
            response = self.client.generate_content(
                prompt,
                generation_config=generation_config
            )
            if not response:
                raise ValueError("No response received from Gemini")
            
            optimized_content = response.text.strip()
            if not optimized_content or len(optimized_content) < 50:
                raise ValueError("Invalid optimization result received")

            return optimized_content

        except ValueError as e:
            print(f"Gemini validation error: {str(e)}")  # Add logging for debugging
            raise HTTPException(
                status_code=400,
                detail=str(e)
            )
        except Exception as e:
            print(f"Gemini service error: {str(e)}")  # Add logging for debugging
            raise HTTPException(
                status_code=500,
                detail=f"Resume optimization failed: {str(e)}"
            )

    async def process_optimization_request(self, resume_text: str, job_description: str) -> dict:
        """
        Process a complete resume optimization request.
        """
        try:
            self._validate_text(resume_text, "Resume text")
            self._validate_text(job_description, "Job description")

            optimized_content = await self.optimize_resume(
                job_description=job_description,
                resume_text=resume_text
            )

            return {
                "original_resume": resume_text,
                "optimized_resume": optimized_content,
                "optimization_id": os.urandom(8).hex(),
                "created_at": datetime.now().isoformat(),
                "changes_summary": "Resume optimized with job-specific keywords and achievements"
            }

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Error processing optimization request: {str(e)}"
            )