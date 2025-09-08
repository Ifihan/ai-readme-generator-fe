import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { STORAGE_KEYS } from '../constants/app.constants';

export interface Repository {
  id: number;
  name: string;
  full_name: string;
  description: string;
  private: boolean;
  html_url: string;
  language: string;
  default_branch: string;
  updated_at: string;
  owner: {
    login: string;
    avatar_url: string;
  };
}

export interface Installation {
  id: string;
  app_id: string;
  target_type: string;
  account: {
    login: string;
    avatar_url: string;
  };
}

export interface ReadmeResponse {
  id: string;
  content: string;
  repositoryId: string | number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RepositoriesResponse {
  repositories: Repository[];
  total_count: number;
}

@Injectable({
  providedIn: 'root'
})
export class GithubService {
  private readonly API_URL = environment.apiUrl;
  private isBrowser: boolean;

  constructor(
    private http: HttpClient,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);

    // Check if we need to handle an installation callback
    if (this.isBrowser) {
      this.checkAndHandleInstallRedirect();
    }
  }

  /**
   * Checks if this is a return from GitHub app installation and redirects appropriately
   * Should be called when the service is instantiated
   */
  private checkAndHandleInstallRedirect(): void {
    // Check if the URL has installation parameters from GitHub
    const urlParams = new URLSearchParams(window.location.search);
    const installationId = urlParams.get('installation_id');
    const setupAction = urlParams.get('setup_action');

    // If this is a return from GitHub app installation
    if (installationId && setupAction === 'install') {
      console.log('Detected return from GitHub app installation');

      // Clear URL parameters but keep the path
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);

      // Get redirect path from localStorage
      const redirectPath = localStorage.getItem('install_redirect') || '/dashboard';
      localStorage.removeItem('install_redirect'); // Clear stored path

      // Redirect to the original page (most likely dashboard)
      this.router.navigateByUrl(redirectPath, { replaceUrl: true });
    }
  }

  /**
   * Initiate GitHub OAuth login flow
   */
  loginWithGitHub(): void {
    if (this.isBrowser) {
      // Store current page to return after authentication
      localStorage.setItem('auth_redirect', window.location.pathname);
      window.location.href = `${this.API_URL}/auth/login`;
    }
  }

  /**
   * Logout from GitHub
   */
  logout(): void {
    if (this.isBrowser) {
      // Clear any stored tokens or user info
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.CURRENT_SESSION);
      localStorage.removeItem(STORAGE_KEYS.USER_SESSION);
      // Redirect to landing page
      this.router.navigateByUrl('/', { replaceUrl: true });
    }
  }

  /**
   * Get current authenticated user info from GitHub
   */
  getCurrentUser(): Observable<any> {
    return this.http.get(`${this.API_URL}/auth/me`).pipe(
      catchError(error => {
        console.error('Error fetching GitHub user profile:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Initiate GitHub App installation flow
   */
  installGitHubApp(): void {
    if (this.isBrowser) {
      // Store current page to return after installation
      localStorage.setItem('install_redirect', window.location.pathname);

      // Get the installation URL from the server and redirect
      this.http.get<{ install_url: string }>(`${this.API_URL}/auth/app-install`)
        .subscribe({
          next: (response) => {
            if (response && response.install_url) {
              // Redirect to the installation URL provided by the API
              window.location.href = response.install_url;
            } else {
              console.error('Invalid installation URL received');
            }
          },
          error: (error) => {
            console.error('Error getting GitHub app installation URL:', error);
          }
        });
    }
  }

  /**
   * Get all repositories for the authenticated user (GitHub app installations)
   * Matches the API response: { repositories: Repository[], total_count: number }
   */
  getRepositories(): Observable<RepositoriesResponse> {
    return this.http.get<RepositoriesResponse>(`${this.API_URL}/auth/repositories`)
      .pipe(
        tap(response => {
          console.log(`Received ${response.total_count} repositories`, response.repositories);
        }),
        catchError(error => {
          console.error('Error fetching GitHub app installations:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get repositories available through a specific GitHub app installation
   * @param installationId The ID of the GitHub app installation
   */
  getInstallationRepositories(installationId: string): Observable<Repository[]> {
    return this.http.get<RepositoriesResponse>(
      `${this.API_URL}/auth/installations/${installationId}/repositories`
    ).pipe(
      map(response => response.repositories || []),
      tap(repos => {
        console.log(`Received ${repos.length} repositories for installation ${installationId}`);
      }),
      catchError(error => {
        console.error(`Error fetching repositories for installation ${installationId}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Generate a README for a repository
   * @param repositoryId The ID of the repository
   */
  generateReadme(repositoryId: string | number): Observable<ReadmeResponse> {
    return this.http.post<ReadmeResponse>(`${this.API_URL}/readmes/generate`, { repositoryId })
      .pipe(
        catchError(error => {
          console.error(`Error generating README for repository ${repositoryId}:`, error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get a specific README by ID
   * @param readmeId The ID of the README
   */
  getReadme(readmeId: string): Observable<ReadmeResponse> {
    return this.http.get<ReadmeResponse>(`${this.API_URL}/readmes/${readmeId}`)
      .pipe(
        catchError(error => {
          console.error(`Error fetching README with ID ${readmeId}:`, error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get generated READMEs for the authenticated user
   */
  getGeneratedReadmes(): Observable<ReadmeResponse[]> {
    return this.http.get<ReadmeResponse[]>(`${this.API_URL}/readmes`)
      .pipe(
        catchError(error => {
          console.error('Error fetching READMEs:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get repository statistics from GitHub API
   * @param owner The repository owner
   * @param repo The repository name
   */
  getRepositoryStats(owner: string, repo: string): Observable<any> {
    return this.http.get(`https://api.github.com/repos/${owner}/${repo}`)
      .pipe(
        map((repoData: any) => ({
          stars: repoData.stargazers_count,
          forks: repoData.forks_count,
          name: repoData.name,
          full_name: repoData.full_name,
          html_url: repoData.html_url
        })),
        catchError(error => {
          console.error(`Error fetching stats for ${owner}/${repo}:`, error);
          return throwError(() => error);
        })
      );
  }
}
