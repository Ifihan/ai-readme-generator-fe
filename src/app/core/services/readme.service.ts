import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
// Section Template Interfaces
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
  sections_included: string[];
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

@Injectable({ providedIn: 'root' })
export class ReadmeService {
  private http = inject(HttpClient);
  private readonly API_URL = environment.apiUrl;

  constructor() {
    console.log('ReadmeService initialized');
  }



  /**
   * Get available README section templates
   * GET /api/v1/readme/sections
   */
  getSectionTemplates(): Observable<SectionTemplate[]> {
    console.log('Fetching section templates');

    return this.http.get<SectionTemplate[]>(`${this.API_URL}/readme/sections`).pipe(
      tap(templates => console.log('Section templates fetched:', templates.length)),
      catchError(error => {
        console.error('Error fetching section templates:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Generate a README for a GitHub repository
   * POST /api/v1/readme/generate
   */
  generateReadme(request: GenerateReadmeRequest): Observable<GenerateReadmeResponse> {
    console.log('Generating README for repository:', request.repository_url);
    return this.http.post<GenerateReadmeResponse>(
      `${this.API_URL}/readme/generate`,
      request
    ).pipe(
      tap(response => console.log('README generated successfully, sections included:', response.sections_included)),
      catchError(error => {
        console.error('Error generating README:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Refine an existing README based on feedback
   * POST /api/v1/readme/refine
   */
  refineReadme(request: RefineReadmeRequest): Observable<RefineReadmeResponse> {
    console.log('Refining README with feedback');
    return this.http.post<RefineReadmeResponse>(
      `${this.API_URL}/readme/refine`,
      request
    ).pipe(
      tap(response => console.log('README refined successfully, sections included:', response.sections_included)),
      catchError(error => {
        console.error('Error refining README:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Save a README to a GitHub repository
   * POST /api/v1/readme/save
   */
  saveReadmeToGithub(request: SaveReadmeRequest): Observable<SaveReadmeResponse> {
    console.log('Saving README to GitHub repository:', request.repository_url);
    return this.http.post<SaveReadmeResponse>(
      `${this.API_URL}/readme/save`,
      request
    ).pipe(
      tap(response => console.log('README saved to GitHub successfully:', response.message)),
      catchError(error => {
        console.error('Error saving README to GitHub:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Download README as a Markdown file
   * POST /api/v1/readme/download
   */
  downloadReadme(request: DownloadReadmeRequest): Observable<DownloadReadmeResponse> {
    console.log('Downloading README file:', request.filename || 'README.md');
    let params = new HttpParams().set('content', request.content);
    if (request.filename) {
      params = params.set('filename', request.filename);
    }
    return this.http.post<DownloadReadmeResponse>(
      `${this.API_URL}/readme/download`,
      null,
      { params }
    ).pipe(
      tap(response => console.log('README download prepared successfully')),
      catchError(error => {
        console.error('Error preparing README download:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Preview what sections would be included and analyze repository structure
   * GET /api/v1/readme/preview/{owner}/{repo}
   * Note: Based on API docs, this endpoint expects a JSON body, so using POST instead
   */
  previewGeneratedReadme(
    owner: string,
    repo: string,
    sections: string[],
    authToken: string
  ): Observable<PreviewReadmeResponse> {
    console.log(`Previewing README for ${owner}/${repo}`);

    const headers = new HttpHeaders({
      'Authorization': authToken,
      'Content-Type': 'application/json'
    });

    return this.http.post<PreviewReadmeResponse>(
      `${this.API_URL}/readme/preview/${owner}/${repo}`,
      sections,
      { headers }
    ).pipe(
      tap(response => console.log('README preview generated successfully')),
      catchError(error => {
        console.error('Error generating README preview:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Analyze a repository to recommend README sections and structure
   * GET /api/v1/readme/analyze/{owner}/{repo}
   */
  analyzeRepository(owner: string, repo: string, authToken: string): Observable<AnalyzeRepositoryResponse> {
    console.log(`Analyzing repository ${owner}/${repo}`);

    const headers = new HttpHeaders({
      'Authorization': authToken
    });

    return this.http.get<AnalyzeRepositoryResponse>(
      `${this.API_URL}/readme/analyze/${owner}/${repo}`,
      { headers }
    ).pipe(
      tap(response => console.log('Repository analysis completed successfully')),
      catchError(error => {
        console.error('Error analyzing repository:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Helper method to create a basic README section
   */
  createSection(name: string, description: string, required: boolean = false, order: number = 0): ReadmeSection {
    return {
      name,
      description,
      required,
      order
    };
  }

  /**
   * Helper method to create a generate README request with default values
   */
  createGenerateRequest(
    repositoryUrl: string,
    sections: ReadmeSection[],
    includeBadges: boolean = true,
    badgeStyle: string = 'flat'
  ): GenerateReadmeRequest {
    return {
      repository_url: repositoryUrl,
      sections,
      include_badges: includeBadges,
      badge_style: badgeStyle
    };
  }

  /**
   * Helper method to create a save README request with default values
   */
  createSaveRequest(
    repositoryUrl: string,
    content: string,
    path: string = 'README.md',
    commitMessage: string = 'Update README.md',
    branch?: string
  ): SaveReadmeRequest {
    const request: SaveReadmeRequest = {
      repository_url: repositoryUrl,
      content,
      path,
      commit_message: commitMessage,
      branch: branch || 'main'
    };
    return request;
  }
}
