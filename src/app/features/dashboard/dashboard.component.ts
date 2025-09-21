import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import { SidebarComponent } from '../../shared/components/sidebar/sidebar.component';
import { ThemeToggleComponent } from '../../shared/components/theme-toggle/theme-toggle.component';
import { AuthService } from '../../core/services/auth.service';
import { GithubService, Repository } from '../../core/services/github.service';
import { STORAGE_KEYS } from '../../core/constants/app.constants';

// Define the NavItem interface directly in the component file
interface NavItem {
  label: string;
  icon: string;
  route: string[];
  active?: boolean;
}

// Interface for repository display data
interface RepositoryDisplay {
  id: number;
  name: string;
  full_name: string;
  description: string;
  private: boolean;
  html_url: string;
  initialLetter: string;
  color: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, ThemeToggleComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  userName: string = '';
  installations: any[] = [];
  repositories: RepositoryDisplay[] = [];
  filteredRepositories: RepositoryDisplay[] = [];
  displayedRepositories: RepositoryDisplay[] = [];
  isLoading: boolean = true;
  hasError: boolean = false;
  sidebarCollapsed: boolean = false;
  searchQuery: string = '';
  currentPage: number = 1;
  itemsPerPage: number = 6;
  totalPages: number = 1;
  pageNumbers: number[] = [];
  generatingReadmes: { [key: number]: boolean } = {};
  isBrowser: boolean;

  // Navigation items for the sidebar
  navItems: NavItem[] = [
    {
      label: 'Dashboard',
      icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 22V12H15V22" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      route: ['/dashboard']
    },
    {
      label: 'History',
      icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 4V10H7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M3.51 15A9 9 0 1 0 6 5.3L1 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      route: ['/history']
    },
    // {
    //   label: 'My READMEs',
    //   icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 2V8H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 13H8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 17H8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 9H9H8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    //   route: ['/readmes']
    // },
    {
      label: 'Settings',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><!--!Font Awesome Free v7.0.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M259.1 73.5C262.1 58.7 275.2 48 290.4 48L350.2 48C365.4 48 378.5 58.7 381.5 73.5L396 143.5C410.1 149.5 423.3 157.2 435.3 166.3L503.1 143.8C517.5 139 533.3 145 540.9 158.2L570.8 210C578.4 223.2 575.7 239.8 564.3 249.9L511 297.3C511.9 304.7 512.3 312.3 512.3 320C512.3 327.7 511.8 335.3 511 342.7L564.4 390.2C575.8 400.3 578.4 417 570.9 430.1L541 481.9C533.4 495 517.6 501.1 503.2 496.3L435.4 473.8C423.3 482.9 410.1 490.5 396.1 496.6L381.7 566.5C378.6 581.4 365.5 592 350.4 592L290.6 592C275.4 592 262.3 581.3 259.3 566.5L244.9 496.6C230.8 490.6 217.7 482.9 205.6 473.8L137.5 496.3C123.1 501.1 107.3 495.1 99.7 481.9L69.8 430.1C62.2 416.9 64.9 400.3 76.3 390.2L129.7 342.7C128.8 335.3 128.4 327.7 128.4 320C128.4 312.3 128.9 304.7 129.7 297.3L76.3 249.8C64.9 239.7 62.3 223 69.8 209.9L99.7 158.1C107.3 144.9 123.1 138.9 137.5 143.7L205.3 166.2C217.4 157.1 230.6 149.5 244.6 143.4L259.1 73.5zM320.3 400C364.5 399.8 400.2 363.9 400 319.7C399.8 275.5 363.9 239.8 319.7 240C275.5 240.2 239.8 276.1 240 320.3C240.2 364.5 276.1 400.2 320.3 400z"/></svg>',
      route: ['/settings']
    }
  ];

  private subscriptions: Subscription = new Subscription();

  constructor(
    private authService: AuthService,
    private githubService: GithubService,
    private router: Router,
    private route: ActivatedRoute, // <-- inject ActivatedRoute here
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    // Make absolutely sure this variable is set correctly
    this.isBrowser = isPlatformBrowser(platformId);
    // console.log('Dashboard constructor - Platform ID:', platformId);
    // console.log('Dashboard constructor - isBrowser:', this.isBrowser);
  }

