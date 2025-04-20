# LinkedIn Resume Optimizer

A full-stack web application that combines LinkedIn job search capabilities with AI-powered resume optimization, helping users tailor their resumes to specific job descriptions.

## Features

- Search LinkedIn jobs by keywords and location
- Extract job descriptions from LinkedIn URLs
- AI-powered resume optimization using DeepSeek
- Support for text and DOCX resume formats
- Clean and intuitive user interface
- Real-time form validation and error handling
- API rate limiting and caching

## Tech Stack

### Frontend
- React 18 with TypeScript
- Mantine UI Components
- React Query for API state management
- React Router for navigation
- Axios for API requests

### Backend
- FastAPI (Python)
- SQLAlchemy for database
- DeepSeek AI for resume optimization
- LinkedIn scraping capabilities
- Redis for caching (optional)

## Prerequisites

- Node.js 18 or higher
- Python 3.11 or higher
- pip (Python package installer)
- npm or yarn
- Redis (optional, for caching)

## Quick Start

1. Clone the repository:
```bash
git clone <repository-url>
cd linkedin-resume-optimizer
```

2. Install all dependencies:
```bash
npm run install:all
```

3. Set up environment variables:
```bash
# Frontend
cp frontend/.env.example frontend/.env

# Backend
cp backend/.env.example backend/.env
# Edit backend/.env and add your DeepSeek API key
```

4. Start the development servers:
```bash
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

## Project Structure

```
linkedin-resume-optimizer/
├── frontend/              # React frontend application
│   ├── src/
│   │   ├── lib/          # API client and types
│   │   ├── layouts/      # Page layouts
│   │   └── pages/        # Page components
│   └── README.md         # Frontend documentation
│
├── backend/              # FastAPI backend application
│   ├── app/
│   │   ├── api/         # API routes
│   │   ├── core/        # Core functionality
│   │   ├── services/    # Business logic
│   │   └── models/      # Data models
│   └── README.md        # Backend documentation
│
└── README.md            # Main documentation
```

## Development

- `npm run dev`: Start both frontend and backend in development mode
- `npm run dev:frontend`: Start only the frontend
- `npm run dev:backend`: Start only the backend

## Building for Production

1. Build the frontend:
```bash
npm run build:frontend
```

2. Start the production servers:
```bash
npm start
```

## Deployment

### Frontend (Vercel)
1. Connect your repository to Vercel
2. Configure environment variables
3. Deploy

### Backend
Choose one of:
- Railway
- Render
- Digital Ocean
- AWS

See backend README for detailed deployment instructions.

## Environment Variables

### Frontend (.env)
```
VITE_API_URL=http://localhost:8000
```

### Backend (.env)
```
DEEPSEEK_API_KEY=your_api_key_here
FRONTEND_URL=http://localhost:5173
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.