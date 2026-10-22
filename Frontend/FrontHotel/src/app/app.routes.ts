import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';

export const routes: Routes = [
    {
        path:'',
        component:LoginComponent
    },
    {
        path:'dashboard',
        component:DashboardComponent,
        children:[
            {
                path:'usuarios',
                loadComponent:()=>import('./components/user-list/user-list.component').then(m=>m.UserListComponent)
            }
        ]
    },
    {
        path:'**',
        redirectTo:''
    }
];
