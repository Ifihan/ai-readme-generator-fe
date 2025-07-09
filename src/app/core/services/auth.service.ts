// import { Injectable, inject, PLATFORM_ID, Inject } from '@angular/core';
// import { HttpClient } from '@angular/common/http';
// import { Router } from '@angular/router';
// import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
// import { catchError, map, tap } from 'rxjs/operators';
// import { environment } from '../../../environments/environment';
// import { isPlatformBrowser } from '@angular/common';

// export interface User {
//   id: string;
//   username: string;
//   email?: string;
//   avatarUrl?: string;
//   githubId?: string;
// }

// @Injectable({ providedIn: 'root' })
// export class AuthService {
//   private http = inject(HttpClient);
//   private router = inject(Router);
//   private tokenSubject = new BehaviorSubject<string | null>(null);
//   private currentUserSubject = new BehaviorSubject<User | null>(null);

//   private readonly GITHUB_CLIENT_ID = environment.githubClientId;
//   private readonly API_URL = environment.apiUrl;
//   private isBrowser: boolean;

//   // Mock user for development
//   private mockUser: User = {
//     id: 'user123',
//     username: 'username',
//     email: 'user@example.com',
//     githubId: '12345',
//     avatarUrl: 'https://github.com/identicons/username.png'
//   };

//   constructor(@Inject(PLATFORM_ID) private platformId: Object) {
//     this.isBrowser = isPlatformBrowser(this.platformId);

//     // Only access browser APIs when in browser environment
//     if (this.isBrowser) {
//       const token = localStorage.getItem('access_token');
//       if (token) {
//         this.tokenSubject.next(token);
//         // Fetch user info when service initializes with a token
//         this.getCurrentUser().subscribe();
//       }
//     }
//   }

//   // loginWithGitHub(): void {
//   //   if (this.isBrowser) {
//   //     window.location.href = `https://github.com/login/oauth/authorize?client_id=${this.GITHUB_CLIENT_ID}&redirect_uri=${window.location.origin}/api/v1/auth/callback`;
//   //   }
//   // }

//   loginWithGitHub(): void {
//     if (this.isBrowser) {
//       // Construct the redirect URI using the API_URL from environment
//       const redirectUri = `${this.API_URL}/auth/callback`;
//       window.location.href = `https://github.com/login/oauth/authorize?client_id=${this.GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}`;
//     }
//   }

//   handleCallback(code: string): Observable<any> {
//     return this.http.post(`${this.API_URL}/auth/login`, { code }).pipe(
//       tap((response: any) => {
//         this.tokenSubject.next(response.access_token);
//         if (this.isBrowser) {
//           localStorage.setItem('access_token', response.access_token);
//         }
//         // Fetch user info after successful login
//         this.getCurrentUser().subscribe();
//       }),
//       catchError(error => {
//         this.clearAuth();
//         return throwError(() => error);
//       })
//     );
//   }

//   getToken(): Observable<string | null> {
//     return this.tokenSubject.asObservable();
//   }

//   // isAuthenticated(): Observable<boolean> {
//   //   return this.tokenSubject.pipe(
//   //     map((token: any) => !!token)
//   //   );
//   // }

//   isAuthenticated(): Observable<boolean> {
//     if (!this.isBrowser) {
//       return of(false);
//     }

//     return this.tokenSubject.pipe(
//       map((token: any) => !!token)
//     );
//   }

//   private clearAuth(): void {
//     this.tokenSubject.next(null);
//     this.currentUserSubject.next(null);
//     if (this.isBrowser) {
//       localStorage.removeItem('access_token');
//     }
//   }

//   logout(): void {
//     this.http.post(`${this.API_URL}/auth/logout`, {}).subscribe({
//       next: () => {
//         this.clearAuth();
//         this.router.navigate(['/']);
//       },
//       error: () => this.clearAuth()
//     });
//   }

//   // User management methods (merged from UserService)
//   getCurrentUser(): Observable<User> {
//     // Return cached user if available
//     if (this.currentUserSubject.value) {
//       return of(this.currentUserSubject.value);
//     }

//     // For development, return mock user
//     if (environment.useMockData) {
//       this.currentUserSubject.next(this.mockUser);
//       return of(this.mockUser);
//     }

//     // In production, fetch from API
//     return this.http.get<User>(`${this.API_URL}/auth/me`).pipe(
//       tap(user => {
//         this.currentUserSubject.next(user);
//       }),
//       catchError(error => {
//         console.error('Error fetching current user', error);
//         return throwError(() => error);
//       })
//     );
//   }

