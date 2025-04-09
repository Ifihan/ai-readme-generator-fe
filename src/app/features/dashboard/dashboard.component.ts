// import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
// import { CommonModule, isPlatformBrowser } from '@angular/common';
// import { Router } from '@angular/router';
// import { FormsModule } from '@angular/forms';
// import { Subscription } from 'rxjs';

// import { SidebarComponent } from '../../shared/components/sidebar/sidebar.component';
// import { ThemeToggleComponent } from '../../shared/components/theme-toggle/theme-toggle.component';
// import { AuthService } from '../../core/services/auth.service';
// import { GithubService, Repository } from '../../core/services/github.service';

// // Define the NavItem interface directly in the component file
// interface NavItem {
//   label: string;
//   icon: string;
//   route: string[];
//   active?: boolean;
// }

// // Interface for repository display data
// interface RepositoryDisplay {
//   id: number;
//   name: string;
//   lastUpdated: string;
//   language: string;
//   initialLetter: string;
//   color: string;
// }

// @Component({
//   selector: 'app-dashboard',
//   standalone: true,
//   imports: [CommonModule, FormsModule, SidebarComponent, ThemeToggleComponent],
//   templateUrl: './dashboard.component.html',
//   styleUrls: ['./dashboard.component.css']
// })
// export class DashboardComponent implements OnInit, OnDestroy {
//   userName: string = '';
//   installations: any[] = [];
//   repositories: RepositoryDisplay[] = [];
//   filteredRepositories: RepositoryDisplay[] = [];
//   displayedRepositories: RepositoryDisplay[] = [];
//   isLoading: boolean = true;
//   hasError: boolean = false;
//   sidebarCollapsed: boolean = false;
//   searchQuery: string = '';
//   currentPage: number = 1;
//   itemsPerPage: number = 6;
//   totalPages: number = 1;
//   pageNumbers: number[] = [];
//   generatingReadmes: { [key: number]: boolean } = {};
//   isBrowser: boolean;

//   // Navigation items for the sidebar
//   navItems: NavItem[] = [
//     { label: 'Dashboard', icon: 'home', route: ['/dashboard'], active: true },
//     { label: 'My READMEs', icon: 'file-text', route: ['/readmes'] },
//     { label: 'Settings', icon: 'settings', route: ['/settings'] }
//   ];

//   private subscriptions: Subscription = new Subscription();

//   constructor(
//     private authService: AuthService,
//     private githubService: GithubService,
//     private router: Router,
//     @Inject(PLATFORM_ID) private platformId: Object
//   ) {
//     this.isBrowser = isPlatformBrowser(this.platformId);
//   }

//   ngOnInit(): void {
//     this.loadUserInfo();
//     this.checkAuthAndLoadRepositories();
//   }

//   ngOnDestroy(): void {
//     this.subscriptions.unsubscribe();
//   }

//   /**
//    * Load the authenticated user's info
//    */
//   loadUserInfo(): void {
//     const userSub = this.authService.getUser().subscribe({
//       next: (user) => {
//         this.userName = user?.username || 'Guest';
//       },
//       error: (error) => {
//         console.error('Error loading user info:', error);
//         this.userName = 'Guest';
//       }
//     });
//     this.subscriptions.add(userSub);
//   }

//   /**
//    * Check authentication and load installations and repositories
//    */


//   checkAuthAndLoadRepositories(): void {
//     // First check if we're in browser environment
//     if (!this.isBrowser) {
//       console.log('Not in browser environment, skipping auth check');
//       this.isLoading = false;
//       return;
//     }
  
//     this.isLoading = true;
    
//     const authSub = this.authService.isAuthenticated().subscribe({
//       next: (isAuthenticated) => {
//         if (isAuthenticated) {
//           console.log('User is authenticated, getting installations...');
//           this.loadInstallationsAndRepositories();
//         } else {
//           console.log('User is not authenticated, showing empty state');
//           this.isLoading = false;
//         }
//       },
//       error: (error) => {
//         console.error('Authentication check failed:', error);
//         this.isLoading = false;
//         this.hasError = true;
//       }
//     });
  
