import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
    },
    {
        path: 'dashboard',
        loadComponent: () => import('./features/corista/dashboard/dashboard.component').then(m => m.DashboardComponent)
    },
    {
        path: 'admin',
        loadComponent: () => import('./features/admin/painel/painel.component').then(m => m.PainelComponent)
    },
    {
        path: 'projecao',
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
