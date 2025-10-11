import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, ObservableLike, throwError } from 'rxjs';
import { catchError, tap, switchMap, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { API_ENDPOINTS, ERROR_MESSAGES } from '../constants/app.constants';
import { NotificationService } from './notification.service';
import { LoggerService } from './logger.service';
import { SectionTemplate, GenerateReadmeRequest, GenerateReadmeResponse, RefineReadmeRequest, RefineReadmeResponse, SaveReadmeRequest, SaveReadmeResponse, DownloadReadmeRequest, DownloadReadmeResponse, PreviewReadmeResponse, AnalyzeRepositoryResponse, ReadmeSection, RepoUrlInformation, RepoBranchResponse, CreateFeedbackRequestResponse } from '../models/readme.model';
import { HistoryEntry, HistoryResponse } from '../models/history.model';
// Section Template Interfaces

@Injectable({ providedIn: 'root' })
export class ReadmeService {
  private http = inject(HttpClient);
  private notificationService = inject(NotificationService);
  private logger = inject(LoggerService);
  private readonly API_URL = environment.apiUrl;

  constructor() {
    this.logger.info('ReadmeService initialized');
  }



  /**
   * Get available README section templates
   * GET /api/v1/readme/sections
   */
  getSectionTemplates(): Observable<SectionTemplate[]> {
    this.logger.info('Fetching section templates');

    return this.http.get<SectionTemplate[]>(`${this.API_URL}${API_ENDPOINTS.README.TEMPLATES}`).pipe(
      tap(templates => this.logger.info('Section templates fetched:', templates.length)),
      catchError(error => {
        this.logger.error('Error fetching section templates:', error);
        this.notificationService.error(ERROR_MESSAGES.README.TEMPLATES_LOAD_FAILED);
        return throwError(() => error);
      })
    );
  }  /**
   * Generate a README for a GitHub repository
   * POST /api/v1/readme/generate
   */
  generateReadme(request: GenerateReadmeRequest): Observable<GenerateReadmeResponse> {
    this.logger.info('Generating README for repository:', request.repository_url);
    return this.http.post<GenerateReadmeResponse>(
      `${this.API_URL}${API_ENDPOINTS.README.GENERATE}`,
      request
    ).pipe(
      tap(response => this.logger.info('README generated successfully, sections included:', response.sections_generated)),
      catchError(error => {
        this.logger.error('Error generating README:', error);
        this.notificationService.error(ERROR_MESSAGES.README.GENERATION_FAILED);
        return throwError(() => error);
      })
    );
  }

  /**
   * Refine an existing README based on feedback
   * POST /api/v1/readme/refine
   */
  refineReadme(request: RefineReadmeRequest): Observable<RefineReadmeResponse> {
    this.logger.info('Refining README with feedback');
    return this.http.post<RefineReadmeResponse>(
      `${this.API_URL}${API_ENDPOINTS.README.REFINE}`,
      request
    ).pipe(
      tap(response => this.logger.info('README refined successfully, sections included:', response.sections_included)),
      catchError(error => {
        this.logger.error('Error refining README:', error);
        this.notificationService.error(ERROR_MESSAGES.README.GENERATION_FAILED);
        return throwError(() => error);
      })
    );
  }

  /**
   * Save a README to a GitHub repository
   * POST /api/v1/readme/save
   */
  saveReadmeToGithub(request: SaveReadmeRequest): Observable<SaveReadmeResponse> {
    this.logger.info('Saving README to GitHub repository:', request.repository_url);
    return this.http.post<SaveReadmeResponse>(
      `${this.API_URL}${API_ENDPOINTS.README.SAVE}`,
      request
    ).pipe(
      tap(response => this.logger.info('README saved to GitHub successfully:', response.message)),
      catchError(error => {
        this.logger.error('Error saving README to GitHub:', error);
        this.notificationService.error(ERROR_MESSAGES.README.SAVE_FAILED);
        return throwError(() => error);
      })
    );
  }

  /**
   * Download README as a Markdown file
   * POST /api/v1/readme/download
   */
  downloadReadme(request: DownloadReadmeRequest): Observable<Blob> {
    this.logger.info('Downloading README file:', request.filename || 'README.md');
    let params = new HttpParams().set('content', request.content);
    if (request.filename) {
      params = params.set('filename', request.filename);
    }
    return this.http.post<DownloadReadmeResponse>(
      `${this.API_URL}${API_ENDPOINTS.README.DOWNLOAD}`,
      null,
      { params }
    ).pipe(
      tap(response => this.logger.info('README download prepared successfully')),
      map(response => new Blob([response.file_content], { type: 'text/markdown' })),
      catchError(error => {
        this.logger.error('Error preparing README download:', error);
        this.notificationService.error(ERROR_MESSAGES.README.DOWNLOAD_FAILED);
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
    this.logger.info(`Previewing README for ${owner}/${repo}`);

    const headers = new HttpHeaders({
      'Authorization': authToken,
      'Content-Type': 'application/json'
    });

    return this.http.post<PreviewReadmeResponse>(
      `${this.API_URL}/readme/preview/${owner}/${repo}`,
      sections,
      { headers }
    ).pipe(
      tap(response => this.logger.info('README preview generated successfully')),
      catchError(error => {
        this.logger.error('Error generating README preview:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Analyze a repository to recommend README sections and structure
   * GET /api/v1/readme/analyze/{owner}/{repo}
   */
  analyzeRepository(owner: string, repo: string, authToken: string): Observable<AnalyzeRepositoryResponse> {
    this.logger.info(`Analyzing repository ${owner}/${repo}`);

    const headers = new HttpHeaders({
      'Authorization': authToken
    });

    return this.http.get<AnalyzeRepositoryResponse>(
      `${this.API_URL}/readme/analyze/${owner}/${repo}`,
      { headers }
    ).pipe(
      tap(response => this.logger.info('Repository analysis completed successfully')),
      catchError(error => {
        this.logger.error('Error analyzing repository:', error);
        return throwError(() => error);
      })
    );
  }

  getRepositoryBranches(owner: string, repo: string): Observable<RepoBranchResponse> {
    this.logger.info(`Analyzing repository ${owner}/${repo}`);

    // const headers = new HttpHeaders({
    //   'Authorization': authToken
    // });

    return this.http.get<RepoBranchResponse>(
      `${this.API_URL}/readme/branches/${owner}/${repo}`,
      // { headers }
    ).pipe(
      tap(response => {
        this.logger.info("Successfully fetched branches");
      }),
      catchError(error => {
        this.logger.error('Error analyzing repository:', error);
        return throwError(() => error);
      })
    );
  }

  createRepositoryBranch(owner: string, repo: string, branch_name: string): Observable<any> {
    return this.http.post<any>(
      `${this.API_URL}/readme/branches/${owner}/${repo}?branch_name=${branch_name}`,
      {}
      // { headers }
    ).pipe(
      tap(response => {
        this.logger.info("Successfully created branch");
      }),
      catchError(error => {
        this.logger.error('Error creating branch:', error);
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
   * Get README generation history with pagination
   * GET /api/v1/readme/history
   */
  getReadmeHistory(page: number = 1, pageSize: number = 10): Observable<HistoryResponse> {
    this.logger.info('Fetching README generation history', { page, pageSize });

    const params = new HttpParams()
      .set('page', page.toString())
      .set('page_size', pageSize.toString());

    return this.http.get<HistoryResponse>(`${this.API_URL}/readme/history`, { params }).pipe(
      tap(response => this.logger.info('README history fetched:', response.entries?.length || 0, 'entries')),
      catchError(error => {
        this.logger.error('Error fetching README history:', error);
        this.notificationService.error('Failed to load README generation history');
        return throwError(() => error);
      })
    );
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

  extractMetadataFromGithubUrl(github_url: string): RepoUrlInformation | null {
    try {
      const url = new URL(github_url);
      if (url.hostname !== 'github.com') {
        return null;
      }
      
      const parts = url.pathname.split('/').filter(p => p);
      if (parts.length < 2) {
        return null;
      }

      return {
        owner: parts[0],
        repo: parts[1]
      };
      
    } catch {
      return null;
    }
  }

  deleteHistoryEntry(entry: HistoryEntry) {
    return this.http.delete<string>(`${this.API_URL}/readme/history/${entry.id}`).pipe(
      tap(response => this.logger.info('README history entry deleted:', response)),
      catchError(error => {
        this.logger.error('Error fetching README history:', error);
        this.notificationService.error('Failed to delete history entry');
        return throwError(() => error);
      })
    );
  }

  sendFeedBack(request: {
    general_comments: string
    helpful_sections: string[]
    problematic_sections: string[]
    rating: string
    readme_history_id: string
    suggestions?: string
  }): Observable<CreateFeedbackRequestResponse> {
    return this.http.post<CreateFeedbackRequestResponse>(`${this.API_URL}/feedback/`, request).pipe(
      catchError(error => {
        this.notificationService.error('Failed to submit feedback');
        return throwError(() => error);
      })
    )
  }
}
