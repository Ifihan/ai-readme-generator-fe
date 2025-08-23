import { Injectable, inject, PLATFORM_ID, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { isPlatformBrowser } from '@angular/common';

export interface User {
  id: string;
  username: string;
  email?: string;
  avatarUrl?: string;
  githubId?: string;
}

export interface UserResponse {
  username: string;
  installation_id: number;
  expires: number;
  user_data: {
    id: string;
    username: string;
    installation_id: number;
    email: string | null;
    full_name: string;
    avatar_url: string;
    github_id: number;
    public_repos: number;
    company: string | null;
    created_at: string;
    last_login: string;
  };
}

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
  private tokenSubject = new BehaviorSubject<string | null>(null);
  private currentUserSubject = new BehaviorSubject<User | null>(null);

  private readonly GITHUB_CLIENT_ID = environment.githubClientId;
  private readonly API_URL = environment.apiUrl;
  private isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    console.log('AuthService initialized, isBrowser:', this.isBrowser);

    // Only access browser APIs when in browser environment
    if (this.isBrowser) {
      const token = localStorage.getItem('access_token');
      if (token) {
        console.log('Token found in localStorage');
        this.tokenSubject.next(token);
        // Fetch user info when service initializes with a token
        this.getCurrentUser().subscribe({
          next: user => console.log('User loaded on init:', !!user),
          error: err => console.error('Error loading user on init:', err)
        });
      } else {
        console.log('No token found in localStorage');
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
    console.log('Starting OAuth login flow');
    return this.http.get<{ status: string; oauth_url?: string; message?: string }>(
      `${this.API_URL}/auth/oauth/login`
    ).pipe(
      tap((response) => {
        console.log('OAuth login response:', response);
        if (this.isBrowser && response?.oauth_url) {
          window.location.href = response.oauth_url;
        } else {
          console.warn('OAuth URL not provided in response');
        }
      }),
      catchError(error => {
        console.error('Error initiating OAuth login:', error);
        this.clearAuth();
        return throwError(() => error);
      })
    );
  }

  handleCallback(code: string): Observable<any> {
    console.log('Handling OAuth callback with code');
    return this.http.get<any>(`${this.API_URL}/auth/oauth/callback`, {
      params: { code }
    }).pipe(
      tap((response: any) => {
        // We don't know the response model yet; log it for now
        console.log('OAuth callback response:', response);
        // Later: set tokens and load user here when model is confirmed
      }),
      catchError(error => {
        console.error('Error handling OAuth callback:', error);
        // Do not clear auth since this is initial login flow; just surface error
        return throwError(() => error);
      })
    );
  }

  getToken(): Observable<string | null> {
    return this.tokenSubject.asObservable();
  }

  isAuthenticated(): Observable<boolean> {
    if (!this.isBrowser) {
      console.log('Not in browser, returning not authenticated');
      return of(false);
    }

    return this.tokenSubject.pipe(
      map((token: string | null) => {
        // First check if we have a token in the subject
        if (!token) {
          // Double-check localStorage in case of race conditions
          const storedToken = localStorage.getItem('access_token');
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

  private clearAuth(): void {
    console.log('Clearing authentication data');
    this.tokenSubject.next(null);
    this.currentUserSubject.next(null);
    if (this.isBrowser) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('current_session');
    }
  }

  logout(): void {
    console.log('Logging out user');
    this.http.post(`${this.API_URL}/auth/logout`, {}).subscribe({
      next: () => {
        this.clearAuth();
        this.router.navigate(['/']);
        console.log('Logout successful, redirected to landing page');
      },
      error: (err) => {
        console.error('Logout error:', err);
        this.clearAuth();
      }
    });
  }

  // User management methods (merged from UserService)
  getCurrentUser(): Observable<User> {
    console.log('Getting current user');

    // In production, fetch from API
    console.log('Fetching user from API');
    return this.http.get<UserResponse>(`${this.API_URL}/auth/me`).pipe(
      tap(response => {
        console.log('User response from API:', response);

        // Store the entire response in localStorage
        if (this.isBrowser) {
          localStorage.setItem('user_session', JSON.stringify(response));
        }

        // Transform response to User interface and update subject
        const user: User = {
          id: response.user_data.id,
          username: response.user_data.username,
          email: response.user_data.email || undefined,
          avatarUrl: response.user_data.avatar_url,
          githubId: response.user_data.github_id.toString()
        };

        console.log('Transformed user:', user);
        this.currentUserSubject.next(user);

        // Update token subject when user is fetched successfully
        if (this.isBrowser) {
          const token = localStorage.getItem('access_token');
          if (token) {
            this.tokenSubject.next(token);
          }
        }
      }),
      map(response => {
        // Return transformed user
        return {
          id: response.user_data.id,
          username: response.user_data.username,
          email: response.user_data.email || undefined,
          avatarUrl: response.user_data.avatar_url,
          githubId: response.user_data.github_id.toString()
        };
      }),
      catchError(error => {
        console.error('Error fetching current user', error);
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
          localStorage.setItem('access_token', response.access_token);
          this.tokenSubject.next(response.access_token);
        }
      }),
      catchError(error => {
        console.error('Error refreshing token', error);
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
    return this.http.post<any>(`${this.API_URL}/auth/verify-token?token=${encodeURIComponent(token)}`, {}).pipe(
      catchError(error => {
        console.error('Error verifying token', error);
        return throwError(() => error);
      })
    );
  }

  // New methods for GitHub App settings
  /**
   * Reinstall GitHub App to change permissions.
   * Generates a reinstall URL for the GitHub App. (Authorization header is ignored)
   */
  public reinstallGitHubApp(): Observable<any> {
    const url = `${this.API_URL}/auth/settings/reinstall`;
    return this.http.post(url, {});
  }

  /**
   * Revoke GitHub App installation and clear user data.
   * (Authorization header is ignored)
   */
  public revokeGitHubApp(): Observable<any> {
    const url = `${this.API_URL}/auth/settings/revoke`;
    return this.http.delete(url);
  }
}
