import { Routes } from '@angular/router';
import { LandingComponent } from './features/landing/landing.component';
import { AuthCallbackComponent } from './features/auth/auth-callback.component';
// import { AuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    component: LandingComponent
  },
  {
    path: 'auth/callback',
    component: AuthCallbackComponent
  },
  // {
  //   path: 'dashboard',
  //   loadChildren: () => import('./features/dashboard/dashboard.module').then(m => m.DashboardModule),
  //   canActivate: [AuthGuard]
  // },
  {
    path: '**',
    redirectTo: ''
  }
];