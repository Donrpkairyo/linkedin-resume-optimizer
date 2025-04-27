export interface JobDescription {
  job_id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  ago_time?: string;
  created_at: string;
}

export interface JobSearchRequest {
  keywords: string;
  location?: string;
  date_posted?: string;
  job_type?: string;
  remote_filter?: string;
  experience_level?: string;
  sort_by?: string;
  page?: number;
  limit?: string;
}

export interface JobSearchResponse {
  jobs: JobDescription[];
  total: number;
  has_more: boolean;
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
  error_code?: string;
  status_code?: number;
}

export const DATE_POSTED_OPTIONS = [
  { value: '24hr', label: 'Past 24 hours' },
  { value: 'past week', label: 'Past Week' },
  { value: 'past month', label: 'Past Month' }
];

export const JOB_TYPE_OPTIONS = [
  { value: 'full-time', label: 'Full-time' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'temporary', label: 'Temporary' },
  { value: 'internship', label: 'Internship' }
];

export const EXPERIENCE_LEVEL_OPTIONS = [
  { value: 'internship', label: 'Internship' },
  { value: 'entry level', label: 'Entry Level' },
  { value: 'associate', label: 'Associate' },
  { value: 'senior', label: 'Senior' },
  { value: 'director', label: 'Director' },
  { value: 'executive', label: 'Executive' }
];

export const REMOTE_FILTER_OPTIONS = [
  { value: 'remote', label: 'Remote' },
  { value: 'on-site', label: 'On-site' },
  { value: 'hybrid', label: 'Hybrid' }
];
