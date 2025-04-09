// import { Injectable, inject, PLATFORM_ID, Inject } from '@angular/core';
// import { ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';
// import { Observable, of } from 'rxjs';
// import { catchError, map } from 'rxjs/operators';
// import { AuthService } from '../services/auth.service';
// import { isPlatformBrowser } from '@angular/common';

// @Injectable({
//   providedIn: 'root'
// })
// export class AuthGuard {
//   private authService = inject(AuthService);
//   private router = inject(Router);
//   private isBrowser: boolean;

//   constructor(@Inject(PLATFORM_ID) private platformId: Object) {
//     this.isBrowser = isPlatformBrowser(this.platformId);
//   }

//   // canActivate(
//   //   route: ActivatedRouteSnapshot, 
//   //   state: RouterStateSnapshot
//   // ): boolean {
//   //   // Temporarily bypass authentication check
//   //   return true;
//   // }

//   // original method

//   canActivate(
//     route: ActivatedRouteSnapshot,
//     state: RouterStateSnapshot,
    
//   ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
//     // For server-side rendering, always allow navigation
//     // The actual auth check will happen on the client side
//     if (!this.isBrowser) {
//       return true;
//     }

//     return this.authService.isAuthenticated().pipe(
//       map(isAuthenticated => {
//         if (isAuthenticated) {
//           return true;
//         }
        
//         // Redirect to the landing page if not authenticated
//         return this.router.createUrlTree(['']);
//       }),
//       catchError(() => {
//         // Handle errors by redirecting to landing page
//         return of(this.router.createUrlTree(['']));
//       })
//     );
//   }
// }


import { Injectable, inject, PLATFORM_ID, Inject } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard {
  private authService = inject(AuthService);
  private router = inject(Router);
  private isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    console.log('AuthGuard initialized, isBrowser:', this.isBrowser);
  }

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    console.log('AuthGuard.canActivate called for route:', state.url);
    
    // For server-side rendering, always allow navigation
    // The actual auth check will happen on the client side
    if (!this.isBrowser) {
      console.log('Server-side rendering, allowing navigation');
      return true;
    }

    return this.authService.isAuthenticated().pipe(
      tap(isAuthenticated => console.log('User is authenticated:', isAuthenticated)),
      map(isAuthenticated => {
        if (isAuthenticated) {
          console.log('User authenticated, allowing navigation');
          return true;
        }
        
        console.log('User not authenticated, redirecting to landing page');
        // Redirect to the landing page if not authenticated
        return this.router.createUrlTree(['']);
      }),
      catchError(error => {
        console.error('Error in auth guard:', error);
        // Handle errors by redirecting to landing page
        return of(this.router.createUrlTree(['']));
      })
    );
  }
}