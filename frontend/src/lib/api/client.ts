import axios, { AxiosError } from 'axios';
import { 
  JobDescription, 
  JobSearchRequest, 
  ResumeOptimizationRequest, 
  ResumeOptimizationResponse,
  ErrorResponse 
} from './types';

<<<<<<< HEAD
// Determine if we're in production
const isProduction = import.meta.env.PROD;

// Get the API URL from environment variables
let BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// In production, ensure we're using HTTPS
if (isProduction && BASE_URL.startsWith('http://')) {
  BASE_URL = BASE_URL.replace('http://', 'https://');
}
=======
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4002';
>>>>>>> ee0f8b66d95e45595ff8fe3312d03d1d1c7c8959

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Type guard for AxiosError
function isAxiosError(error: unknown): error is AxiosError<ErrorResponse> {
  return axios.isAxiosError(error);
}

// Error handler with retry logic
const handleError = (error: unknown): never => {
  if (isAxiosError(error) && error.response) {
    const errorData = error.response.data as ErrorResponse;
    if (error.response.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    throw new Error(errorData.detail || 'An error occurred');
  }
  throw new Error('An unexpected error occurred');
};

// Jobs API
export const jobsApi = {
  search: async (params: JobSearchRequest): Promise<JobDescription[]> => {
    try {
      const { data } = await api.post<JobDescription[]>('/api/jobs/search', params);
      return data;
    } catch (error) {
      throw handleError(error);
    }
  },

  getByUrl: async (url: string): Promise<JobDescription> => {
    try {
      const { data } = await api.get<JobDescription>('/api/jobs/url', {
        params: { url }
      });
      return data;
    } catch (error) {
      throw handleError(error);
    }
  },
};

// Resume API
export const resumeApi = {
  optimize: async (params: ResumeOptimizationRequest): Promise<ResumeOptimizationResponse> => {
    try {
      const { data } = await api.post<ResumeOptimizationResponse>('/api/optimize/resume', params);
      return data;
    } catch (error) {
      throw handleError(error);
    }
  },

  optimizeFromUrl: async (params: { resume_text: string; job_url: string }): Promise<ResumeOptimizationResponse> => {
    try {
      const { data } = await api.post<ResumeOptimizationResponse>('/api/optimize/resume/url', {
        resume_text: params.resume_text,
        job_url: params.job_url
      });
      return data;
    } catch (error) {
      throw handleError(error);
    }
  },

  optimizeFromDocx: async (formData: FormData): Promise<ResumeOptimizationResponse> => {
    try {
      const { data } = await axios.post<ResumeOptimizationResponse>(
        `${BASE_URL}/api/optimize/resume/docx`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return data;
    } catch (error) {
      throw handleError(error);
    }
  },

  exportResume: async (formData: FormData): Promise<void> => {
    try {
      const response = await axios.post(
        `${BASE_URL}/api/optimize/resume/export`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          responseType: 'blob',
        }
      );

      // Create a download link for the file
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'final_modified_resume.docx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      throw handleError(error);
    }
  },
};

export default {
  jobs: jobsApi,
  resume: resumeApi,
};