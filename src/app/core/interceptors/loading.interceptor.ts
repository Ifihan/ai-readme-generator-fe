import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { LoadingService } from '../services/loading.service';

@Injectable()
export class LoadingInterceptor implements HttpInterceptor {

  constructor(private loadingService: LoadingService) { }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Don't show loading for certain requests (like logout, small API calls, etc.)
    const skipLoading = req.headers.has('skip-loading') ||
      req.url.includes('/logout') ||
      req.url.includes('/ping');

    if (!skipLoading) {
      this.loadingService.show();
    }

    return next.handle(req).pipe(
      finalize(() => {
        if (!skipLoading) {
          this.loadingService.hide();
        }
      })
    );
  }
}
