# LinkedIn Resume Optimizer

## Project Overview

This application helps users optimize their resumes for job applications by combining LinkedIn job search capabilities with AI-powered resume optimization. It uses DeepSeek AI and Google's Gemini API to analyze job descriptions and suggest resume improvements.

### Key Features

1. **LinkedIn Job Search**
   - Search for jobs by keywords, location, and job type
   - Extract detailed job descriptions from LinkedIn URLs
   - Real-time job search results with both card and table views
   - Focus on senior marketing positions

2. **Resume Optimization**
   - Upload resumes in text or DOCX format
   - AI-powered analysis of job requirements
   - Tailored suggestions for resume improvements
   - Side-by-side comparison of original and optimized versions

3. **Technical Features**
   - Rate limiting and caching support
   - Docker containerization
   - Async API design for better performance
   - Beautiful UI with Mantine components

## Architecture

### Frontend
- Built with React + TypeScript + Vite
- Uses Mantine UI components
- React Query for data fetching
- Real-time updates and notifications

### Backend
- FastAPI for high-performance API endpoints
- Playwright for web scraping
- Integration with AI services (DeepSeek, Gemini)
- Support for multiple file formats

## Recent Optimizations and Insights

### Performance Improvements
1. **LinkedIn Job Search**
   - Increased rate limit to 30 calls per minute for faster job loading
   - Implemented aggressive caching strategy (5-minute TTL)
   - Optimized search results pagination
   - Added loading states and error handling

2. **Frontend Optimizations**
   - Removed unused references (e.g., lastJobRef)
   - Implemented infinite scrolling for job results
   - Added loading indicators for better UX
   - Improved error handling and user feedback

### Known Issues and Solutions
1. **Rate Limiting**
   - Default rate limit: 30 calls/minute
   - Increase this in linkedin_service.py if needed
   - Monitor rate limit errors in production

2. **Deployment Considerations**
   - Vercel builds may fail if TypeScript has unused variables
   - Always run `npm run build` locally before deploying
   - Check for CORS issues when deploying to production

3. **Common Debugging Tips**
   - Check rate limiting in backend logs
   - Monitor network tab for API response times
   - Use browser console for frontend errors
   - Verify environment variables in both services

4. **Performance Monitoring**
   - Watch for rate limit errors in production logs
   - Monitor API response times for job searches
   - Check memory usage with large result sets

# Local Setup Instructions

## Prerequisites

- Python 3.11 or higher
- Node.js and npm
- A Gemini API key

## Installation Steps

1. Install Node.js dependencies:
```bash
cd linkedin-resume-optimizer
npm install
cd frontend
npm install
```

2. Set up Python virtual environment and install dependencies:
```bash
cd ../backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip3 install -r requirements.txt
```

3. Install Playwright browsers:
```bash
playwright install chromium
```

4. Configure environment variables:

Backend (.env):
```
# API Configuration
PORT=8000
HOST=0.0.0.0

# CORS Configuration
FRONTEND_URL=http://localhost:5173

# API Keys
DEEPSEEK_API_KEY=demo_key
GEMINI_API_KEY=your_gemini_api_key_here

# Rate Limiting
RATE_LIMIT_CALLS=10
RATE_LIMIT_PERIOD=60

# Optional Redis Cache Configuration
CACHE_ENABLED=false

# Logging
LOG_LEVEL=INFO
```

Frontend (.env):
```
# API Configuration
VITE_API_URL=http://localhost:8000

# Optional Features
VITE_ENABLE_DEBUG=true
```

## Running the Application

There are two ways to run the application:

### Option 1: Running both servers together (using concurrently)
```bash
cd linkedin-resume-optimizer-e31314ac14f09a73d7e79bd413bb044a50df0210
npm run dev
```

### Option 2: Running servers separately (recommended for debugging)

1. Start the backend server:
```bash
cd backend
source venv/bin/activate
python3 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

2. In a new terminal, start the frontend server:
```bash
cd frontend
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

## Using the Application

1. **Job Search**
   - Navigate to the home page
   - Enter job keywords (e.g., "Marketing Manager")
   - Select location (e.g., "Sydney")
   - View results in card or table format
   - Click on jobs to view full descriptions

2. **Resume Optimization**
   - Go to the Optimize page
   - Upload your resume (DOCX or text)
   - Either:
     - Enter a LinkedIn job URL
     - Paste a job description
     - Select from your recent searches
   - Click "Optimize" to get AI-powered suggestions
   - Review and download the optimized version

## Troubleshooting

1. If you see "Address already in use" errors:
   - Make sure no other applications are using ports 5173 or 8000
   - Close all terminal instances and try again

