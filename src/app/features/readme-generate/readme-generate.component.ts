import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ReadmeService, SectionTemplate, ReadmeSection, GenerateReadmeRequest } from '../../core/services/readme.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PageLayoutComponent } from '../../shared/components/page-layout/page-layout.component';

@Component({
  selector: 'app-readme-generate',
  templateUrl: './readme-generate.component.html',
  styleUrls: ['./readme-generate.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    PageLayoutComponent
  ],
  standalone: true
})
export class ReadmeGenerateComponent implements OnInit {
  repoUrl: string = '';
  sectionTemplates: SectionTemplate[] = [];
  selectedSections: SectionTemplate[] = [];
  includeBadges = true;
  badgeStyle = 'flat';
  badgeStyles = ['flat', 'plastic', 'flat-square', 'for-the-badge', 'social'];
  loading = false;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private readmeService: ReadmeService
  ) { }

  ngOnInit(): void {
    this.repoUrl = decodeURIComponent(this.route.snapshot.paramMap.get('repoUrl') || '');
    this.fetchSectionTemplates();
  }

  fetchSectionTemplates() {
    this.loading = true;
    this.readmeService.getSectionTemplates().subscribe({
      next: (sections) => {
        this.sectionTemplates = sections;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load section templates.';
        this.loading = false;
      }
    });
  }

  toggleSection(section: SectionTemplate) {
    const idx = this.selectedSections.findIndex(s => s.id === section.id);
    if (idx > -1) {
      this.selectedSections.splice(idx, 1);
    } else {
      this.selectedSections.push(section);
    }
  }

  isSelected(section: SectionTemplate) {
    return this.selectedSections.some(s => s.id === section.id);
  }

  generateReadme() {
    if (!this.repoUrl || this.selectedSections.length === 0) return;
    const sections: ReadmeSection[] = this.selectedSections.map((s, i) => ({
      name: s.name,
      description: s.description,
      required: s.is_default,
      order: i
    }));
    const payload: GenerateReadmeRequest = {
      repository_url: this.repoUrl,
      sections,
      include_badges: this.includeBadges,
      badge_style: this.badgeStyle
    };
    // You can now call the service to generate the README or navigate to a preview page
    this.readmeService.generateReadme(payload).subscribe({
      next: (res) => {
        // Handle the generated README (show preview, navigate, etc.)
        // For now, just log it
        console.log(res);
        // Optionally, navigate to a preview page
      },
      error: (err) => {
        this.error = 'Failed to generate README.';
      }
    });
  }

  formatBadgeStyle(style: string): string {
    return style.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }
}
