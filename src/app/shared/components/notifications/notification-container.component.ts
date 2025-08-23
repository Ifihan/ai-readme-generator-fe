import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { NotificationService, Notification } from '../../../core/services/notification.service';

@Component({
  selector: 'app-notification-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container" aria-live="polite" aria-atomic="true">
      <div class="toast" *ngFor="let n of notifications" [class.success]="n.type==='success'" [class.error]="n.type==='error'" [class.warning]="n.type==='warning'" [class.info]="n.type==='info'">
        <div class="content">
          <span class="icon" [innerHTML]="getIcon(n.type)"></span>
          <span class="message">{{ n.message }}</span>
        </div>
        <button class="close" (click)="dismiss(n.id)" aria-label="Dismiss">&times;</button>
      </div>
    </div>
  `,
  styles: [`
    :host { position: fixed; inset: 0; pointer-events: none; z-index: 2147483647; }
    .toast-container { position: fixed; top: 16px; right: 16px; display: flex; flex-direction: column; gap: 8px; z-index: 2147483647; }
    .toast { pointer-events: auto; display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.15); min-width: 280px; max-width: 420px; background: var(--toast-bg, #fff); color: var(--toast-fg, #111); border: 1px solid rgba(0,0,0,0.06); }
    .toast .content { display: flex; align-items: center; gap: 10px; flex: 1; }
    .toast .icon { width: 18px; height: 18px; display: inline-flex; align-items: center; justify-content: center; }
    .toast .message { line-height: 1.3; }
    .toast .close { background: transparent; border: 0; font-size: 18px; line-height: 1; cursor: pointer; color: inherit; opacity: 0.7; }
    .toast .close:hover { opacity: 1; }
    .toast.success { --toast-bg: #ecfdf5; --toast-fg: #065f46; border-color: #a7f3d0; }
    .toast.error { --toast-bg: #fef2f2; --toast-fg: #7f1d1d; border-color: #fecaca; }
    .toast.warning { --toast-bg: #fffbeb; --toast-fg: #78350f; border-color: #fde68a; }
    .toast.info { --toast-bg: #eff6ff; --toast-fg: #1e3a8a; border-color: #bfdbfe; }
    @media (prefers-color-scheme: dark) {
      .toast { background: #111827; color: #e5e7eb; border-color: #374151; }
      .toast.success { --toast-bg: #064e3b; --toast-fg: #ecfdf5; }
      .toast.error { --toast-bg: #7f1d1d; --toast-fg: #fee2e2; }
      .toast.warning { --toast-bg: #78350f; --toast-fg: #fffbeb; }
      .toast.info { --toast-bg: #1e3a8a; --toast-fg: #eff6ff; }
    }
  `]
})
export class NotificationContainerComponent implements OnDestroy {
  notifications: Notification[] = [];
  private sub: Subscription;

  constructor(private notificationsSvc: NotificationService) {
    this.sub = this.notificationsSvc.getNotifications().subscribe(n => this.notifications = n);
  }

  dismiss(id: string) {
    this.notificationsSvc.remove(id);
  }

  getIcon(type: Notification['type']): string {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '⛔️';
      case 'warning': return '⚠️';
      default: return 'ℹ️';
    }
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