2. If you see connection errors:
   - Verify both frontend and backend servers are running
   - Check that the VITE_API_URL in frontend/.env matches the backend server address
   - Ensure CORS is properly configured in backend/.env

3. If the API calls fail:
   - Verify your Gemini API key is correctly set in backend/.env
   - Check the backend server logs for any error messages

## API Endpoints

### Job Search
- `POST /api/jobs/search` - Search for LinkedIn jobs
- `GET /api/jobs/url` - Get job details from LinkedIn URL

### Resume Optimization
- `POST /api/optimize/resume` - Optimize resume text
- `POST /api/optimize/resume/docx` - Optimize resume from DOCX file
- `POST /api/optimize/resume/url` - Optimize resume using job URL

## Rate Limiting

The API implements rate limiting to prevent abuse:
- 10 requests per minute for job searches
- 5 requests per minute for resume optimizations

## Contributing

If you'd like to contribute:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.

## Deployment

### Frontend Deployment (Vercel)

1. **Required Changes**
   - Update `VITE_API_URL` in frontend/.env to point to your Render backend URL
   - In `client.ts`, update the fallback URL:
     ```typescript
     const BASE_URL = import.meta.env.VITE_API_URL || 'https://your-render-backend-url.com';
     ```

2. **Vercel Setup**
   - Connect your GitHub repository to Vercel
   - Set the following build configurations:
     - Framework Preset: Vite
     - Build Command: `npm run build`
     - Output Directory: `dist`
   - Add environment variables:
     - `VITE_API_URL`: Your Render backend URL

3. **Vercel Build Settings**
   ```json
   {
     "builds": [
       {
         "src": "package.json",
         "use": "@vercel/node"
       }
     ]
   }
   ```

### Backend Deployment (Render)

1. **Required Changes**
   - Update `FRONTEND_URL` in backend/.env to your Vercel frontend URL
   - Update CORS settings in `main.py` to include your Vercel domain

2. **Render Setup**
   - Create a new Web Service
   - Connect your GitHub repository
   - Set the following configurations:
     - Environment: Python
     - Build Command: `pip install -r requirements.txt && playwright install chromium`
     - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   
3. **Environment Variables**
   Add the following to Render environment variables:
   ```
   FRONTEND_URL=https://your-vercel-frontend-url.com
   DEEPSEEK_API_KEY=your_key
   GEMINI_API_KEY=your_key
   PORT=10000
   ```

### CORS Configuration

Update `backend/app/main.py` to include your Vercel domain:

```python
origins = [
    os.getenv("FRONTEND_URL", "http://localhost:5173"),
    "https://your-vercel-frontend-url.com",
    "http://localhost:5173",
]
```

### Git Setup

1. **Repository Structure**
   ```
   .
   ├── .git
   ├── .gitignore
   ├── package.json
   ├── frontend/
   ├── backend/
   └── LOCAL_SETUP.md
   ```

2. **Required .gitignore entries**
   ```
   # Dependencies
   node_modules/
   venv/
   __pycache__/
   
   # Environment
   .env
   .env.local
   
   # Build
   dist/
   build/
   
   # Logs
   *.log
   ```

3. **Deployment Workflow**
   - Create a new branch for deployment changes
   - Update environment configurations
   - Test locally with production environment variables
   - Commit and push changes
   - Deploy backend to Render first
   - Once backend is live, deploy frontend to Vercel

### Common Deployment Issues

1. **CORS Errors**
   - Ensure backend CORS settings include your Vercel domain
   - Check that frontend is using the correct backend URL
   - Verify protocol matches (https to https)

2. **Environment Variables**
   - Double-check all environment variables are set in both Vercel and Render
   - Ensure variable names match exactly
   - Remember that Vite environment variables must start with `VITE_`

3. **Build Issues**
   - For Vercel: Ensure all dependencies are in package.json
   - For Render: Make sure Playwright installation is in build command
   - Check build logs for any missing dependencies

4. **Runtime Issues**
   - Monitor backend logs in Render dashboard
   - Check frontend console for API connection errors
   - Verify rate limits and timeout settings

### Health Checks

Add these URLs to your monitoring:
- Frontend: `https://your-vercel-frontend-url.com`
- Backend: `https://your-render-backend-url.com/health`
- API Docs: `https://your-render-backend-url.com/docs`

### Maintenance

1. **Logging**
   - Set up log monitoring in Render
   - Use browser console for frontend debugging
   - Consider adding error tracking (e.g., Sentry)

2. **Updates**
   - Regularly update dependencies
   - Monitor API rate limits
   - Check for security advisories

3. **Backup**
   - Maintain local development setup
   - Keep environment variables documented
   - Regular repository backups