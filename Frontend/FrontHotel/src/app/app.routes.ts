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
            {
                path:'room-form',
                loadComponent: ()=>import('./components/room/room-form/room-form.component').then(m=>m.RoomFormComponent)
            },
            {
                path:'employee-list',
                loadComponent: ()=>import('./components/employee/employee-list/employee-list.component').then(m=>m.EmployeeListComponent)
            },
            {
                path:'employee-create',
                loadComponent: ()=>import('./components/employee/employee-form/employee-form.component').then(m=>m.EmployeeFormComponent)
            },
            {
                path:'employee-edit/:id',
                loadComponent:()=>import('./components/employee/employee-edit/employee-edit.component').then(m=>m.EmployeeEditComponent)
            },
            {
                path:'booking-list',
                loadComponent:()=>import('./components/booking-list/booking-list.component').then(m=>m.BookingListComponent)
            },
            {
                path:'availability',
                loadComponent:()=>import('./components/availability/availability.component').then(m=>m.AvailabilityComponent)
            },
            {
                path:'booking-create',
                loadComponent:()=>import('./components/booking-form/booking-form.component').then(m=>m.BookingFormComponent)
            },
            {
                path:'payment-list',
                loadComponent:()=>import('./components/payment-list/payment-list.component').then(m=>m.PaymentListComponent)
            },
            {
                path:'check-in-list',
                loadComponent:()=>import('./components/check-in-list/check-in-list.component').then(m=>m.CheckInListComponent)
            },

            
        ]
    },
    {
        path: '**',
        redirectTo: ''
    }
];