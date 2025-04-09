import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { FormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { PLATFORM_ID } from '@angular/core';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';

import { DashboardComponent } from './dashboard.component';
import { AuthService } from '../../core/services/auth.service';
import { GithubService } from '../../core/services/github.service';
import { SidebarComponent } from '../../shared/components/sidebar/sidebar.component';
import { ThemeToggleComponent } from '../../shared/components/theme-toggle/theme-toggle.component';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let githubServiceSpy: jasmine.SpyObj<GithubService>;
  let routerSpy: jasmine.SpyObj<Router>;

  const mockRepositories = [
    {
      id: 123,
      name: 'test-repo',
      full_name: 'username/test-repo',
      description: 'Test repository',
      private: false,
      html_url: 'https://github.com/username/test-repo',
      language: 'JavaScript',
      default_branch: 'main',
      updated_at: '2023-01-01T12:00:00Z',
      owner: {
        login: 'username',
        avatar_url: 'https://github.com/avatar'
      }
    },
    {
      id: 456,
      name: 'another-repo',
      full_name: 'username/another-repo',
      description: 'Another test repository',
      private: false,
      html_url: 'https://github.com/username/another-repo',
      language: 'Python',
      default_branch: 'main',
      updated_at: '2023-01-05T12:00:00Z',
      owner: {
        login: 'username',
        avatar_url: 'https://github.com/avatar'
      }
    }
  ];

  const mockInstallation = {
    id: 'install-1',
    app_id: 'app-1',
    target_type: 'user',
    account: {
      login: 'username',
      avatar_url: 'https://github.com/avatar'
    }
  };

  beforeEach(async () => {
    const authSpy = jasmine.createSpyObj('AuthService', ['getUser', 'isAuthenticated']);
    const githubSpy = jasmine.createSpyObj('GithubService', [
      'getInstallations', 
      'getInstallationRepositories', 
      'loginWithGitHub',
      'installGitHubApp',
      'generateReadme',
      'logout'
    ]);
    const router = jasmine.createSpyObj('Router', ['navigate']);
    
    // Setup default return values
    authSpy.getUser.and.returnValue(of({ id: '1', username: 'testuser' }));
    authSpy.isAuthenticated.and.returnValue(of(true));
    githubSpy.getInstallations.and.returnValue(of([mockInstallation]));
    githubSpy.getInstallationRepositories.and.returnValue(of(mockRepositories));
    
    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule,
        FormsModule,
        DashboardComponent,
        SidebarComponent,
        ThemeToggleComponent
      ],
      providers: [
        { provide: AuthService, useValue: authSpy },
        { provide: GithubService, useValue: githubSpy },
        { provide: Router, useValue: router },
        { provide: PLATFORM_ID, useValue: 'browser' }
      ]
    }).compileComponents();

    authServiceSpy = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    githubServiceSpy = TestBed.inject(GithubService) as jasmine.SpyObj<GithubService>;
    routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load user info on initialization', () => {
    expect(authServiceSpy.getUser).toHaveBeenCalled();
    expect(component.userName).toBe('testuser');
  });

  it('should check authentication and load repositories on initialization', () => {
    expect(authServiceSpy.isAuthenticated).toHaveBeenCalled();
    expect(githubServiceSpy.getInstallations).toHaveBeenCalled();
  });

  it('should fetch repositories when authenticated and installation exists', () => {
    expect(githubServiceSpy.getInstallationRepositories).toHaveBeenCalledWith(mockInstallation.id);
    expect(component.isLoading).toBe(false);
    expect(component.repositories.length).toBeGreaterThan(0);
  });

  it('should filter repositories based on search query', () => {
    // Reset repositories with mapped test data
    component.repositories = mockRepositories.map(repo => ({
      id: repo.id,
      name: repo.name,
      lastUpdated: component.formatDate(repo.updated_at),
      language: repo.language || 'Unknown',
      initialLetter: repo.name.charAt(0).toUpperCase(),
      color: component.getColorForLanguage(repo.language)
    }));
    
    // Test filtering by name
    component.searchQuery = 'test';
    component.filterRepositories();
    expect(component.filteredRepositories.length).toBe(1);
    expect(component.filteredRepositories[0].name).toBe('test-repo');
    
    // Test filtering by language
    component.searchQuery = 'python';
    component.filterRepositories();
    expect(component.filteredRepositories.length).toBe(1);
    expect(component.filteredRepositories[0].language).toBe('Python');
    
    // Test empty query
    component.searchQuery = '';
    component.filterRepositories();
    expect(component.filteredRepositories.length).toBe(2);
  });

  it('should handle pagination correctly', () => {
    // Create 10 sample repositories
    component.repositories = Array(10).fill(0).map((_, i) => ({
      id: i,
      name: `repo-${i}`,
      lastUpdated: '1 day ago',
      language: 'JavaScript',
      initialLetter: 'R',
      color: '#123456'
    }));
    
    // With itemsPerPage = 6, we should have 2 pages
    component.itemsPerPage = 6;
    component.filterRepositories();
    expect(component.totalPages).toBe(2);
    
    // First page should show first 6 items
    expect(component.displayedRepositories.length).toBe(6);
    expect(component.displayedRepositories[0].name).toBe('repo-0');
    
    // Go to second page
    component.goToPage(2);
    expect(component.currentPage).toBe(2);
    expect(component.displayedRepositories.length).toBe(4); // Remaining 4 items
    expect(component.displayedRepositories[0].name).toBe('repo-6');
  });
  
  it('should return appropriate color based on language', () => {
    // Test known language
    const jsColor = component.getColorForLanguage('JavaScript');
    expect(jsColor).toBe('#f1e05a');
    
    // Test unknown language (should generate a color based on the name)
    const unknownColor = component.getColorForLanguage('UnknownLanguage');
    expect(unknownColor).toMatch(/^#[0-9a-f]{6}$/i); // Should be a hex color
    
    // Test null/undefined language
    const nullColor = component.getColorForLanguage(null as any);
    expect(nullColor).toBe('#CCCCCC');
  });

  it('should generate correct page numbers for pagination', () => {
    // Test with few pages
    component.totalPages = 3;
    component.currentPage = 1;
    component.generatePageNumbers();
    expect(component.pageNumbers).toEqual([1, 2, 3]);
    
    // Test with many pages, at beginning
    component.totalPages = 10;
    component.currentPage = 1;
    component.generatePageNumbers();
    expect(component.pageNumbers).toEqual([1, 2, 3, 4, -2, 10]);
    
    // Test with many pages, in middle
    component.totalPages = 10;
    component.currentPage = 5;
    component.generatePageNumbers();
    expect(component.pageNumbers).toEqual([1, -1, 4, 5, 6, -2, 10]);
    
    // Test with many pages, at end
    component.totalPages = 10;
    component.currentPage = 10;
    component.generatePageNumbers();
    expect(component.pageNumbers).toEqual([1, -1, 7, 8, 9, 10]);
  });

  it('should call GitHub service methods when interacting with repositories', () => {
    // Test connectGitHub
    component.connectGitHub();
    expect(githubServiceSpy.loginWithGitHub).toHaveBeenCalled();
    
    // Test connectRepository
    component.connectRepository();
    expect(githubServiceSpy.installGitHubApp).toHaveBeenCalled();
    
    // Test generateReadme
    const testRepoId = 123;
    const mockReadmeResponse = {
      id: 'readme-123',
      content: '# Test README',
      repositoryId: testRepoId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    githubServiceSpy.generateReadme.and.returnValue(of(mockReadmeResponse));
    component.generateReadme(testRepoId);
    
    expect(githubServiceSpy.generateReadme).toHaveBeenCalledWith(testRepoId);
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/readmes', 'readme-123']);
  });

  it('should call logout when logout is triggered', () => {
    component.logout();
    expect(githubServiceSpy.logout).toHaveBeenCalled();
  });

  it('should handle sidebar collapse state change', () => {
    const newState = !component.sidebarCollapsed;
    component.onSidebarCollapsedChange(newState);
    expect(component.sidebarCollapsed).toBe(newState);
  });

  it('should properly format dates', () => {
    const today = new Date().toISOString();
    expect(component.formatDate(today)).toBe('today');
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(component.formatDate(yesterday.toISOString())).toBe('yesterday');
    
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    expect(component.formatDate(fiveDaysAgo.toISOString())).toBe('5 days ago');
    
    const threeWeeksAgo = new Date();
    threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21);
    expect(component.formatDate(threeWeeksAgo.toISOString())).toBe('3 weeks ago');
    
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    expect(component.formatDate(twoMonthsAgo.toISOString())).toBe('2 months ago');
  });
});