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
  language?: string;
  lastUpdated?: string;
  updated_at?: string;
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

  // View and sorting options
  viewMode: 'grid' | 'list' = 'grid';
  sortBy: 'name' | 'updated' = 'name';
  sortOrder: 'asc' | 'desc' = 'asc';

  // Navigation items for the sidebar
  navItems: NavItem[] = [
    {
      label: 'Dashboard',
      icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 22V12H15V22" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      route: ['/dashboard']
    },
    {
      label: 'History',
      icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M12 6v6l4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
      route: ['/history']
    },
    // {
    //   label: 'My READMEs',
    //   icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 2V8H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 13H8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 17H8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 9H9H8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    //   route: ['/readmes']
    // },
    {
      label: 'Settings',
      icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" stroke-width="2"/></svg>',
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
                updated_at: updatedAt,
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
    this.applySortingAndFiltering();
  }

  /**
   * Clear search query
   */
  clearSearch(): void {
    this.searchQuery = '';
    this.applySortingAndFiltering();
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
  }

  /**
   * Calculate pagination based on filtered repositories
   */
  private calculatePagination(): void {
    this.totalPages = Math.ceil(this.filteredRepositories.length / this.itemsPerPage) || 1;
    this.currentPage = Math.min(this.currentPage, this.totalPages);
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
   * Change view mode between grid and list
   */
  setViewMode(mode: 'grid' | 'list'): void {
    this.viewMode = mode;
    // Adjust items per page based on view mode
    this.itemsPerPage = mode === 'grid' ? 6 : 10;
    this.currentPage = 1;
    this.calculatePagination();
    this.updateDisplayedRepositories();
    this.generatePageNumbers();
  }

  /**
   * Change sorting criteria
   */
  setSortBy(sortBy: 'name' | 'updated'): void {
    if (this.sortBy === sortBy) {
      // Toggle sort order if same field
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = sortBy;
      this.sortOrder = 'asc';
    }
    this.applySortingAndFiltering();
  }

  /**
   * Apply sorting and filtering to repositories
   */
  private applySortingAndFiltering(): void {
    // First apply search filter
    this.filteredRepositories = this.repositories.filter(repo =>
      repo.full_name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
      (repo.description && repo.description.toLowerCase().includes(this.searchQuery.toLowerCase()))
    );

    // Then apply sorting
    this.filteredRepositories.sort((a, b) => {
      let comparison = 0;

      switch (this.sortBy) {
        case 'name':
          comparison = a.full_name.localeCompare(b.full_name);
          break;
        case 'updated':
          // Use updated_at if available, otherwise fall back to name
          if (a.updated_at && b.updated_at) {
            comparison = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
          } else {
            comparison = a.full_name.localeCompare(b.full_name);
          }
          break;
      }

      return this.sortOrder === 'asc' ? comparison : -comparison;
    });

    this.currentPage = 1;
    this.calculatePagination();
    this.updateDisplayedRepositories();
    this.generatePageNumbers();
  }

  /**
   * Logout the current user
   */
  logout(): void {
    // console.log('Logging out...');
    // this.githubService.logout();
    this.authService.clearAuth();
  }
}
