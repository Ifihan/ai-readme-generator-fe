import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ReadmeService } from '../../core/services/readme.service';
import { NotificationService } from '../../core/services/notification.service';
import { PageLayoutComponent } from '../../shared/components/page-layout/page-layout.component';
import { HistoryEntry, HistoryResponse } from '../../core/models/history.model';

@Component({
  selector: 'app-history',
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    PageLayoutComponent
  ],
  standalone: true
})
export class HistoryComponent implements OnInit {
  entries: HistoryEntry[] = [];
  loading = false;
  error: string | null = null;

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalCount = 0;
  totalPages = 0;

  constructor(
    private readmeService: ReadmeService,
    private notificationService: NotificationService
  ) { }

  ngOnInit(): void {
    this.loadHistory();
  }

  loadHistory(): void {
    this.loading = true;
    this.error = null;

    this.readmeService.getReadmeHistory(this.currentPage, this.pageSize).subscribe({
      next: (response: HistoryResponse) => {
        this.entries = response.entries;
        this.totalCount = response.total_count;
        this.totalPages = Math.ceil(this.totalCount / this.pageSize);
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load README generation history.';
        this.notificationService.error('Failed to load history.');
        this.loading = false;
      }
    });
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.loadHistory();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.goToPage(this.currentPage - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.goToPage(this.currentPage + 1);
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  openRepository(url: string): void {
    const fullGithubUrlRegex = /^https?:\/\/(www\.)?github\.com\/[\w.-]+\/[\w.-]+(\/)?$/i;
    const relativeGithubRepoRegex = /^[\w.-]+\/[\w.-]+$/;

    if(fullGithubUrlRegex.test(url)) window.open(url, '_blank');
    if(relativeGithubRepoRegex.test(url)) 
      window.open(`https://github.com/${url}`, '_blank');
  }

  toggleContent(entry: HistoryEntry): void {
    entry.showContent = !entry.showContent;
  }

  copyContent(content: string): void {
    const cleanContent = this.cleanMarkdownContent(content);
    navigator.clipboard.writeText(cleanContent).then(() => {
      this.notificationService.success('Content copied to clipboard!');
    }).catch(() => {
      this.notificationService.error('Failed to copy content.');
    });
  }

  cleanMarkdownContent(content: string): string {
    // Remove the opening ```markdown and closing ``` from the content
    return content
      .replace(/^```markdown\n/, '')
      .replace(/\n```$/, '')
      .trim();
  }

  downloadContent(content: string, repo_name: string){
    const cleanContent = this.cleanMarkdownContent(content);
    const blob = new Blob([cleanContent], { type: 'text/markdown' });
    const url = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `README (${repo_name}).md`;
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}
