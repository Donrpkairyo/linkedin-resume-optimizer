import axios, { AxiosError } from 'axios';
import { JobSearchRequest, JobSearchResponse, ResumeOptimizationResponse } from './types';

const API_BASE_URL = import.meta.env.VITE_API_URL + '/api';

interface APIErrorResponse {
  detail: string;
}

// Create axios instance with default config
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  }
});

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Add response interceptor for error handling
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<APIErrorResponse>) => {
    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timed out. LinkedIn might be rate limiting requests. Please wait a few minutes before trying again.');
    }
    
    if (error.response?.status === 429) {
      throw new Error('Too many requests. Please wait a few minutes before trying again.');
    }
    
    if (error.response?.status === 404) {
      throw new Error('Job not found or no longer available on LinkedIn.');
    }

    if (error.response?.status === 400) {
      const detail = error.response.data?.detail;
      throw new Error(detail || 'Invalid request. Please check your search terms.');
    }
    
    if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    }
    
    throw new Error('An error occurred. Please try again later.');
  }
);

class JobsApi {
  private async retryRequest<T>(
    fn: () => Promise<T>,
    retries: number = 3,
    delay: number = 2000
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries === 0) throw error;
      
      const isRateLimit = error instanceof Error && 
        (error.message.toLowerCase().includes('rate limit') || 
         error.message.toLowerCase().includes('too many requests'));
      
      if (isRateLimit) {
        await wait(delay);
        return this.retryRequest(fn, retries - 1, delay * 2);
      }
      
      throw error;
    }
  }

  async search(request: JobSearchRequest): Promise<JobSearchResponse> {
    if (!request.keywords) {
      throw new Error('Keywords are required for job search');
    }

    const cleanRequest = Object.fromEntries(
      Object.entries(request).filter(([_, v]) => v != null && v !== '')
    );

    return this.retryRequest(async () => {
      const response = await axiosInstance.post<JobSearchResponse>('/jobs/search', cleanRequest);
      return response.data;
    });
  }

  async getDescription(jobId: string): Promise<string> {
    if (!jobId) {
      throw new Error('Job ID is required');
    }

    return this.retryRequest(async () => {
      const response = await axiosInstance.get<string>(`/jobs/${jobId}/description`);
      return response.data;
    });
  }

  async optimizeResume(url: string): Promise<string> {
    if (!url) {
      throw new Error('Job URL is required');
    }

    return this.retryRequest(async () => {
      const response = await axiosInstance.post<string>('/jobs/optimize', { url }, {
        timeout: 120000 // 2 minutes timeout for optimization
      });
      return response.data;
    }, 2, 5000);
  }

  async ping(): Promise<boolean> {
    try {
      const response = await axiosInstance.get<{ status: string }>('/ping');
      return response.data.status === 'ok';
    } catch (error) {
      console.error('Error pinging server:', error);
      return false;
    }
  }
}

export const resumeApi = {
  optimize: async (params: { resume_text: string; job_description: string }): Promise<ResumeOptimizationResponse> => {
    const response = await axiosInstance.post<ResumeOptimizationResponse>('/optimize/resume', params);
    return response.data;
  },

  optimizeFromUrl: async (params: { resume_text: string; job_url: string }): Promise<ResumeOptimizationResponse> => {
    // Clean up URL by removing trailing slash
    const cleanUrl = params.job_url.replace(/\/+$/, '');
    const response = await axiosInstance.post<ResumeOptimizationResponse>('/optimize/resume/url', {
      ...params,
      job_url: cleanUrl
    });
    return response.data;
  },

  optimizeFromDocx: async (formData: FormData): Promise<ResumeOptimizationResponse> => {
    const response = await axiosInstance.post<ResumeOptimizationResponse>('/optimize/resume/docx', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  exportResume: async (formData: FormData): Promise<void> => {
    const response = await axiosInstance.post('/optimize/resume/export', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      responseType: 'blob',
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'optimized_resume.docx');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

// Create singleton instance
export const jobsApi = new JobsApi();