  ngOnInit(): void {
    // Check if a token exists in the query parameters
    this.route.queryParams.subscribe(params => {
      const token = params['token'];
      if (token) {
        // Immediately redirect to auth/callback with the token query parameter
        this.router.navigate(['/auth/callback'], { queryParams: { token } });
        return;
      }

      // Continue with the original Dashboard initialization if no token is present
      // console.log('Dashboard ngOnInit - isBrowser:', this.isBrowser);
      this.loadUserInfo();

      // Add a small delay to let the browser initialize fully
      if (typeof window !== 'undefined') {
        // console.log('Window is defined, scheduling auth check with delay');
        setTimeout(() => {
          // console.log('Running auth check after delay');
          this.checkAuthAndLoadRepositories();
        }, 100);
      } else {
        // console.log('Window not defined in ngOnInit, skipping auth check');
      }
    });

    if (this.isBrowser) {
      const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN) || '';
      this.authService.getCurrentUser(token).subscribe(user => {
        // this.currentUser = user;
      });
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  /**
   * Load the authenticated user's info
   */
  loadUserInfo(): void {
    if (this.isBrowser) {
      const user = localStorage.getItem('user_session');
      if (user) {
        try {
          const parsedUser = JSON.parse(user);
          this.userName = parsedUser?.username || 'Guest';
          // console.log('Loaded user info:', this.userName);
        } catch (error) {
          console.error('Error parsing user info from localStorage:', error);
          this.userName = 'Guest';
        }
      }
    }
  }

  /**
   * Check authentication and load installations and repositories
   */
  checkAuthAndLoadRepositories(): void {
    // Check if window object exists (most reliable way to check for browser environment)
    const isWindowDefined = typeof window !== 'undefined';

    // console.log('checkAuthAndLoadRepositories - Window defined check:', isWindowDefined);
    // console.log('checkAuthAndLoadRepositories - isBrowser property:', this.isBrowser);

    if (!isWindowDefined) {
      // console.log('Not in browser environment, skipping auth check');
      this.isLoading = false;
      return;
    }

    this.isLoading = true;

    const authSub = this.authService.isAuthenticated().subscribe({
      next: (isAuthenticated) => {
        // console.log('Authentication check result:', isAuthenticated);

        if (isAuthenticated) {
          // console.log('User is authenticated, getting installations...');
          this.loadRepositories();
        } else {
          // console.log('User not authenticated, showing empty state');
          this.isLoading = false;
        }
      },
      error: (error) => {
        console.error('Authentication check failed:', error);
        this.isLoading = false;
        this.hasError = true;
      }
    });

    this.subscriptions.add(authSub);
  }

  /**
   * Load installations and then repositories for the first installation
   */
  loadRepositories(): void {
    this.isLoading = true;
    try {
      // console.log('Fetching repositories...');
      const reposSub = this.githubService.getRepositories().subscribe({
        next: (repositoriesResponse) => {
          // console.log('Repositories response received:', repositoriesResponse);
          this.installations = repositoriesResponse.repositories;
          if (repositoriesResponse.repositories && repositoriesResponse.repositories.length > 0) {
            // Map the repositories to the display format
            this.repositories = repositoriesResponse.repositories.map(repo => {
              const id: number = typeof repo.id === 'number' ? repo.id : parseInt(repo.id, 10);
              const name: string = repo.name || '';
              const full_name: string = repo.full_name || '';
              const description: string = repo.description || 'No description available';
              const private_repo: boolean = repo.private || false;
              const html_url: string = repo.html_url || '';
              const updatedAt: string = repo.updated_at || '';
              const language: string = repo.language || 'Unknown';
              return {
                id,
                name,
                full_name,
                description,
                private: private_repo,
                html_url,
                language,
                lastUpdated: this.formatDate(updatedAt),
                initialLetter: name.charAt(0).toUpperCase(),
                color: this.getColorForLanguage(language)
              };
            });
            this.filterRepositories();
            this.isLoading = false;
          } else {
            this.repositories = [];
            this.filteredRepositories = [];
            this.displayedRepositories = [];
            this.totalPages = 1;
            this.pageNumbers = [1];
            // console.log('No repositories found, showing empty state');
            this.isLoading = false;
          }
        },
        error: (error) => {
          console.error('Failed to load repositories:', error);
          this.isLoading = false;
          this.hasError = true;
        }
      });
      this.subscriptions.add(reposSub);
    } catch (error) {
      console.error('Error in loadRepositories:', error);
      this.isLoading = false;
      this.hasError = true;
    }
  }

  /**
   * Filter repositories based on search query
   */
  filterRepositories(): void {
    if (!this.searchQuery) {
      this.filteredRepositories = [...this.repositories];
    } else {
      const query = this.searchQuery.toLowerCase();
      this.filteredRepositories = this.repositories.filter(repo =>
        repo.name.toLowerCase().includes(query) ||
        repo.full_name.toLowerCase().includes(query) ||
        repo.description.toLowerCase().includes(query)
      );
    }

    // Update pagination
    this.totalPages = Math.ceil(this.filteredRepositories.length / this.itemsPerPage) || 1;
    this.currentPage = Math.min(this.currentPage, this.totalPages);
    this.updateDisplayedRepositories();
    this.generatePageNumbers();

    // console.log(`Filtered repositories: ${this.filteredRepositories.length}, total pages: ${this.totalPages}`);
  }

  /**
   * Clear search query
   */
  clearSearch(): void {
    this.searchQuery = '';
    this.filterRepositories();
  }

  /**
   * Update the repositories displayed on the current page
   */
  updateDisplayedRepositories(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    this.displayedRepositories = this.filteredRepositories.slice(
      startIndex,
      startIndex + this.itemsPerPage
    );

    // console.log(`Displaying repositories ${startIndex + 1} to ${startIndex + this.displayedRepositories.length}`);
  }

  /**
   * Generate page numbers for pagination
   */
  generatePageNumbers(): void {
    this.pageNumbers = [];

    if (this.totalPages <= 7) {
      // If we have 7 or fewer pages, show all page numbers
      for (let i = 1; i <= this.totalPages; i++) {
        this.pageNumbers.push(i);
      }
    } else {
      // Always include first page
      this.pageNumbers.push(1);

      if (this.currentPage > 3) {
        // Add ellipsis if current page is far from start
        this.pageNumbers.push(-1); // -1 represents ellipsis
      }

      // Add pages around current page
      const start = Math.max(2, this.currentPage - 1);
      const end = Math.min(this.totalPages - 1, this.currentPage + 1);

      for (let i = start; i <= end; i++) {
        this.pageNumbers.push(i);
      }

      if (this.currentPage < this.totalPages - 2) {
        // Add ellipsis if current page is far from end
        this.pageNumbers.push(-2); // -2 represents ellipsis (to differentiate from first ellipsis)
      }

      // Always include last page
      this.pageNumbers.push(this.totalPages);
    }
  }

  /**
   * Navigate to a specific page
   */
  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) {
      return;
    }

