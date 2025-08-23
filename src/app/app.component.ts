import { Component, OnInit, isDevMode } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NotificationContainerComponent } from './shared/components/notifications/notification-container.component';
import { LoadingBarComponent } from './shared/components/loading-bar/loading-bar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, NotificationContainerComponent, LoadingBarComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  ngOnInit() {
    if (typeof window !== 'undefined') {
      // Check for system theme preference on app load
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const savedTheme = localStorage.getItem('theme') || 'system';

      document.documentElement.setAttribute('data-theme', savedTheme);

      if (savedTheme === 'system') {
        document.documentElement.classList.toggle('dark', prefersDark);
      } else {
        document.documentElement.classList.toggle('dark', savedTheme === 'dark');
      }

      // Listen for system theme changes
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (document.documentElement.getAttribute('data-theme') === 'system') {
          document.documentElement.classList.toggle('dark', e.matches);
        }
      });
    } else {
      // Server-side rendering - skip media query listener
    }
  }
}
