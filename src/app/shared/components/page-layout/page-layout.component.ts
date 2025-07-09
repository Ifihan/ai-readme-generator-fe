import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle.component';

@Component({
  selector: 'app-page-layout',
  templateUrl: './page-layout.component.html',
  styleUrls: ['./page-layout.component.css'],
  standalone: true,
  imports: [CommonModule, RouterModule, ThemeToggleComponent]
})
export class PageLayoutComponent {
  @Input() showBackButton = false;
  imageLoaded = false;

  handleImageError(event: any) {
    this.imageLoaded = false;
  }
}
