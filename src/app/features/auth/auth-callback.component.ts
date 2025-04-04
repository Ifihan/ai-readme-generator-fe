// src/app/features/auth/auth-callback.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-auth-callback',
  template: `
    <div class="callback-container">
      <div class="loading-spinner"></div>
      <p>Completing authentication, please wait...</p>
    </div>
  `,
  styles: [`
    .callback-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      text-align: center;
    }
    .loading-spinner {
      width: 50px;
      height: 50px;
      border: 5px solid rgba(138, 43, 226, 0.2);
      border-radius: 50%;
      border-top-color: #8a2be2;
      animation: spin 1s ease-in-out infinite;
      margin-bottom: 20px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class AuthCallbackComponent implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Get the code from the URL querystring
    this.route.queryParams.subscribe(params => {
      const code = params['code'];
      
      if (code) {
        // Process the authentication callback
        this.authService.handleCallback(code).subscribe({
          next: () => {

            this.router.navigate(['/dashboard']);
          },
          error: () => {
            this.router.navigate(['/']);
          }
        });
      } else {
        this.router.navigate(['/']);
      }
    });
  }
}