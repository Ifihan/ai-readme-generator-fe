import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { PageLayoutComponent } from '../../shared/components/page-layout/page-layout.component';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, PageLayoutComponent],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit {
  userSession: any;
  message: string = '';
  loading: boolean = false;
  error: string = '';
  processing: boolean = false;

  constructor(private authService: AuthService) { }

  ngOnInit(): void {
    this.loading = true;
    try {
      const session = localStorage.getItem('user_session');
      this.userSession = session ? JSON.parse(session) : null;
      if (!this.userSession) {
        this.error = 'No user session found. Please log in again.';
      }
    } catch (err) {
      this.error = 'Error loading user session.';
      console.error('Error parsing user session:', err);
    }
    this.loading = false;
  }

  onReinstall(): void {
    this.processing = true;
    this.message = '';
    this.error = '';

    this.authService.reinstallGitHubApp().subscribe({
      next: (response: any) => {
        console.log('Reinstall response:', response);

        if (response?.install_url) {
          // Redirect user to the GitHub App configuration URL
          this.message = response.message || 'Redirecting to GitHub App configuration...';

          // Redirect after a short delay to show the message
          setTimeout(() => {
            window.location.href = response.install_url;
          }, 1500);
        } else {
          this.message = 'GitHub App reinstall initiated successfully';
        }

        this.processing = false;
      },
      error: (err) => {
        this.error = 'Error initiating GitHub App reinstall';
        console.error('Reinstall error:', err);
        this.processing = false;
      }
    });
  }

  onRevoke(): void {
    this.processing = true;
    this.message = '';
    this.error = '';

    this.authService.revokeGitHubApp().subscribe({
      next: () => {
        this.message = 'GitHub App revoked successfully';
        this.processing = false;
        // Clear user session after revocation
        localStorage.removeItem('user_session');
        localStorage.removeItem('access_token');
        this.userSession = null;
      },
      error: (err) => {
        this.error = 'Error revoking GitHub App';
        console.error('Revoke error:', err);
        this.processing = false;
      }
    });
  }
}