//     this.subscriptions.add(authSub);
//   }

//   /**
//    * Load installations and then repositories for the first installation
//    */
//   loadInstallationsAndRepositories(): void {
//     this.isLoading = true;
    
//     try {
//       // Add this log to check if we're getting installations
//       console.log('Fetching GitHub app installations...');
      
//       const installationsSub = this.githubService.getInstallations().subscribe({
//         next: (installations) => {
//           console.log('Installations received:', installations);
//           this.installations = installations;
          
//           if (installations && installations.length > 0) {
//             // Load repositories for the first installation
//             console.log(`Loading repositories for installation ${installations[0].id}...`);
//             this.loadRepositories(installations[0].id);
//           } else {
//             console.log('No installations found, showing empty state');
//             this.isLoading = false;
//           }
//         },
//         error: (error) => {
//           console.error('Failed to load installations:', error);
//           this.isLoading = false;
//           this.hasError = true;
//         }
//       });

//       this.subscriptions.add(installationsSub);
//     } catch (error) {
//       console.error('Error in loadInstallationsAndRepositories:', error);
//       this.isLoading = false;
//       this.hasError = true;
//     }
//   }

//   /**
//    * Load repositories for a specific installation
//    */
//   loadRepositories(installationId: string): void {
//     console.log(`Fetching repositories for installation ${installationId}...`);
    
//     try {
//       const reposSub = this.githubService.getInstallationRepositories(installationId).subscribe({
//         next: (repos) => {
//           console.log('Repositories received:', repos);
          
//           // Map the repositories to the display format
//           this.repositories = repos.map(repo => ({
//             id: repo.id,
//             name: repo.name,
//             lastUpdated: this.formatDate(repo.updated_at),
//             language: repo.language || 'Unknown',
//             initialLetter: repo.name.charAt(0).toUpperCase(),
//             color: this.getColorForLanguage(repo.language)
//           }));
          
//           console.log('Processed repositories:', this.repositories);
          
//           // Initialize filtered repositories
//           this.filterRepositories();
//           this.isLoading = false;
//         },
//         error: (error) => {
//           console.error('Failed to load repositories:', error);
//           this.isLoading = false;
//           this.hasError = true;
//         }
//       });

//       this.subscriptions.add(reposSub);
//     } catch (error) {
//       console.error('Error in loadRepositories:', error);
//       this.isLoading = false;
//       this.hasError = true;
//     }
//   }

//   /**
//    * Filter repositories based on search query
//    */
//   filterRepositories(): void {
//     if (!this.searchQuery) {
//       this.filteredRepositories = [...this.repositories];
//     } else {
//       const query = this.searchQuery.toLowerCase();
//       this.filteredRepositories = this.repositories.filter(repo => 
//         repo.name.toLowerCase().includes(query) || 
//         repo.language.toLowerCase().includes(query)
//       );
//     }
    
//     // Update pagination
//     this.totalPages = Math.ceil(this.filteredRepositories.length / this.itemsPerPage) || 1;
//     this.currentPage = Math.min(this.currentPage, this.totalPages);
//     this.updateDisplayedRepositories();
//     this.generatePageNumbers();
    
//     console.log(`Filtered repositories: ${this.filteredRepositories.length}, total pages: ${this.totalPages}`);
//   }

//   /**
//    * Clear search query
//    */
//   clearSearch(): void {
//     this.searchQuery = '';
//     this.filterRepositories();
//   }

//   /**
//    * Update the repositories displayed on the current page
//    */
//   updateDisplayedRepositories(): void {
//     const startIndex = (this.currentPage - 1) * this.itemsPerPage;
//     this.displayedRepositories = this.filteredRepositories.slice(
//       startIndex, 
//       startIndex + this.itemsPerPage
//     );
    
//     console.log(`Displaying repositories ${startIndex+1} to ${startIndex+this.displayedRepositories.length}`);
//   }

