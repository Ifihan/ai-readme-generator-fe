import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ReadmeService } from '../../core/services/readme.service';
import { NotificationService } from '../../core/services/notification.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PageLayoutComponent } from '../../shared/components/page-layout/page-layout.component';
import { MarkdownEditorComponent } from '../../shared/components/markdown-editor/markdown-editor/markdown-editor.component';
import { SectionTemplate, ReadmeSection, GenerateReadmeRequest } from '../../core/models/readme.model';

@Component({
  selector: 'app-readme-generate',
  templateUrl: './readme-generate.component.html',
  styleUrls: ['./readme-generate.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    PageLayoutComponent,
    MarkdownEditorComponent
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

  // New properties for handling the generated README
  generatedReadme: string = '';
  editableReadme: string = '';
  sectionsIncluded: string[] = [];
  showPreview = false;
  saving = false;
  downloading = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private readmeService: ReadmeService,
    private notificationService: NotificationService
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

        // Auto-select sections that have is_default: true
        this.selectedSections = sections.filter(section => section.is_default === true);

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

    this.loading = true;
    this.error = null;

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

    this.readmeService.generateReadme(payload).subscribe({
      next: (res) => {
        res.content = this.cleanMarkdownContent(res.content);
        this.generatedReadme = res.content;
        this.editableReadme = res.content; // Initialize editable copy
        this.sectionsIncluded = res.sections_included;
        this.showPreview = true;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to generate README.';
        this.loading = false;
      }
    });
  }

  // Helper method to clean markdown content by removing code fences
  private cleanMarkdownContent(content: string): string {
    // Remove the opening ```markdown and closing ``` from the content
    return content
      .replace(/^```markdown\n/, '')
      .replace(/\n```$/, '')
      .trim();
  }

  onReadmeEdit() {
    // This method can be used for any real-time editing logic if needed
    // For now, the two-way binding handles the content updates
  }

  onResetRequested() {
    this.notificationService.success('Content reset to original generated version');
  }

  downloadReadme() {
    if (!this.editableReadme) return;

    this.downloading = true;
    const cleanContent = this.cleanMarkdownContent(this.editableReadme);
    // just create a blob and trigger download
    const blob = new Blob([cleanContent], { type: 'text/markdown' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'README.md';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    this.downloading = false;
    this.notificationService.success('README downloaded successfully!');
  }

  saveToGitHub() {
    if (!this.editableReadme) return;

    this.saving = true;
    const cleanContent = this.cleanMarkdownContent(this.editableReadme);
    const payload = {
      repository_url: this.repoUrl,
      content: cleanContent,
      path: 'README.md',
      commit_message: 'Add generated README.md',
      branch: 'main'
    };

    this.readmeService.saveReadmeToGithub(payload).subscribe({
      next: (response) => {
        this.saving = false;
        this.notificationService.success('README saved to GitHub successfully!');
      },
      error: (err) => {
        this.error = 'Failed to save README to GitHub.';
        this.notificationService.error('Failed to save README to GitHub.');
        this.saving = false;
      }
    });
  }

  backToForm() {
    this.showPreview = false;
    this.generatedReadme = '';
    this.editableReadme = '';
    this.sectionsIncluded = [];
    this.error = null;
  }

  formatBadgeStyle(style: string): string {
    return style.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }
}
