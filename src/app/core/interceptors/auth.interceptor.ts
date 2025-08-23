// src/app/core/interceptors/auth.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
export const authInterceptor: HttpInterceptorFn = (req, next) => {

  // Only add auth header for API requests
  if (req.url.includes('/api/')) {
    // Check if localStorage is available (i.e. in a browser environment)
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (token) {
      const authReq = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
      return next(authReq);
    }
    return next(req);
  }

  return next(req);
};