//   /**
//    * Generate page numbers for pagination
//    */
//   generatePageNumbers(): void {
//     this.pageNumbers = [];
    
//     if (this.totalPages <= 7) {
//       // If we have 7 or fewer pages, show all page numbers
//       for (let i = 1; i <= this.totalPages; i++) {
//         this.pageNumbers.push(i);
//       }
//     } else {
//       // Always include first page
//       this.pageNumbers.push(1);
      
//       if (this.currentPage > 3) {
//         // Add ellipsis if current page is far from start
//         this.pageNumbers.push(-1); // -1 represents ellipsis
//       }
      
//       // Add pages around current page
//       const start = Math.max(2, this.currentPage - 1);
//       const end = Math.min(this.totalPages - 1, this.currentPage + 1);
      
//       for (let i = start; i <= end; i++) {
//         this.pageNumbers.push(i);
//       }
      
//       if (this.currentPage < this.totalPages - 2) {
//         // Add ellipsis if current page is far from end
//         this.pageNumbers.push(-2); // -2 represents ellipsis (to differentiate from first ellipsis)
//       }
      
//       // Always include last page
//       this.pageNumbers.push(this.totalPages);
//     }
//   }

//   /**
//    * Navigate to a specific page
//    */
//   goToPage(page: number): void {
//     if (page < 1 || page > this.totalPages) {
//       return;
//     }
    
//     this.currentPage = page;
//     this.updateDisplayedRepositories();
//     this.generatePageNumbers();
//   }

//   /**
//    * Format the date relative to now (e.g., "today", "yesterday", "2 days ago")
//    */
//   formatDate(dateString: string): string {
//     if (!dateString) return 'Unknown';
    
//     const date = new Date(dateString);
//     const now = new Date();
//     const diffTime = Math.abs(now.getTime() - date.getTime());
//     const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
//     if (diffDays === 0) {
//       return 'today';
//     } else if (diffDays === 1) {
//       return 'yesterday';
//     } else if (diffDays < 7) {
//       return `${diffDays} days ago`;
//     } else if (diffDays < 30) {
//       const weeks = Math.floor(diffDays / 7);
//       return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
//     } else if (diffDays < 365) {
//       const months = Math.floor(diffDays / 30);
//       return `${months} ${months === 1 ? 'month' : 'months'} ago`;
//     } else {
//       const years = Math.floor(diffDays / 365);
//       return `${years} ${years === 1 ? 'year' : 'years'} ago`;
//     }
//   }

//   /**
//    * Get a color based on the programming language
//    */
//   getColorForLanguage(language: string): string {
//     if (!language) return '#CCCCCC';
    
//     // Common language colors (similar to GitHub's language colors)
//     const languageColors: { [key: string]: string } = {
//       JavaScript: '#f1e05a',
//       TypeScript: '#3178c6',
//       Python: '#3572A5',
//       Java: '#b07219',
//       CSharp: '#178600',
//       'C#': '#178600',
//       PHP: '#4F5D95',
//       Ruby: '#701516',
//       Go: '#00ADD8',
//       Swift: '#F05138',
//       Kotlin: '#A97BFF',
//       Rust: '#DEA584',
//       HTML: '#e34c26',
//       CSS: '#563d7c',
//       Shell: '#89e051'
//     };
    
//     // Return known language color or generate one from the name
//     if (languageColors[language]) {
//       return languageColors[language];
//     } else {
//       // Generate a color based on the language name
//       let hash = 0;
//       for (let i = 0; i < language.length; i++) {
//         hash = language.charCodeAt(i) + ((hash << 5) - hash);
//       }
      
//       let color = '#';
//       for (let i = 0; i < 3; i++) {
//         const value = (hash >> (i * 8)) & 0xFF;
//         color += ('00' + value.toString(16)).substr(-2);
//       }
      
//       return color;
//     }
//   }

//   /**
//    * Initiate GitHub OAuth authentication
//    */
//   connectGitHub(): void {
//     console.log('Connecting to GitHub...');
//     this.githubService.loginWithGitHub();
//   }

