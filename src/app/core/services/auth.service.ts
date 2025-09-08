import { Injectable, inject, PLATFORM_ID, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { isPlatformBrowser } from '@angular/common';
import { STORAGE_KEYS, API_ENDPOINTS, ROUTES, ERROR_MESSAGES } from '../constants/app.constants';
import { NotificationService } from './notification.service';
import { LoggerService } from './logger.service';
import { User, UserResponse } from '../models/user.model';



export interface LoginResponse {
  status: string;
  username: string;
  installation_id: number;
  token: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private notificationService = inject(NotificationService);
  private logger = inject(LoggerService);
  private tokenSubject = new BehaviorSubject<string | null>(null);
  private currentUserSubject = new BehaviorSubject<User | null>(null);

  private readonly GITHUB_CLIENT_ID = environment.githubClientId;
  private readonly API_URL = environment.apiUrl;
  private isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);

    // Only access browser APIs when in browser environment
    if (this.isBrowser) {
      const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      if (token) {
        this.tokenSubject.next(token);
        // Fetch user info when service initializes with a token
        this.getCurrentUser(token).subscribe({
          next: user => {
            // User loaded successfully
          },
          error: err => {
            // Handle error silently or log to external service
          }
        });
      }
    }
  }

  // Removed legacy loginWithGitHub in favor of unified login() using OAuth endpoints

  // login api that returns an observable

  /**
   * Handles the GitHub OAuth callback by exchanging the code for an access token.
   * @param code The authorization code received from GitHub.
   * @returns An observable that emits the login response.
   */

  login(): Observable<any> {
    return this.http.get<{ status: string; oauth_url?: string; message?: string }>(
      `${this.API_URL}${API_ENDPOINTS.AUTH.LOGIN}`
    ).pipe(
      tap((response) => {
        if (this.isBrowser && response?.oauth_url) {
          window.location.href = response.oauth_url;
        }
      }),
      catchError(error => {
        this.clearAuth();
        return throwError(() => error);
      })
    );
  }

  handleCallback(code: string): Observable<any> {
    return this.http.get<any>(`${this.API_URL}${API_ENDPOINTS.AUTH.CALLBACK}`, {
      params: { code }
    }).pipe(
      tap((response: any) => {
        // Handle callback response
      }),
      catchError(error => {
        this.clearAuth();
        return throwError(() => error);
      })
    );
  }

  getToken(): Observable<string | null> {
    return this.tokenSubject.asObservable();
  }

  isAuthenticated(): Observable<boolean> {
    if (!this.isBrowser) {
      return of(false);
    }

    return this.tokenSubject.pipe(
      map((token: string | null) => {
        // First check if we have a token in the subject
        if (!token) {
          // Double-check localStorage in case of race conditions
          const storedToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
          if (storedToken) {
            // Update the subject if we found a token in localStorage
            this.tokenSubject.next(storedToken);
            return true;
          }
          return false;
        }

        // TODO: Add token expiration validation here
        // For now, just check if token exists and is not empty
        return token.length > 0;
      })
    );
  }

  public clearAuth(): void {
    this.tokenSubject.next(null);
    this.currentUserSubject.next(null);
    if (this.isBrowser) {
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.CURRENT_SESSION);
      localStorage.removeItem(STORAGE_KEYS.USER_SESSION);
    }
    this.notificationService.info('You have been logged out.');
    window.location.href = ROUTES.LANDING;
  }

  logout(): void {
    this.http.post(`${this.API_URL}${API_ENDPOINTS.AUTH.LOGOUT}`, {}).subscribe({
      next: () => {
        this.clearAuth();
        this.router.navigate([ROUTES.LANDING]);
      },
      error: (err) => {
        // Even if logout fails on server, clear local auth
        this.clearAuth();
        this.router.navigate([ROUTES.LANDING]);
      }
    });
  }

  // User management methods (merged from UserService)
  getCurrentUser(toekn: string): Observable<User | null> {
    if (!this.isBrowser) {
      return of(null);
    }

    return this.http.get<UserResponse>(`${this.API_URL}${API_ENDPOINTS.AUTH.ME}`).pipe(
      tap((response: UserResponse) => {
        // Store the full response in localStorage for future use
        // localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, this.tokenSubject.value || '');
        localStorage.setItem(STORAGE_KEYS.USER_SESSION, JSON.stringify(response));

        // Transform the response to match our User interface
        const user: User = {
          id: response.user_data.id,
          username: response.user_data.username,
          email: response.user_data.email || undefined,
          avatarUrl: response.user_data.avatar_url,
          githubId: response.user_data.github_id?.toString()
        };

        this.currentUserSubject.next(user);
        return user;
      }),
      map((response: UserResponse) => {
        const user: User = {
          id: response.user_data.id,
          username: response.user_data.username,
          email: response.user_data.email || undefined,
          avatarUrl: response.user_data.avatar_url,
          githubId: response.user_data.github_id?.toString()
        };
        return user;
      }),
      catchError(error => {
        // this.clearAuth();
        // this.notificationService.error('Error fetching user data');
        return throwError(() => error);
      })
    );
  }

  getUser(): Observable<User | null> {
    return this.currentUserSubject.asObservable();
  }

  updateProfile(updates: Partial<User>): Observable<User> {
    // In production, update via API
    return this.http.patch<User>(`${this.API_URL}/user/profile`, updates).pipe(
      tap(user => {
        this.currentUserSubject.next(user);
      }),
      catchError(error => {
        console.error('Error updating profile', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Refresh the authentication token.
   * @param token Optional. If not provided, uses the current token from localStorage.
   */
  refreshToken(token?: string): Observable<any> {
    const authToken = token || (this.isBrowser ? localStorage.getItem('access_token') : null);
    if (!authToken) {
      return throwError(() => new Error('No token available to refresh.'));
    }
    return this.http.post<any>(`${this.API_URL}/auth/refresh-token`, {}, {
      headers: { Authorization: `Bearer ${authToken}` }
    }).pipe(
      tap(response => {
        // Optionally update token in localStorage if new token is returned
        if (response && response.access_token && this.isBrowser) {
          localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, response.access_token);
          this.tokenSubject.next(response.access_token);
        }
      }),
      catchError(error => {
        this.logger.error('Error refreshing token', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Verify a JWT token and return user information.
   * @param token The JWT token to verify.
   */
  verifyToken(token: string): Observable<any> {
    if (!token) {
      return throwError(() => new Error('No token provided for verification.'));
    }
    return this.http.post<any>(`${this.API_URL}${API_ENDPOINTS.AUTH.VERIFY}?token=${encodeURIComponent(token)}`, {}).pipe(
      catchError(error => {
        return throwError(() => error);
      })
    );
  }

  // New methods for GitHub App settings
  /**
   * Reinstall GitHub App to change permissions.
   */
  public reinstallGitHubApp(): Observable<any> {
    return this.http.post(`${this.API_URL}${API_ENDPOINTS.AUTH.REINSTALL}`, {});
  }

  /**
   * Revoke GitHub App installation and clear user data.
   */
  public revokeGitHubApp(): Observable<any> {
    return this.http.delete(`${this.API_URL}${API_ENDPOINTS.AUTH.REVOKE}`);
  }
}
