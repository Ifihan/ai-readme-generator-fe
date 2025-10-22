import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ReadmeService } from '../../core/services/readme.service';
import { NotificationService } from '../../core/services/notification.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PageLayoutComponent } from '../../shared/components/page-layout/page-layout.component';
import { MarkdownEditorComponent } from '../../shared/components/markdown-editor/markdown-editor/markdown-editor.component';
import { SectionTemplate, ReadmeSection, GenerateReadmeRequest, GithubBranchModel } from '../../core/models/readme.model';
import { LoggerService } from '../../core/services/logger.service';
import { tap } from 'rxjs';

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
  feedback: {
    general_comments: string;
    rating: string
    suggestions?: string
    helpful_sections: string[]
    problematic_sections: string[]
  } = {
      general_comments: "",
      rating: "",
      suggestions: "",
      helpful_sections: [],
      problematic_sections: []
    };
  problematicSectionInput: string[] = [''];
  helpfulSectionInput: string[] = [''];
  isSubmittingFeedback: boolean = false;
  isPanelOpen: boolean = false;
  hasSentFeedback: boolean = false;

  toggleFeedbackSection(section_type: "helpful" | "problematic", section: string) {
    if (section_type == "helpful") {
      if (this.feedback.helpful_sections.includes(section)) {
        this.feedback.helpful_sections = this.feedback.helpful_sections.filter(s => s != section)
      }
      else this.feedback.helpful_sections.push(section)
    }

    if (section_type == "problematic") {
      if (this.feedback.problematic_sections.includes(section)) {
        this.feedback.problematic_sections = this.feedback.problematic_sections.filter(s => s != section)
      }
      else this.feedback.problematic_sections.push(section)
    }
  }

  submitFeedback() {
    if (!this.feedback.helpful_sections.length) {
      this.notificationService.info("Please select one or more helpful sections.");
      return;
    }

    if (!this.feedback.problematic_sections.length) {
      this.notificationService.info("Please select one or more problematic sections.");
      return;
    }

    if (!this.feedback.general_comments || (this.feedback.general_comments.length < 10)) {
      this.notificationService.info("A minimum length of 10 characters is required for the general comment.");
      return;
    }

    this.isSubmittingFeedback = true;
    this.readmeService.sendFeedBack({
      readme_history_id: this.entryId as string,
      helpful_sections: this.feedback.helpful_sections,
      problematic_sections: this.feedback.problematic_sections,
      general_comments: this.feedback.general_comments,
      suggestions: this.feedback.suggestions,
      rating: this.feedback.rating
    }).subscribe({
      next: () => {
        this.notificationService.success('Thank you for your feedback');
        this.isSubmittingFeedback = false;
        this.showFeedbackPopup = false;
        this.isPanelOpen = false;
        this.hasSentFeedback = true;
      },
      error: () => {
        this.notificationService.error("Failed to submit feedback. Please try again");
      }
    })
  }

  togglePanel() {
    this.isPanelOpen = !this.isPanelOpen;
  }

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
  // Loading states
  isGenerating = false;
  // Success view state
  pushSuccess = false;
  gifFailedToLoad = false;
  // Commit message input state
  showCommitMessageInput = false;
  commitMessage = '';
  branchSearch = '';
  branches: GithubBranchModel[] = [];
  filteredBranches: GithubBranchModel[] = [];
  selectedBranch: GithubBranchModel | null = null;
  showBranchDropdown: boolean = false;
  hasDisplayedFeedbackFromEditor: boolean = false;
  showFeedbackPopup: boolean = false;
  feedbackChatMessage: string = '';
  entryId: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private readmeService: ReadmeService,
    private notificationService: NotificationService,
    private logger: LoggerService
  ) { }

  ngOnInit(): void {
    this.repoUrl = decodeURIComponent(this.route.snapshot.paramMap.get('repoUrl') || '');
    this.fetchSectionTemplates();
  }

  fetchSectionTemplates() {
    this.loading = true;
    this.isGenerating = false;
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
    this.isGenerating = true;
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

    // console.log('Generate README payload:', payload);

    this.readmeService.generateReadme(payload).subscribe({
      next: (res) => {
        // console.log('Generated README response:', res);
        res.content = this.cleanMarkdownContent(res.content);
        this.generatedReadme = res.content;
        this.editableReadme = res.content; // Initialize editable copy
        this.entryId = res.entry_id;
        // Defensive: API may omit sections_generated; ensure it's always an array
        this.sectionsIncluded = Array.isArray(res.sections_generated) ? res.sections_generated : [];
        this.showPreview = true;
        this.loading = false;
        this.isGenerating = false;

        setTimeout(() => {
          this.notificationService.info("Would you mind sharing some feedback about the readme?");
          this.showFeedbackPopup = true;
          setTimeout(() => this.isPanelOpen = true, 500)
        }, 3000);
      },
      error: (err) => {
        this.error = 'Failed to generate README.';
        this.loading = false;
        this.isGenerating = false;
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
    if (!this.hasSentFeedback)
      setTimeout(() => {
        this.notificationService.info("Looks like our generated readme wasn’t perfect. Mind sharing some feedback?")
        this.showFeedbackPopup = true;
        setTimeout(() => this.isPanelOpen = true, 500)
      }, 1500)
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
    if (!this.hasSentFeedback)
      setTimeout(() => {
        this.notificationService.info("Thank you for using our service. Kindly drop a review")
        this.showFeedbackPopup = true;
        setTimeout(() => this.isPanelOpen = true, 500)
      }, 2000);
  }

  fetchBranches() {
    const repoData = this.readmeService.extractMetadataFromGithubUrl(this.repoUrl);
    if (!repoData) return;

    const { owner, repo } = repoData;
    // this.readmeService.getRepositoryBranches(owner, repo)
    //   .subscribe({
    //     next: (data) => {
    //       this.branches = data.branches;
    //       this.filteredBranches = data.branches;
    //       this.loading = false;
    //     },
    //     error: (error) => {
    //       this.notificationService.error("Failed to retrieve branches");
    //       this.loading = false;
    //     }
    //   });

    return this.readmeService.getRepositoryBranches(owner, repo)
      .pipe(
        tap(data => {
          this.branches = data.branches;
          this.filteredBranches = data.branches;
          this.loading = false;
        })
      )
  }

  filterBranches() {
    this.filteredBranches = this.branches.filter((b) => {
      const r = new RegExp(`^${this.branchSearch}`);
      return r.test(b.name)
    });
  }

  selectBranch(branch: GithubBranchModel) {
    this.selectedBranch = branch;
    this.branchSearch = branch.name;
    this.logger.info("selected " + branch.name)
    this.showBranchDropdown = false;
  }

  createBranch(branch_name: string) {
    const repoData = this.readmeService.extractMetadataFromGithubUrl(this.repoUrl);
    if (!repoData) return;

    const { owner, repo } = repoData;
    this.loading = true;
    this.readmeService.createRepositoryBranch(owner, repo, branch_name)
      .subscribe({
        next: () => {
          this.fetchBranches()
            ?.subscribe({
              next: (data) => {
                const createdBranch = data.branches.find(b => b.name === branch_name)
                if (createdBranch) this.selectBranch(createdBranch);
              }
            });
        },
        error: () => {

        }
      });
  }

  saveToGitHub() {
    if (!this.editableReadme) return;

    // First click reveals commit message input
    if (!this.showCommitMessageInput) {
      this.showCommitMessageInput = true;
      // Provide a sensible default suggestion
      this.loading = true;
      this.fetchBranches()?.subscribe();
      this.commitMessage = this.commitMessage || 'docs: add generated README';
      return;
    }

    const trimmed = (this.commitMessage || '').trim();
    if (!trimmed) {
      this.notificationService.error('Please enter a commit message.');
      return;
    }

    this.saving = true;
    const cleanContent = this.cleanMarkdownContent(this.editableReadme);
    const payload = {
      repository_url: this.repoUrl,
      content: cleanContent,
      path: 'README.md',
      commit_message: trimmed,
      branch: this.selectedBranch?.name || 'main'
    };

    this.readmeService.saveReadmeToGithub(payload).subscribe({
      next: (response) => {
        this.saving = false;
        this.pushSuccess = true;
        this.error = null;
        this.playSuccessSound();
        this.notificationService.success('README pushed to GitHub successfully!');

        if (!this.hasSentFeedback)
          setTimeout(() => {
            this.notificationService.info("Thank you for using our service. Kindly drop a review")
            this.showFeedbackPopup = true;
            setTimeout(() => this.isPanelOpen = true, 500)
          }, 1000);
      },
      error: (err) => {
        this.error = 'Failed to save README to GitHub.';
        this.notificationService.error('Failed to save README to GitHub.');
        this.saving = false;
      }
    });
  }

  goToDashboard() {
    this.router.navigate(['dashboard']);
  }

  onGifError() {
    this.gifFailedToLoad = true;
  }

  // Play a short celebratory ta‑da without external assets
  private playSuccessSound() {
    if (typeof window === 'undefined') return;
    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    try {
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.08, now);
      master.connect(ctx.destination);

      // Major triad (C major as base) with quick arpeggio and shimmer
      const base = 523.25; // C5
      const triad = [base, base * 1.25, base * 1.5]; // C E G
      triad.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = now + i * 0.06;
        const end = start + 0.5;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.9 - i * 0.2, start + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, end);
        osc.connect(gain);
        gain.connect(master);
        osc.start(start);
        osc.stop(end + 0.02);
      });

      // Add a quick upper shimmer
      const shimmer = ctx.createOscillator();
      const shimmerGain = ctx.createGain();
      shimmer.type = 'triangle';
      shimmer.frequency.setValueAtTime(base * 2, now + 0.12); // C6
      shimmerGain.gain.setValueAtTime(0, now + 0.12);
      shimmerGain.gain.linearRampToValueAtTime(0.5, now + 0.16);
      shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
      shimmer.connect(shimmerGain);
      shimmerGain.connect(master);
      shimmer.start(now + 0.12);
      shimmer.stop(now + 0.44);

      // Gentle end whoosh (noise approximation with detuned oscillators)
      const whooshStart = now + 0.2;
      for (let i = 0; i < 3; i++) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(40 + i * 8, whooshStart);
        o.detune.setValueAtTime((i - 1) * 20, whooshStart);
        g.gain.setValueAtTime(0.0001, whooshStart);
        g.gain.exponentialRampToValueAtTime(0.02, whooshStart + 0.05);
        g.gain.exponentialRampToValueAtTime(0.0001, whooshStart + 0.35);
        o.connect(g);
        g.connect(master);
        o.start(whooshStart);
        o.stop(whooshStart + 0.4);
      }

      // Auto close
      setTimeout(() => {
        try { ctx.close(); } catch { }
      }, 700);
    } catch {
      // ignore audio errors
    }
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