//   /**
//    * Initiate GitHub App installation
//    */
//   connectRepository(): void {
//     console.log('Installing GitHub App...');
//     this.githubService.installGitHubApp();
//   }

//   /**
//    * Handle the change in sidebar collapsed state
//    */
//   onSidebarCollapsedChange(collapsed: boolean): void {
//     this.sidebarCollapsed = collapsed;
//   }

//   /**
//    * Generate a README for a repository
//    */
//   generateReadme(repositoryId: number): void {
//     console.log(`Generating README for repository ID ${repositoryId}...`);
//     this.generatingReadmes[repositoryId] = true;
    
//     const generateSub = this.githubService.generateReadme(repositoryId).subscribe({
//       next: (response) => {
//         console.log('README generated successfully:', response);
//         this.generatingReadmes[repositoryId] = false;
        
//         // Navigate to the new README
//         if (response && response.id) {
//           this.router.navigate(['/readmes', response.id]);
//         }
//       },
//       error: (error) => {
//         console.error('Failed to generate README:', error);
//         this.generatingReadmes[repositoryId] = false;
//       }
//     });
    
//     this.subscriptions.add(generateSub);
//   }

//   /**
//    * Retry loading repositories after an error
//    */
//   retryLoading(): void {
//     console.log('Retrying repository loading...');
//     this.hasError = false;
//     this.checkAuthAndLoadRepositories();
//   }

//   /**
//    * Logout the current user
//    */
//   logout(): void {
//     console.log('Logging out...');
//     this.githubService.logout();
//   }
// }


