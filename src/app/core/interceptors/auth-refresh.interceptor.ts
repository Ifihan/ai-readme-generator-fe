import { Injectable, Injector } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError, from } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';


@Injectable()
export class AuthRefreshInterceptor implements HttpInterceptor {
  constructor(private injector: Injector) { }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Only add auth header for API requests
    let authReq = req;
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (token && req.url.includes('/api/')) {
      authReq = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` }
      });
    }

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        if (
          error.status === 401 &&
          req.url.includes('/api/') &&
          !req.url.includes('/auth/refresh-token') &&
          !req.url.includes('/auth/login')
        ) {
          // Get AuthService at runtime to avoid circular DI
          const authService = this.injector.get(AuthService);
          return authService.refreshToken().pipe(
            switchMap(() => {
              const newToken = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
              if (newToken) {
                const retryReq = req.clone({
                  setHeaders: { Authorization: `Bearer ${newToken}` }
                });
                return next.handle(retryReq);
              }
              authService.logout();
              return throwError(() => error);
            }),
            catchError(refreshError => {
              authService.logout();
              return throwError(() => refreshError);
            })
          );
        }
        return throwError(() => error);
      })
    );
  }
}
