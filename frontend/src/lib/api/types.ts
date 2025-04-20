export interface JobDescription {
  job_id: string | null;
  title: string;
  company: string;
  location: string;
  description: string;
  url: string | null;
  created_at: string;
}

export interface JobSearchRequest {
  keywords: string;
  location?: string;
  job_type?: string;
  limit: number;
  offset?: number;
}

export interface ResumeOptimizationRequest {
  resume_text: string;
  job_description: string;
  preserve_format?: boolean;
}

export interface ResumeOptimizationResponse {
  original_resume: string;
  optimized_resume: string;
  optimization_id: string;
  created_at: string;
  changes_summary?: string;
}

export interface ErrorResponse {
  detail: string;
  error_code: string;
  status_code: number;
}