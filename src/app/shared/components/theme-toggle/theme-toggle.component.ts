import { Component, Inject, OnInit, PLATFORM_ID, RendererFactory2, Renderer2 } from '@angular/core';
import { CommonModule, DOCUMENT, isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-theme-toggle',
  templateUrl: './theme-toggle.component.html',
  styleUrls: ['./theme-toggle.component.css'],
  standalone: true,
  imports: [CommonModule],
  exportAs: 'themeToggle'
})
export class ThemeToggleComponent implements OnInit {
  currentTheme: 'light' | 'dark' | 'system' = 'system';
  isBrowser: boolean;
  private renderer: Renderer2;

  constructor(
    @Inject(DOCUMENT) private document: Document,
    @Inject(PLATFORM_ID) private platformId: Object,
    rendererFactory: RendererFactory2
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.renderer = rendererFactory.createRenderer(null, null);
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      // Load saved theme
      const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system';
      if (savedTheme) {
        this.currentTheme = savedTheme;
        this.applyTheme(savedTheme);
      } else {
        // Default to system if no saved preference
        this.applyTheme('system');
      }
    }

    // Add listener for system preference changes
    if (this.isBrowser && this.currentTheme === 'system') {
      this.setupSystemThemeListener();
    }
  }

  setTheme(theme: 'light' | 'dark' | 'system'): void {
    if (!this.isBrowser) return;

    this.currentTheme = theme;
    localStorage.setItem('theme', theme);
    this.applyTheme(theme);
  }

  private applyTheme(theme: 'light' | 'dark' | 'system'): void {
    if (!this.isBrowser) return;

    // Set the data-theme attribute on root element
    this.renderer.setAttribute(this.document.documentElement, 'data-theme', theme);

    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.toggleDarkClass(prefersDark);
      this.setupSystemThemeListener();
    } else {
      this.toggleDarkClass(theme === 'dark');
    }
  }

  private toggleDarkClass(isDark: boolean): void {
    if (isDark) {
      this.renderer.addClass(this.document.documentElement, 'dark');
      this.renderer.removeClass(this.document.documentElement, 'light');
    } else {
      this.renderer.addClass(this.document.documentElement, 'light');
      this.renderer.removeClass(this.document.documentElement, 'dark');
    }
  }

  private setupSystemThemeListener(): void {
    if (!this.isBrowser) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const listener = (e: MediaQueryListEvent) => {
      if (this.currentTheme === 'system') {
        this.toggleDarkClass(e.matches);
      }
    };

    try {
      // Modern browsers
      mediaQuery.addEventListener('change', listener);
    } catch (e) {
      // Fallback for older browsers
      try {
        // @ts-ignore - For older browser support
        mediaQuery.addListener(listener);
      } catch (error) {
        // Silently fail if media query listener cannot be added
      }
    }
  }
}