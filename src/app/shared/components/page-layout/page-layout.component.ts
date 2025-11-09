import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle.component';
import { LogoComponent } from '../logo/logo.component';

@Component({
  selector: 'app-page-layout',
  templateUrl: './page-layout.component.html',
  styleUrls: ['./page-layout.component.css'],
  standalone: true,
  imports: [CommonModule, RouterModule, ThemeToggleComponent, LogoComponent]
})
export class PageLayoutComponent {
  @Input() showBackButton = false;

  goBack() {
    window.history.back();
  }
}
