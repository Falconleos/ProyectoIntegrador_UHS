import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';

export const routes: Routes = [
    {
        path: '',
        component: LoginComponent
    },
    {
        path: 'dashboard',
        component: DashboardComponent,
        children: [
            {
                path: 'usuarios',
                loadComponent: () => import('./components/user-list/user-list.component').then(m => m.UserListComponent)
            },
            {
                path: 'user-creation',
                loadComponent: () => import('./components/user-form/user-form.component').then(m => m.UserFormComponent)
            },
            {
                path: 'user-edit/:id', 
                loadComponent: () => import('./components/user-edit/user-edit.component').then(m => m.UserEditComponent)
            },
            {
                path:'room-list',
                loadComponent:()=>import('./components/room/room-list/room-list.component').then(m=>m.RoomListComponent)
            },
            {
                path: 'room-edit/:id',
                loadComponent: () => import('./components/room/room-edit/room-edit.component').then(m => m.RoomEditComponent)
            },
            {
                path: 'room-type',
                loadComponent: () => import('./components/room/room-type-form/room-type-form.component').then(m=>m.RoomTypeFormComponent)
            },
            
        ]
    },
    {
        path: '**',
        redirectTo: ''
    }
];