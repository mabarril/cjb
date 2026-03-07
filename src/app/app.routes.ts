import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
    {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
    },
    {
        path: 'dashboard',
        canActivate: [authGuard],
        loadComponent: () => import('./features/corista/dashboard/dashboard.component').then(m => m.DashboardComponent)
    },
    {
        path: 'admin',
        canActivate: [authGuard, adminGuard],
        loadComponent: () => import('./features/admin/painel/painel.component').then(m => m.PainelComponent)
    },
    {
        path: 'projecao',
        canActivate: [authGuard],
        loadComponent: () => import('./features/projecao/display/display.component').then(m => m.DisplayComponent)
    },
    {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full'
    },
    {
        path: '**',
        redirectTo: 'login'
    }
];
