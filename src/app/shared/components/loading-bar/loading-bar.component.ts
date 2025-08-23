import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { LoadingService } from '../../../core/services/loading.service';

@Component({
  selector: 'app-loading-bar',
  templateUrl: './loading-bar.component.html',
  styleUrls: ['./loading-bar.component.css'],
  imports: [CommonModule],
  standalone: true
})
export class LoadingBarComponent implements OnInit, OnDestroy {
  isLoading = false;
  private subscription = new Subscription();

  constructor(private loadingService: LoadingService) { }

  ngOnInit(): void {
    this.subscription = this.loadingService.loading$.subscribe(
      (loading: boolean) => {
        this.isLoading = loading;
      }
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
