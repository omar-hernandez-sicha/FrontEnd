import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { ROUTES } from './core/constants/routes';

export const routes: Routes = [
  { path: '', redirectTo: ROUTES.login, pathMatch: 'full' },
  {
    path: ROUTES.login,
    loadComponent: () => import('./components/auth/login/login.component').then(mod => mod.LoginComponent)
  },
  {
    path: ROUTES.tasks,
    loadComponent: () => import('./components/tasks/task-list/task-list.component').then(mod => mod.TaskListComponent),
    canActivate: [AuthGuard]
  },
  {
    path: ROUTES.notFound,
    loadComponent: () => import('./components/not-found/not-found.component').then(mod => mod.NotFoundComponent)
  },
  { path: '**', redirectTo: ROUTES.notFound }
];
