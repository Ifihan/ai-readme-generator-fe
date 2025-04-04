// src/app/features/landing/landing.component.ts
import { Component, OnInit, PLATFORM_ID, Inject, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { GithubService } from '../../core/services/github.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-landing',
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.css'],
  standalone: true,
  imports: [CommonModule, RouterModule]
})
export class LandingComponent implements OnInit, AfterViewInit {
  @ViewChild('logoImg') logoImg!: ElementRef;
  @ViewChild('demoImg') demoImg!: ElementRef;
  @ViewChild('footerLogoImg') footerLogoImg!: ElementRef;
  
  // Image loading flags
  imageLoaded = false;
  demoImageLoaded = false;
  footerImageLoaded = false;
  
  // Current year for copyright
  currentYear = new Date().getFullYear();

  features = [
    {
      title: 'GitHub Integration',
      description: 'Seamlessly connect with your GitHub repositories',
      icon: 'github'
    },
    {
      title: 'AI-Powered Generation',
      description: 'Create comprehensive READMEs based on your code',
      icon: 'lightbulb' // Replaced sparkles with lightbulb
    },
    {
      title: 'Markdown Export',
      description: 'Download or push directly to your repository',
      icon: 'download'
    }
  ];

  steps = [
    {
      number: 1,
      title: 'Sign in with GitHub',
      description: 'Connect your GitHub account securely',
      icon: 'github'
    },
    {
      number: 2,
      title: 'Select Repository',
      description: 'Choose the repository you want to create a README for',
      icon: 'folder'
    },
    {
      number: 3,
      title: 'Generate README',
      description: 'Our AI will analyze your code and generate a comprehensive README',
      icon: 'lightbulb' // Replaced sparkles with lightbulb
    },
    {
      number: 4,
      title: 'Download or Push',
      description: 'Save the README locally or push directly to your repository',
      icon: 'download'
    }
  ];

  // Placeholder for GitHub stats
  githubStats = {
    stars: 256,
    forks: 42,
    contributors: 12
  };
  
  currentTheme: 'light' | 'dark' | 'system' = 'system';
  isBrowser: boolean;

  constructor(
    private githubService: GithubService,
    private authService: AuthService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      this.initTheme();
    }
  }
  
  ngAfterViewInit(): void {
    // Setup smooth scrolling after view is initialized
    if (this.isBrowser) {
      setTimeout(() => {
        this.setupSmoothScrolling();
      }, 100);
    }
  }
  
  initTheme(): void {
    // Only run in browser environment
    if (!this.isBrowser) return;
    
    // Check for saved theme preference, default to system if not found
    try {
      const savedTheme = localStorage.getItem('theme') || 'system';
      this.setTheme(savedTheme as 'light' | 'dark' | 'system');
    } catch (error) {
      console.warn('Could not access localStorage:', error);
      this.setTheme('system');
    }
  }

  setTheme(theme: 'light' | 'dark' | 'system'): void {
    if (!this.isBrowser) return;
    
    this.currentTheme = theme;
    
    try {
      localStorage.setItem('theme', theme);
    } catch (error) {
      console.warn('Could not write to localStorage:', error);
    }
    
    document.documentElement.setAttribute('data-theme', theme);
    
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', prefersDark);
    } else {
      document.documentElement.classList.toggle('dark', theme === 'dark');
    }
  }

  setupSmoothScrolling(): void {
    // Add advanced smooth scrolling for all anchor links
    const navLinks = document.querySelectorAll('a[href^="#"]');
    
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        
        const targetId = (link as HTMLAnchorElement).getAttribute('href') || '';
        if (targetId === '#') return; // Skip empty links
        
        const targetElement = document.querySelector(targetId);
        
        if (targetElement) {
          // Calculate position with an offset for the header
          const headerHeight = document.querySelector('.header')?.clientHeight || 0;
          const targetPosition = targetElement.getBoundingClientRect().top + window.scrollY - headerHeight - 20;
          
          // Animate scroll
          window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
          });
          
          // Highlight the active nav link
          navLinks.forEach(navLink => {
            navLink.classList.remove('active');
          });
          link.classList.add('active');
          
          // Update URL without causing a page jump
          window.history.pushState(null, '', targetId);
        }
      });
    });
    
    // Add scroll spy to highlight the current section in the navigation
    window.addEventListener('scroll', this.scrollSpy.bind(this));
  }
  
  scrollSpy(): void {
    // Get all sections and calculate which one is currently in view
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');
    
    sections.forEach(section => {
      const sectionTop = section.getBoundingClientRect().top;
      const headerHeight = document.querySelector('.header')?.clientHeight || 0;
      
      // Check if section is in viewport (with offset for header)
      if (sectionTop <= headerHeight + 100 && sectionTop >= 0) {
        // Get the corresponding nav link
        const targetId = '#' + section.id;
        navLinks.forEach(link => {
          if ((link as HTMLAnchorElement).getAttribute('href') === targetId) {
            link.classList.add('active');
          } else {
            link.classList.remove('active');
          }
        });
      }
    });
  }

  signInWithGitHub(): void {
    this.authService.loginWithGitHub();
  }
  
  // Image error handlers
  handleImageError(event: Event): void {
    this.imageLoaded = false;
    console.warn('Logo image failed to load');
  }
  
  handleDemoImageError(event: Event): void {
    this.demoImageLoaded = false;
    console.warn('Demo image failed to load');
  }
  
  handleFooterImageError(event: Event): void {
    this.footerImageLoaded = false;
    console.warn('Footer logo image failed to load');
  }
}