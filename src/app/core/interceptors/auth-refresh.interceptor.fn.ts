import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { LoadingService } from '../services/loading.service';
import { throwError } from 'rxjs';
import { catchError, switchMap, finalize } from 'rxjs/operators';

export const authRefreshInterceptor: HttpInterceptorFn = (req: HttpRequest<any>, next: HttpHandlerFn) => {
  const authService = inject(AuthService);
  const loadingService = inject(LoadingService);

  // Don't show loading for certain requests
  const skipLoading = req.headers.has('skip-loading') ||
    req.url.includes('/logout') ||
    req.url.includes('/ping') ||
    req.url.includes('/health');

  if (!skipLoading) {
    loadingService.show();
  }

  let authReq = req;
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
  if (token && req.url.includes('/api/')) {
    authReq = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (
        error.status === 401 &&
        req.url.includes('/api/') &&
        !req.url.includes('/auth/refresh-token') &&
        !req.url.includes('/auth/login')
      ) {
        // Try to refresh the token
        return authService.refreshToken().pipe(
          switchMap(() => {
            const newToken = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
            if (newToken) {
              const retryReq = req.clone({
                setHeaders: { Authorization: `Bearer ${newToken}` }
              });
              return next(retryReq);
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
    }),
    finalize(() => {
      if (!skipLoading) {
        loadingService.hide();
      }
    })
  );
};
