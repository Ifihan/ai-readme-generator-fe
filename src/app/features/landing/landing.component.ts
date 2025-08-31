// src/app/features/landing/landing.component.ts
import { Component, OnInit, PLATFORM_ID, Inject, ViewChild, ElementRef, AfterViewInit, HostListener } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { GithubService } from '../../core/services/github.service';
import { AuthService } from '../../core/services/auth.service';
import { ThemeToggleComponent } from '../../shared/components/theme-toggle/theme-toggle.component';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-landing',
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.css'],
  standalone: true,
  imports: [CommonModule, RouterModule, ThemeToggleComponent] // Add ThemeToggleComponent to imports
})
export class LandingComponent implements OnInit, AfterViewInit {
  @ViewChild('logoImg') logoImg!: ElementRef;
  @ViewChild('demoImg') demoImg!: ElementRef;
  @ViewChild('footerLogoImg') footerLogoImg!: ElementRef;

  // Image loading flags
  imageLoaded = false;
  demoImageLoaded = false;
  footerImageLoaded = false;

  // Mobile menu state
  mobileMenuOpen = false;

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
      icon: 'lightbulb' // Using lightbulb instead of sparkles
    },
    {
      title: 'Markdown Export',
      description: 'Download or push directly to your repository',
      icon: 'branch'
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
      icon: 'lightbulb' // Using lightbulb instead of sparkles
    },
    {
      number: 4,
      title: 'Download or Push',
      description: 'Save the README locally or push directly to your repository',
      icon: 'branch'
    }
  ];

  // GitHub repository configurations
  repositories = {
    frontend: { owner: 'Ifihan', repo: 'ai-readme-generator-fe' },
    backend: { owner: 'Ifihan', repo: 'ai-readme-generator-be' }
  };

  // Repository stats
  repoStats = {
    frontend: { stars: 0, forks: 0, name: 'Frontend', html_url: '' },
    backend: { stars: 0, forks: 0, name: 'Backend', html_url: '' }
  };

  // Combined stats for header display
  totalStats = {
    stars: 0,
    forks: 0
  };

  // Dropdown states
  showStarsDropdown = false;
  showForksDropdown = false;
  showContributeDropdown = false;

  // Just keep isBrowser for conditional rendering
  isBrowser: boolean;

  constructor(
    private githubService: GithubService,
    private authService: AuthService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    // Theme initialization is now handled by ThemeToggleComponent
    if (this.isBrowser) {
      this.loadGitHubStats();
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

          // Close mobile menu if open
          this.closeMobileMenu();

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
    // Unified OAuth login
    this.authService.login().subscribe();
  }

  handleGitHubLogin(): void {
    console.log('Login button clicked');
    if (this.isBrowser) {
      this.authService.login().subscribe();
    } else {
      console.warn('Cannot navigate: not in browser environment');
    }
  }

  // Mobile menu methods
  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;

    // Prevent scrolling when menu is open
    if (this.mobileMenuOpen) {
      document.body.classList.add('menu-open');
      document.body.style.overflow = 'hidden';
    } else {
      document.body.classList.remove('menu-open');
      document.body.style.overflow = '';
    }
  }

  closeMobileMenu(): void {
    if (this.mobileMenuOpen) {
      this.mobileMenuOpen = false;
      document.body.classList.remove('menu-open');
      document.body.style.overflow = '';
    }
  }

  // Close mobile menu when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    // Check if click is outside of mobile menu and menu button
    if (this.mobileMenuOpen) {
      const mobileMenuElement = document.querySelector('.mobile-nav');
      const menuButtonElement = document.querySelector('.mobile-menu-button');

      if (mobileMenuElement && menuButtonElement) {
        const isClickInside = mobileMenuElement.contains(event.target as Node) ||
          menuButtonElement.contains(event.target as Node);

        if (!isClickInside) {
          this.closeMobileMenu();
        }
      }
    }
  }

  // Close mobile menu on resize if screen becomes large enough
  @HostListener('window:resize')
  onResize(): void {
    if (window.innerWidth > 600 && this.mobileMenuOpen) {
      this.closeMobileMenu();
    }
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


  // Load GitHub repository statistics
  loadGitHubStats(): void {
    const frontendStats$ = this.githubService.getRepositoryStats(
      this.repositories.frontend.owner, 
      this.repositories.frontend.repo
    );
    const backendStats$ = this.githubService.getRepositoryStats(
      this.repositories.backend.owner, 
      this.repositories.backend.repo
    );

    forkJoin([frontendStats$, backendStats$]).subscribe({
      next: ([frontendData, backendData]) => {
        this.repoStats.frontend = {
          stars: frontendData.stars,
          forks: frontendData.forks,
          name: 'Frontend',
          html_url: frontendData.html_url
        };
        this.repoStats.backend = {
          stars: backendData.stars,
          forks: backendData.forks,
          name: 'Backend',
          html_url: backendData.html_url
        };

        this.totalStats.stars = this.repoStats.frontend.stars + this.repoStats.backend.stars;
        this.totalStats.forks = this.repoStats.frontend.forks + this.repoStats.backend.forks;
      },
      error: (error) => {
        console.error('Error loading GitHub stats:', error);
        // Fallback to demo numbers
        this.totalStats = { stars: 256, forks: 42 };
        this.repoStats.frontend = { stars: 200, forks: 30, name: 'Frontend', html_url: '' };
        this.repoStats.backend = { stars: 56, forks: 12, name: 'Backend', html_url: '' };
      }
    });
  }

  // Dropdown interaction methods
  toggleStarsDropdown(): void {
    this.showStarsDropdown = !this.showStarsDropdown;
    this.showForksDropdown = false;
    this.showContributeDropdown = false;
  }

  toggleForksDropdown(): void {
    this.showForksDropdown = !this.showForksDropdown;
    this.showStarsDropdown = false;
    this.showContributeDropdown = false;
  }

  toggleContributeDropdown(): void {
    this.showContributeDropdown = !this.showContributeDropdown;
    this.showStarsDropdown = false;
    this.showForksDropdown = false;
  }

  hideDropdowns(): void {
    this.showStarsDropdown = false;
    this.showForksDropdown = false;
    this.showContributeDropdown = false;
  }

  navigateToRepo(type: 'frontend' | 'backend', action: 'star' | 'fork' | 'contribute'): void {
    const repo = this.repoStats[type];
    if (repo.html_url) {
      let url = repo.html_url;
      if (action === 'fork') {
        url = `${repo.html_url}/fork`;
      } else if (action === 'contribute') {
        url = `${repo.html_url}/issues`;
      }
      window.open(url, '_blank');
    }
    this.hideDropdowns();
  }
}