//   /**
//    * Get user as observable for components to subscribe to
//    */
//   getUser(): Observable<User | null> {
//     return this.currentUserSubject.asObservable();
//   }

//   /**
//    * Update the current user's profile
//    */
//   updateProfile(updates: Partial<User>): Observable<User> {
//     // For development, update mock user
//     if (environment.useMockData) {
//       this.mockUser = { ...this.mockUser, ...updates };
//       this.currentUserSubject.next(this.mockUser);
//       return of(this.mockUser);
//     }

//     // In production, update via API
//     return this.http.patch<User>(`${this.API_URL}/user/profile`, updates).pipe(
//       tap(user => {
//         this.currentUserSubject.next(user);
//       }),
//       catchError(error => {
//         console.error('Error updating profile', error);
//         return throwError(() => error);
//       })
//     );
//   }
// }

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

  // Mock user for development
  private mockUser: User = {
    id: 'user123',
    username: 'username',
    email: 'user@example.com',
    githubId: '12345',
    avatarUrl: 'https://github.com/identicons/username.png'
  };

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

  loginWithGitHub(): void {
    console.log('Initiating GitHub login');
    if (typeof window !== 'undefined') {
      // Construct the redirect URI using the API_URL from environment
      const redirectUri = `${this.API_URL}/auth/callback`;
      console.log('Redirect URI:', redirectUri);
      console.log('Redirecting to GitHub OAuth page');
      // window.location.href = `https://github.com/login/oauth/authorize?client_id=${this.GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}`;
      this.http.get<{ install_url: string, status: string }>(`${this.API_URL}/auth/login`, { responseType: 'json' }).subscribe({
        next: (url) => {
          console.log('Received redirect URL from API:', url);
          if (url && url.install_url) {
            window.location.href = url.install_url;
          } else if (url && url.status === 'authenticated') {
            console.log('Already authenticated, redirecting to dashboard');
            this.router.navigate(['/dashboard']);
          }
        },
        error: (err) => {
          console.error('Error fetching GitHub redirect URL:', err);
          this.clearAuth();
        }
      });
    } else {
      console.warn('Cannot redirect: not in browser environment');
    }
  }

  // login api that returns an observable

  /**
   * Handles the GitHub OAuth callback by exchanging the code for an access token.
   * @param code The authorization code received from GitHub.
   * @returns An observable that emits the login response.
   */

  login(): Observable<any> {
    console.log('Handling GitHub login via header');
    // The GitHub code is expected to be sent in the request header by the caller or interceptor.
    return this.http.get<LoginResponse>(`${this.API_URL}/auth/login`).pipe(
      tap((response: LoginResponse) => {
        console.log('Login response received:', response);
        console.log('Login response received:', response.token ? 'Token received' : 'No token');
        // this.tokenSubject.next(response.token);
        if (this.isBrowser) {
          localStorage.setItem('current_session', JSON.stringify(response));
          console.log('Token saved to localStorage');
        }
      }),
      catchError(error => {
        console.error('Error during GitHub login:', error);
        this.clearAuth();
        return throwError(() => error);
      })
    );
  }

  handleCallback(code: string): Observable<any> {
    console.log('Handling GitHub callback with code');
    return this.http.post(`${this.API_URL}/auth/login`, { code }).pipe(
      tap((response: any) => {
        console.log('Login response received:', response.access_token ? 'Token received' : 'No token');
        this.tokenSubject.next(response.access_token);
        if (this.isBrowser) {
          localStorage.setItem('access_token', response.access_token);
          console.log('Token saved to localStorage');
        }
        // Fetch user info after successful login
        this.getCurrentUser().subscribe({
          next: user => console.log('User info fetched after login:', !!user),
          error: err => console.error('Error fetching user after login:', err)
        });
      }),
      catchError(error => {
        console.error('Error handling GitHub callback:', error);
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
    // Return cached user if available
    if (this.currentUserSubject.value) {
      console.log('Returning cached user');
      return of(this.currentUserSubject.value);
    }

    // For development, return mock user
    if (environment.useMockData) {
      console.log('Using mock user data');
      this.currentUserSubject.next(this.mockUser);
      return of(this.mockUser);
    }

    // In production, fetch from API
    console.log('Fetching user from API');
    return this.http.get<User>(`${this.API_URL}/auth/me`).pipe(
      tap(user => {
        console.log('User fetched from API:', user);
        this.currentUserSubject.next(user);
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
    // For development, update mock user
    if (environment.useMockData) {
      this.mockUser = { ...this.mockUser, ...updates };
      this.currentUserSubject.next(this.mockUser);
      return of(this.mockUser);
    }

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
}
