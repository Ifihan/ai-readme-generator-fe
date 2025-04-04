import { Component, OnInit, isDevMode } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
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
      if (isDevMode()) {
        console.warn('window is not available');
      }
    }
  }
}
