# LinkedIn Resume Optimizer Backend

A FastAPI backend service that combines LinkedIn job search capabilities with resume optimization using DeepSeek AI.

## Features

- LinkedIn job search by keywords, location, and job type
- Job description extraction from LinkedIn URLs
- Resume optimization based on job descriptions
- Support for both text and DOCX resume formats
- Rate limiting and caching support
- Docker containerization
- Async API design for better performance

## Prerequisites

- Python 3.11 or higher
- Docker (optional)
- DeepSeek API key

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd linkedin-resume-optimizer/backend
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Install Playwright browsers:
```bash
playwright install chromium
```

5. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

## Running the Application

### Development

1. Activate the virtual environment:
```bash
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Start the development server:
```bash
uvicorn app.main:app --reload --port 8000
```

The API will be available at http://localhost:8000

### Using Docker

1. Build the Docker image:
```bash
docker build -t linkedin-resume-optimizer-backend .
```

2. Run the container:
```bash
docker run -p 8000:8000 --env-file .env linkedin-resume-optimizer-backend
```

## API Documentation

Once the server is running, you can access:
- Interactive API documentation: http://localhost:8000/docs
- OpenAPI specification: http://localhost:8000/openapi.json

### Main Endpoints

#### Job Search
- `POST /api/jobs/search` - Search for LinkedIn jobs
- `GET /api/jobs/url` - Get job details from LinkedIn URL

#### Resume Optimization
- `POST /api/optimize/resume` - Optimize resume text
- `POST /api/optimize/resume/docx` - Optimize resume from DOCX file
- `POST /api/optimize/resume/url` - Optimize resume using job URL

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 8000 |
| HOST | Server host | 0.0.0.0 |
| FRONTEND_URL | Frontend URL for CORS | http://localhost:5173 |
| DEEPSEEK_API_KEY | DeepSeek API key | Required |
| RATE_LIMIT_CALLS | Rate limit calls | 10 |
| RATE_LIMIT_PERIOD | Rate limit period (seconds) | 60 |
| REDIS_URL | Redis URL for caching | Optional |
| CACHE_ENABLED | Enable caching | false |
| CACHE_TTL | Cache TTL in seconds | 3600 |
| LOG_LEVEL | Logging level | INFO |

## Rate Limiting

The API implements rate limiting to prevent abuse:
- 10 requests per minute for job searches
- 5 requests per minute for resume optimizations

## Error Handling

The API returns standard HTTP status codes and JSON error responses:
```json
{
    "detail": "Error message",
    "status_code": 400
}
```

## Deployment

The application is containerized and can be deployed to any platform that supports Docker containers. For detailed deployment instructions, see the main project documentation.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.