from fastapi import APIRouter, HTTPException, File, UploadFile, Form, Response
from typing import Optional
import io
import os
import docx
from docx.text.paragraph import Paragraph
from docx.shared import Pt, RGBColor

from app.models.base import ResumeOptimizationRequest, ResumeOptimizationResponse
from app.services.resume_service import ResumeService
from app.services.linkedin_service import LinkedInService

router = APIRouter()
resume_service = ResumeService()
linkedin_service = LinkedInService()

@router.post("/resume", response_model=ResumeOptimizationResponse)
async def optimize_resume(request: ResumeOptimizationRequest):
    """
    Optimize resume based on a job description.
    """
    try:
        result = await resume_service.process_optimization_request(
            resume_text=request.resume_text,
            job_description=request.job_description,
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Resume optimization failed: {str(e)}"
        )

@router.post("/resume/url", response_model=ResumeOptimizationResponse)
async def optimize_resume_from_url(resume_text: str, job_url: str):
    """
    Optimize resume based on a LinkedIn job URL.
    """
    try:
        # Fetch job description from LinkedIn URL
        job_description = await linkedin_service.get_job_by_url(job_url)
        if not job_description:
            raise HTTPException(
                status_code=404,
                detail="Could not fetch job description"
            )

        # Use the fetched job description for optimization
        result = await resume_service.process_optimization_request(
            resume_text=resume_text,
            job_description=job_description.description,
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Resume optimization failed: {str(e)}"
        )

@router.post("/resume/export")
async def export_resume(
    resume: UploadFile = File(...),
    suggestions: str = Form(...)
) -> Response:
    """
    Create a new resume file with the optimized content.
    """
    try:
        print(f"Received file for export: {resume.filename}")
        content = await resume.read()
        
        # Load the document
        doc = docx.Document(io.BytesIO(content))
        
        # Track processed positions to prevent duplicates
        processed_positions = set()
        
        if "POSITION_UPDATES:" not in suggestions:
            raise HTTPException(
                status_code=400,
                detail="Invalid suggestions format"
            )
            
        # Parse position updates
        position_updates = {}
        current_position = None
        parsing_updates = False
        
        for line in suggestions.split('\n'):
            line = line.strip()
            if not line:
                continue
            
            if line == "POSITION_UPDATES:":
                parsing_updates = True
                continue
            
            if not parsing_updates:
                continue
                
            if line.startswith('-'):
                if current_position:
                    position_updates.setdefault(current_position, []).append(line[1:].strip())
            else:
                current_position = line
                
        # Process document
        in_position = False
        current_position = None
        bullet_index = 0
        updates_made = False
        
        for i, paragraph in enumerate(doc.paragraphs):
            text = paragraph.text.strip()
            if not text:
                continue
                
            # Check for major sections
            if text in ['Summary', 'Experience', 'Education', 'Skills']:
                in_position = False
                current_position = None
                continue
                
            # Check for position titles
            is_position = False
            if '|' in text and any(month in text for month in ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']):
                is_position = True
            elif len(text.split()) <= 5 and not text.startswith('•'):
                if i + 1 < len(doc.paragraphs):
                    next_para = doc.paragraphs[i+1].text.strip()
                    if '|' in next_para and any(month in next_para for month in ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']):
                        is_position = True
                        text = f"{text} {next_para}"
                        
            # Process position titles
            if is_position:
                position_key = text.split('|')[0].strip().lower()
                for update_position in position_updates.keys():
                    if update_position.split('|')[0].strip().lower() == position_key and update_position not in processed_positions:
                        current_position = update_position
                        in_position = True
                        bullet_index = 0
                        processed_positions.add(update_position)
                        break
                        
            # Update bullet points
            if in_position and bullet_index < len(position_updates.get(current_position, [])):
                # Skip company descriptions
                if text.endswith('.') and any(word in text.lower() for word in ['startup', 'helping', 'revolutionising', 'branch']):
                    continue
                    
                # Check for bullet points or achievements
                if text.startswith('•') or any(word in text.lower() for word in ['increased', 'decreased', 'improved', 'achieved', 'launched', 'created', 'developed', 'implemented', 'managed', 'led']):
                    try:
                        # Get original formatting
                        original_format = None
                        if paragraph.runs:
                            run = paragraph.runs[0]
                            original_format = {
                                'name': run.font.name or 'Roboto',
                                'size': run.font.size or Pt(7),
                                'color': run.font.color.rgb if run.font.color else RGBColor(0x43, 0x43, 0x43)
                            }
                        else:
                            original_format = {
                                'name': 'Roboto',
                                'size': Pt(7),
                                'color': RGBColor(0x43, 0x43, 0x43)
                            }
                            
                        # Preserve bullet point
                        bullet = '• ' if text.startswith('•') else ''
                        
                        # Update content
                        new_content = position_updates[current_position][bullet_index]
                        
                        paragraph.clear()
                        if bullet:
                            run = paragraph.add_run(bullet)
                            run.font.name = original_format['name']
                            run.font.size = original_format['size']
                            run.font.color.rgb = original_format['color']
                        
                        run = paragraph.add_run(new_content.lstrip('• '))
                        run.font.name = original_format['name']
                        run.font.size = original_format['size']
                        run.font.color.rgb = original_format['color']
                        
                        bullet_index += 1
                        updates_made = True
                    except Exception as e:
                        print(f"Error updating bullet point: {e}")
                        continue
                        
        # Save to memory
        output = io.BytesIO()
        doc.save(output)
        output.seek(0)
        
        return Response(
            content=output.read(),
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={
                'Content-Disposition': 'attachment; filename=final_modified_resume.docx'
            }
        )
            
    except Exception as e:
        print(f"Error exporting resume: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to export resume: {str(e)}"
        )

@router.post("/resume/docx", response_model=ResumeOptimizationResponse)
async def optimize_resume_from_docx(
    resume: UploadFile = File(...),
    job_description: str = Form(""),
    job_url: str = Form("")
):
    """
    Optimize resume from a DOCX file based on a job description or URL.
    """
    try:
        print(f"Received file: {resume.filename}")
        content = await resume.read()
        resume_text = ""
        
        if resume.filename.endswith('.docx'):
            # Convert DOCX to text
            doc = docx.Document(io.BytesIO(content))
            resume_text = "\n".join([paragraph.text for paragraph in doc.paragraphs if paragraph.text])
        else:
            # Handle as text file
            resume_text = content.decode('utf-8')

        print(f"Extracted text length: {len(resume_text)}")
        
        # Get job description from URL if provided
        if job_url:
            print(f"Fetching job description from URL: {job_url}")
            job_data = await linkedin_service.get_job_by_url(job_url)
            if not job_data:
                raise HTTPException(
                    status_code=404,
                    detail="Could not fetch job description from URL"
                )
            job_description = job_data.description
            print(f"Job description length from URL: {len(job_description)}")
        elif not job_description:
            raise HTTPException(
                status_code=400,
                detail="Either job description or job URL is required"
            )

        # Use the extracted text for optimization
        result = await resume_service.process_optimization_request(
            resume_text=resume_text,
            job_description=job_description,
        )
        return result
    except Exception as e:
        print(f"Error processing file: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Resume optimization failed: {str(e)}"
        )