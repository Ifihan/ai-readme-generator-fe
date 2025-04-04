import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private tokenSubject = new BehaviorSubject<string | null>(null);
  
  private readonly GITHUB_CLIENT_ID = environment.githubClientId;
  private readonly API_URL = environment.apiUrl;

  loginWithGitHub(): void {
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${this.GITHUB_CLIENT_ID}&redirect_uri=${window.location.origin}/api/v1/auth/callback`;
  }

  handleCallback(code: string): Observable<any> {
    return this.http.post(`${this.API_URL}/auth/login`, { code }).pipe(
      tap((response: any) => {
        this.tokenSubject.next(response.access_token);
        localStorage.setItem('access_token', response.access_token);
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
    return this.tokenSubject.pipe(
      map((token: any) => !!token)
    );
  }

  private clearAuth(): void {
    this.tokenSubject.next(null);
    localStorage.removeItem('access_token');
  }

  logout(): void {
    this.http.post(`${this.API_URL}/auth/logout`, {}).subscribe({
      next: () => {
        this.clearAuth();
        this.router.navigate(['/']);
      },
      error: () => this.clearAuth()
    });
  }
}