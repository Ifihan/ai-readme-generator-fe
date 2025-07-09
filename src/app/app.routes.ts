import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { AuthCallbackComponent } from './features/auth/auth-callback.component';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/landing/landing.component').then(m => m.LandingComponent)
  },
  {
    path: 'auth/callback',
    loadComponent: () => import('./features/auth/auth-callback.component').then(m => m.AuthCallbackComponent)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'generate-readme/:repoUrl',
    loadComponent: () => import('./features/readme-generate/readme-generate.component').then(m => m.ReadmeGenerateComponent)
  },
  {
    path: '**',
    redirectTo: ''
  }
];
