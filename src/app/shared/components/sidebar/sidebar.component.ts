import { Component, EventEmitter, Input, OnInit, Output, ViewChild, ElementRef, Inject, PLATFORM_ID, HostListener, OnDestroy } from '@angular/core';
import { CommonModule, isPlatformBrowser, DOCUMENT } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

export interface NavItem {
  label: string;
  route: string[];
  icon: string;
  exact?: boolean;
}

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
  standalone: true,
  imports: [CommonModule, RouterModule]
})
export class SidebarComponent implements OnInit, OnDestroy {
  @ViewChild('logoImg') logoImg!: ElementRef;
  
  @Input() appName: string = 'Readme AI';
  @Input() logoSrc: string = 'assets/images/logo.svg';
  @Input() navItems: NavItem[] = [];
  @Input() collapsed: boolean = false;
  @Input() persistState: boolean = true;

  @Output() logoutEvent = new EventEmitter<void>();
  @Output() navItemClicked = new EventEmitter<NavItem>();
  @Output() collapsedChange = new EventEmitter<boolean>();
  
  imageLoaded = false;
  currentRoute: string = '';
  isMobile: boolean = false;
  isMobileMenuOpen: boolean = false;
  safeNavIcons: { [key: string]: SafeHtml } = {};
  private routerSubscription: Subscription | null = null;
  private readonly STORAGE_KEY = 'sidebar_collapsed';
  isBrowser: boolean;
  
  constructor(
    private router: Router,
    private sanitizer: DomSanitizer,
    @Inject(DOCUMENT) private document: Document,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    // Subscribe to router events to set active menu item
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.currentRoute = this.router.url;
        this.closeMobileMenu();
      });
    
    // Set initial route
    this.currentRoute = this.router.url;
    
    // Load collapsed state from localStorage if enabled
    if (this.persistState && this.isBrowser) {
      const savedState = localStorage.getItem(this.STORAGE_KEY);
      if (savedState !== null) {
        this.collapsed = savedState === 'true';
        this.collapsedChange.emit(this.collapsed);
      }
    }
    
    // Process nav icons to make them safe
    this.sanitizeNavIcons();
    
    // Check for mobile device
    this.checkScreenSize();
  }
  
  ngOnDestroy(): void {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  sanitizeNavIcons(): void {
    // Preprocess nav icons to avoid sanitization warnings
    this.navItems.forEach(item => {
      this.safeNavIcons[item.label] = this.sanitizer.bypassSecurityTrustHtml(item.icon);
    });
  }

  toggle(): void {
    this.collapsed = !this.collapsed;
    this.collapsedChange.emit(this.collapsed);
    
    // Save state if persistence is enabled
    if (this.persistState && this.isBrowser) {
      localStorage.setItem(this.STORAGE_KEY, String(this.collapsed));
    }
  }
  
  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
    
    // Prevent body scrolling when menu is open
    if (this.isBrowser) {
      this.document.body.style.overflow = this.isMobileMenuOpen ? 'hidden' : '';
    }
  }
  
  closeMobileMenu(): void {
    if (this.isMobileMenuOpen) {
      this.isMobileMenuOpen = false;
      
      if (this.isBrowser) {
        this.document.body.style.overflow = '';
      }
    }
  }
  
  isActive(route: string[]): boolean {
    // Simple active check - can be enhanced for more complex routes
    return this.currentRoute.startsWith(route.join('/'));
  }
  
  onNavItemClick(item: NavItem): void {
    this.navItemClicked.emit(item);
    
    // On mobile, close the sidebar after a menu item is clicked
    this.closeMobileMenu();
  }
  
  onLogout(): void {
    this.logoutEvent.emit();
  }
  
  handleImageError(event: Event): void {
    this.imageLoaded = false;
  }
  
  @HostListener('window:resize')
  checkScreenSize(): void {
    if (this.isBrowser) {
      this.isMobile = window.innerWidth <= 768;
      
      // Auto-collapse sidebar on small screens
      if (this.isMobile && !this.collapsed) {
        this.collapsed = true;
        this.collapsedChange.emit(this.collapsed);
      }
    }
  }
}