import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import { SidebarComponent } from '../../shared/components/sidebar/sidebar.component';
import { ThemeToggleComponent } from '../../shared/components/theme-toggle/theme-toggle.component';
import { AuthService } from '../../core/services/auth.service';
import { GithubService, Repository } from '../../core/services/github.service';

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
  lastUpdated: string;
  language: string;
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
    { label: 'Dashboard', icon: 'home', route: ['/dashboard'], active: true },
    { label: 'My READMEs', icon: 'file-text', route: ['/readmes'] },
    { label: 'Settings', icon: 'settings', route: ['/settings'] }
  ];

  private subscriptions: Subscription = new Subscription();

  constructor(
    private authService: AuthService,
    private githubService: GithubService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    // Make absolutely sure this variable is set correctly
    this.isBrowser = isPlatformBrowser(platformId);
    console.log('Dashboard constructor - Platform ID:', platformId);
    console.log('Dashboard constructor - isBrowser:', this.isBrowser);
  }

  ngOnInit(): void {
    console.log('Dashboard ngOnInit - isBrowser:', this.isBrowser);
    this.loadUserInfo();
    
    // Add a small delay to let the browser initialize fully
    if (typeof window !== 'undefined') {
      console.log('Window is defined, scheduling auth check with delay');
      setTimeout(() => {
        console.log('Running auth check after delay');
        this.checkAuthAndLoadRepositories();
      }, 100);
    } else {
      console.log('Window not defined in ngOnInit, skipping auth check');
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  /**
   * Load the authenticated user's info
   */
  loadUserInfo(): void {
    console.log('Loading user info');
    const userSub = this.authService.getUser().subscribe({
      next: (user) => {
        console.log('User info loaded:', user);
        this.userName = user?.username || 'Guest';
      },
      error: (error) => {
        console.error('Error loading user info:', error);
        this.userName = 'Guest';
      }
    });
    this.subscriptions.add(userSub);
  }

  /**
   * Check authentication and load installations and repositories
   */
  checkAuthAndLoadRepositories(): void {
    // Check if window object exists (most reliable way to check for browser environment)
    const isWindowDefined = typeof window !== 'undefined';
    
    console.log('checkAuthAndLoadRepositories - Window defined check:', isWindowDefined);
    console.log('checkAuthAndLoadRepositories - isBrowser property:', this.isBrowser);
    
    if (!isWindowDefined) {
      console.log('Not in browser environment, skipping auth check');
      this.isLoading = false;
      return;
    }
  
    this.isLoading = true;
    
    const authSub = this.authService.isAuthenticated().subscribe({
      next: (isAuthenticated) => {
        console.log('Authentication check result:', isAuthenticated);
        
        if (isAuthenticated) {
          console.log('User is authenticated, getting installations...');
          this.loadInstallationsAndRepositories();
        } else {
          console.log('User not authenticated, showing empty state');
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
  loadInstallationsAndRepositories(): void {
    this.isLoading = true;
    
    try {
      console.log('Fetching GitHub app installations...');
      
      const installationsSub = this.githubService.getInstallations().subscribe({
        next: (installations) => {
          console.log('Installations received:', installations);
          this.installations = installations;
          
          if (installations && installations.length > 0) {
            // Load repositories for the first installation
            console.log(`Loading repositories for installation ${installations[0].id}...`);
            this.loadRepositories(installations[0].id);
          } else {
            console.log('No installations found, showing empty state');
            this.isLoading = false;
          }
        },
        error: (error) => {
          console.error('Failed to load installations:', error);
          this.isLoading = false;
          this.hasError = true;
        }
      });

      this.subscriptions.add(installationsSub);
    } catch (error) {
      console.error('Error in loadInstallationsAndRepositories:', error);
      this.isLoading = false;
      this.hasError = true;
    }
  }

  /**
   * Load repositories for a specific installation
   */
  loadRepositories(installationId: string): void {
    console.log(`Fetching repositories for installation ${installationId}...`);
    
    try {
      const reposSub = this.githubService.getInstallationRepositories(installationId).subscribe({
        next: (repos) => {
          console.log('Repositories received:', repos);
          
          // Map the repositories to the display format
          this.repositories = repos.map(repo => ({
            id: repo.id,
            name: repo.name,
            lastUpdated: this.formatDate(repo.updated_at),
            language: repo.language || 'Unknown',
            initialLetter: repo.name.charAt(0).toUpperCase(),
            color: this.getColorForLanguage(repo.language)
          }));
          
          console.log('Processed repositories:', this.repositories);
          
          // Initialize filtered repositories
          this.filterRepositories();
          this.isLoading = false;
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
        repo.language.toLowerCase().includes(query)
      );
    }
    
    // Update pagination
    this.totalPages = Math.ceil(this.filteredRepositories.length / this.itemsPerPage) || 1;
    this.currentPage = Math.min(this.currentPage, this.totalPages);
    this.updateDisplayedRepositories();
    this.generatePageNumbers();
    
    console.log(`Filtered repositories: ${this.filteredRepositories.length}, total pages: ${this.totalPages}`);
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
    
    console.log(`Displaying repositories ${startIndex+1} to ${startIndex+this.displayedRepositories.length}`);
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
    console.log('Connecting to GitHub...');
    this.githubService.loginWithGitHub();
  }

  /**
   * Initiate GitHub App installation
   */
  connectRepository(): void {
    console.log('Installing GitHub App...');
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
  generateReadme(repositoryId: number): void {
    console.log(`Generating README for repository ID ${repositoryId}...`);
    this.generatingReadmes[repositoryId] = true;
    
    const generateSub = this.githubService.generateReadme(repositoryId).subscribe({
      next: (response) => {
        console.log('README generated successfully:', response);
        this.generatingReadmes[repositoryId] = false;
        
        // Navigate to the new README
        if (response && response.id) {
          this.router.navigate(['/readmes', response.id]);
        }
      },
      error: (error) => {
        console.error('Failed to generate README:', error);
        this.generatingReadmes[repositoryId] = false;
      }
    });
    
    this.subscriptions.add(generateSub);
  }

  /**
   * Retry loading repositories after an error
   */
  retryLoading(): void {
    console.log('Retrying repository loading...');
    this.hasError = false;
    this.checkAuthAndLoadRepositories();
  }

  /**
   * Logout the current user
   */
  logout(): void {
    console.log('Logging out...');
    this.githubService.logout();
  }
}