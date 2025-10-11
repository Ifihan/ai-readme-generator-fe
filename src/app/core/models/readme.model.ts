export interface SectionTemplate {
  id: string;
  name: string;
  description: string;
  is_default: boolean;
  order: number;
}

// README Generation Interfaces
export interface ReadmeSection {
  name: string;
  description: string;
  required: boolean;
  order: number;
}

export interface GenerateReadmeRequest {
  repository_url: string;
  sections: ReadmeSection[];
  include_badges: boolean;
  badge_style: string;
}

export interface GenerateReadmeResponse {
  content: string;
  sections_generated: string[];
  entry_id: string
}

// README Refinement Interfaces
export interface RefineReadmeRequest {
  content: string;
  feedback: string;
}

export interface RefineReadmeResponse {
  content: string;
  sections_included: string[];
}

// Save README Interfaces
export interface SaveReadmeRequest {
  repository_url: string;
  content: string;
  path: string;
  commit_message: string;
  branch: string;
}

export interface SaveReadmeResponse {
  message: string;
}

// Download README Interfaces
export interface DownloadReadmeRequest {
  content: string;
  filename?: string;
}

export interface DownloadReadmeResponse {
  file_content: string;
}

// Preview README Interfaces
export interface PreviewReadmeRequest {
  sections: string[];
}

export interface PreviewReadmeResponse {
  [key: string]: any;
}

// Analyze Repository Interfaces
export interface AnalyzeRepositoryResponse {
  [key: string]: any;
}

// Error Response Interface
export interface ValidationError {
  detail: Array<{
    loc: (string | number)[];
    msg: string;
    type: string;
  }>;
}

export interface RepoUrlInformation {
  owner: string
  repo: string
}

export interface GithubBranchModel {
  name: string,
  sha: string,
  protected: boolean,
  is_default: boolean
}

export interface RepoBranchResponse {
  repository: string,
  branches: GithubBranchModel[];
  total_count: number;
}

export interface CreateFeedbackRequestResponse {
  created_at: string;
  general_comments: string;
  helpful_sections: string[];
  id: string;
  problematic_sections: string[];
  rating: string;
  readme_history_id: string;
  repository_name: string;
  suggestions: string;
  username: string;
}