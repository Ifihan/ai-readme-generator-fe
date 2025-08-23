import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { PageLayoutComponent } from '../../shared/components/page-layout/page-layout.component';
import { STORAGE_KEYS, ERROR_MESSAGES, SUCCESS_MESSAGES } from '../../core/constants/app.constants';

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
  showRevokeConfirm: boolean = false;

  constructor(
    private authService: AuthService,
    private notificationService: NotificationService
  ) { }

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
    }
    this.loading = false;
  }

  onReinstall(): void {
    this.processing = true;
    this.message = '';
    this.error = '';

    this.authService.reinstallGitHubApp().subscribe({
      next: (response: any) => {
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
        this.processing = false;
      }
    });
  }

  confirmRevoke(): void {
    this.showRevokeConfirm = true;
    this.message = '';
    this.error = '';
  }

  cancelRevoke(): void {
    this.showRevokeConfirm = false;
  }

  proceedRevoke(): void {
    this.processing = true;
    this.authService.revokeGitHubApp().subscribe({
      next: () => {
        this.message = 'GitHub App revoked successfully';
        this.processing = false;
        this.showRevokeConfirm = false;
        // Clear session via AuthService for consistency
        this.authService.clearAuth();
        localStorage.removeItem('user_session');
        this.userSession = null;
      },
      error: () => {
        this.error = 'Error revoking GitHub App';
        this.processing = false;
        this.showRevokeConfirm = false;
      }
    });
  }

  onLogout(): void {
    this.authService.clearAuth();
    localStorage.removeItem('user_session');
  }
}
