// import { NgModule } from '@angular/core';
// import { Routes } from '@angular/router';
// import { LandingComponent } from './features/landing/landing.component';
// import { AuthCallbackComponent } from './features/auth/auth-callback.component';
// import { AuthGuard } from './core/guards/auth.guard';

// export const routes: Routes = [
//   {
//     path: '',
//     component: LandingComponent
//   },
//   {
//     path: 'auth/callback',
//     component: AuthCallbackComponent
//   },
//   {
//     path: 'dashboard',
//     loadChildren: () => import('./features/dashboard/dashboard.module').then(m => m.DashboardModule),
//     canActivate: [AuthGuard]
//   },
//   {
//     path: '**',
//     redirectTo: ''
//   }
// ];

// @NgModule({
//   imports: [RouterModule.forRoot(routes, {
//     initialNavigation: 'enabledBlocking'
//   })],
//   exports: [RouterModule]
// })
// export class AppRoutingModule { }


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
    path: '**',
    redirectTo: ''
  }
];