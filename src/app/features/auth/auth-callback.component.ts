import { Component, OnInit, Inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { PLATFORM_ID } from '@angular/core';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="auth-callback-container">
      <div class="auth-callback-card">
        <h2>Completing Authentication</h2>
        <p>Please wait while we complete the GitHub authentication process...</p>
        <div class="loading-spinner"></div>
      </div>
    </div>
  `,
  styles: [`
    .auth-callback-container {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      background-color: var(--bg-primary);
    }
    .auth-callback-card {
      padding: 30px;
      border-radius: 8px;
      background-color: var(--bg-card);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      text-align: center;
      max-width: 500px;
    }
    .loading-spinner {
      display: inline-block;
      width: 40px;
      height: 40px;
      margin: 20px auto 0;
      border: 4px solid rgba(0, 0, 0, 0.1);
      border-radius: 50%;
      border-top-color: var(--primary);
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class AuthCallbackComponent implements OnInit {
  isBrowser: boolean;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    console.log('Auth callback component initialized');

    this.route.queryParams.subscribe(params => {
      const code = params['token'];
      console.log('Received query params:', params);
      console.log('GitHub auth code:', code);
      // Only access localStorage if in a browser environment
      if (this.isBrowser) {
        localStorage.setItem('access_token', code || '');
      }
      if (code) {
        console.log('GitHub auth code received, processing...');
        this.router.navigate(['/dashboard']);

        this.authService.login().subscribe({
          next: () => {
            console.log('Successfully authenticated, redirecting to dashboard');
            this.router.navigate(['/dashboard']);
          },
          error: (error) => {
            console.error('Error during authentication:', error);
            // this.router.navigate(['/']);
          }
        });
      } else {
        console.warn('No code found in callback, redirecting to landing page');
        this.router.navigate(['/']);
      }
    });
  }
}
