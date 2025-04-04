import { Injectable, isDevMode } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

export interface User {
  id: number;
  login: string;
  name: string;
  avatarUrl: string;
  email: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private tokenSubject = new BehaviorSubject<string | null>(null);

  constructor(private http: HttpClient) {
    if (typeof localStorage !== 'undefined') {
      // Check local storage for existing tokens on initialization
      const token = localStorage.getItem('github_token');
      const user = localStorage.getItem('user');

      if (token) {
        this.tokenSubject.next(token);
      }

      if (user) {
        try {
          this.currentUserSubject.next(JSON.parse(user));
        } catch (e) {
          localStorage.removeItem('user');
        }
      }
    } else {
      if (isDevMode()) {
        console.warn('localStorage is not available');
      }
    }
  }

  // GitHub OAuth login
  loginWithGitHub(): void {
    // In production, this will redirect to the GitHub authorization URL
    window.location.href = 'https://github.com/login/oauth/authorize?client_id=YOUR_CLIENT_ID&scope=repo';
  }

  // Handle OAuth callback - this will be called by the server after GitHub redirects back
  handleCallback(code: string): Observable<User> {
    // Exchange code for token using backend
    return this.http.post<{token: string, user: User}>('/api/auth/github', { code }).pipe(
      tap(response => {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('github_token', response.token);
          localStorage.setItem('user', JSON.stringify(response.user));
        }

        this.tokenSubject.next(response.token);
        this.currentUserSubject.next(response.user);
      }),
      catchError(error => {
        console.error('GitHub auth error:', error);
        return of(null as any);
      })
    );
  }

  logout(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('github_token');
      localStorage.removeItem('user');
    }

    this.tokenSubject.next(null);
    this.currentUserSubject.next(null);
  }

  // Check if the user is currently authenticated
  isAuthenticated(): Observable<boolean> {
    return of(this.tokenSubject.value !== null);
  }

  // Get the current user
  getCurrentUser(): Observable<User | null> {
    return this.currentUserSubject.asObservable();
  }

  // Get the access token
  getToken(): Observable<string | null> {
    return this.tokenSubject.asObservable();
  }
}