    this.currentPage = page;
    this.updateDisplayedRepositories();
    this.generatePageNumbers();
  }

  /**
   * Format the date relative to now (e.g., "today", "yesterday", "2 days ago")
   */
  formatDate(dateString: string): string {
    if (!dateString) return 'Unknown';

    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'today';
    } else if (diffDays === 1) {
      return 'yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} ${months === 1 ? 'month' : 'months'} ago`;
    } else {
      const years = Math.floor(diffDays / 365);
      return `${years} ${years === 1 ? 'year' : 'years'} ago`;
    }
  }

  /**
   * Get a color based on the programming language
   */
  getColorForLanguage(language: string): string {
    if (!language) return '#CCCCCC';

    // Common language colors (similar to GitHub's language colors)
    const languageColors: { [key: string]: string } = {
      JavaScript: '#f1e05a',
      TypeScript: '#3178c6',
      Python: '#3572A5',
      Java: '#b07219',
      CSharp: '#178600',
      'C#': '#178600',
      PHP: '#4F5D95',
      Ruby: '#701516',
      Go: '#00ADD8',
      Swift: '#F05138',
      Kotlin: '#A97BFF',
      Rust: '#DEA584',
      HTML: '#e34c26',
      CSS: '#563d7c',
      Shell: '#89e051'
    };

    // Return known language color or generate one from the name
    if (languageColors[language]) {
      return languageColors[language];
    } else {
      // Generate a color based on the language name
      let hash = 0;
      for (let i = 0; i < language.length; i++) {
        hash = language.charCodeAt(i) + ((hash << 5) - hash);
      }

      let color = '#';
      for (let i = 0; i < 3; i++) {
        const value = (hash >> (i * 8)) & 0xFF;
        color += ('00' + value.toString(16)).substr(-2);
      }

      return color;
    }
  }

  /**
   * Initiate GitHub OAuth authentication
   */
  connectGitHub(): void {
    // console.log('Connecting to GitHub...');
    this.githubService.loginWithGitHub();
  }

  /**
   * Initiate GitHub App installation
   */
  connectRepository(): void {
    // console.log('Installing GitHub App...');
    this.githubService.installGitHubApp();
  }

  /**
   * Handle the change in sidebar collapsed state
   */
  onSidebarCollapsedChange(collapsed: boolean): void {
    this.sidebarCollapsed = collapsed;
  }

  /**
   * Generate a README for a repository
   */
  generateReadme(repoUrl: string): void {
    this.router.navigate(['/generate-readme', encodeURIComponent(repoUrl)]);
  }

  /**
   * Retry loading repositories after an error
   */
  retryLoading(): void {
    // console.log('Retrying repository loading...');
    this.hasError = false;
    this.checkAuthAndLoadRepositories();
  }

  /**
   * Logout the current user
   */
  logout(): void {
    // console.log('Logging out...');
    this.githubService.logout();
  }
}
