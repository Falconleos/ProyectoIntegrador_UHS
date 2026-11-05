
import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  ReactiveFormsModule,
  NonNullableFormBuilder,
  Validators
} from '@angular/forms';

import { EmployeeService } from '../../../core/services/employee.service';
import { UserService } from '../../../core/services/user.service';

import { EmployeeDtoResponse , ShiftType} from '../../../models/Employee-model';
import { UserDtoResponse } from '../../../models/User-model';

@Component({
  selector: 'app-employee-list',
  standalone: true,
  imports: [RouterLink, DecimalPipe, ReactiveFormsModule],
  templateUrl: './employee-list.component.html',
  styleUrl: './employee-list.component.css'
})
export class EmployeeListComponent implements OnInit, OnDestroy {

  private employeeService = inject(EmployeeService);
  private userService = inject(UserService);

  private fb = inject(NonNullableFormBuilder);

  employees = signal<EmployeeDtoResponse[]>([]);
  loading = signal(false);
  errorMessage = signal('');

  isAdmin = signal(false);

  selectedEmployee = signal<EmployeeDtoResponse | null>(null);
  selectedUser = signal<UserDtoResponse | null>(null);

  detailLoading = signal(false);
  detailError = signal('');

  employeeAvatars = signal<Record<number, string>>({});
  employeeRoles = signal<Record<number, string>>({});

  deletingId = signal<number | null>(null);

  defaultAvatar = 'assets/default-avatar.png';

  selectedEmployeeForShift = signal<EmployeeDtoResponse | null>(null);
  updatingShift = signal(false);
  shiftError = signal('');

  readonly availableShifts: ShiftType[] = [
    'MORNING',
    'AFTERNOON',
    'NIGHT'
  ];

  shiftForm = this.fb.group({
    shift: this.fb.control<ShiftType>('MORNING', [
      Validators.required
    ])
  });

  ngOnInit(): void {
    this.checkUserRole(); //verifica si el usuario actual es administrador.
    this.loadEmployees(); //consulta los empleados al backend.
  }

  checkUserRole(): void {
    const storedRoles = localStorage.getItem('role'); //Busca una propiedad llamada role dentro del almacenamiento local del navegador. Puede contener un unico rol o varios roles en un arreglo

    if (!storedRoles) {
      this.isAdmin.set(false);
      return;
    }

    try {
      const roles = JSON.parse(storedRoles); 
      const roleList = Array.isArray(roles) ? roles : [roles]; //Si ya es un arreglo, lo conserva. Si no lo es, crea un arreglo con ese único elemento.

      const admin = roleList.some((role: unknown) => { //some() devuelve true cuando al menos un elemento del arreglo cumple la condición.
        if (typeof role === 'string') {
          return role === 'ADMIN' || role === 'ROLE_ADMIN';
        }

        if (typeof role === 'object' && role !== null) {
          const data = role as Record<string, unknown>;
          return (
            data['authority'] === 'ADMIN' ||
            data['authority'] === 'ROLE_ADMIN' ||
            data['name'] === 'ADMIN' ||
            data['name'] === 'ROLE_ADMIN'
          );
        }

        return false;
      });

      this.isAdmin.set(admin);

    } catch {
      this.isAdmin.set(
        storedRoles === 'ADMIN' || storedRoles === 'ROLE_ADMIN'
      );
    }
  }

  loadEmployees(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.employeeService.getAll().subscribe({
      next: (data) => {
        const employees = Array.isArray(data) ? data : [];

        this.employees.set(employees);
        this.loading.set(false);

        employees.forEach(employee => {
          this.loadEmployeeAvatar(employee.id);  //Solicitudes asincronas
          this.loadEmployeeRole(employee.id);
        });
      },
      error: () => {
        this.errorMessage.set('No se pudieron cargar los empleados o no tienes permisos.');
        this.loading.set(false);
      }
    });
  }

  
private loadEmployeeRole(employeeId: number): void {
  this.userService.getById(employeeId).subscribe({
    next: (user) => {

      const roleNames = user.roles.map(role => role.name);

      const roles = roleNames.join(', ') || 'N/A';

      this.employeeRoles.update(currentRoles => ({
        ...currentRoles,
        [employeeId]: roles
      }));
    },
    error: () => {
      this.employeeRoles.update(currentRoles => ({
        ...currentRoles,
        [employeeId]: 'N/A'
      }));
    }
  });
}


  getEmployeeRole(employeeId: number): string {
    return this.employeeRoles()[employeeId] || 'Cargando...';
  }

  private loadEmployeeAvatar(employeeId: number): void {
    if (this.employeeAvatars()[employeeId]) {
      return;
    }

    this.userService.getProfilePicture(employeeId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);

        this.employeeAvatars.update(avatars => ({
          ...avatars,
          [employeeId]: url
        }));
      },
      error: () => {
        this.employeeAvatars.update(avatars => ({
          ...avatars,
          [employeeId]: this.defaultAvatar
        }));
      }
    });
  }

  getEmployeeAvatarUrl(employeeId: number): string {
    return this.employeeAvatars()[employeeId] || this.defaultAvatar;
  }

  openEmployeeDetail(employee: EmployeeDtoResponse): void {
    this.selectedEmployee.set(employee);
    this.selectedUser.set(null);

    this.detailLoading.set(true);
    this.detailError.set('');

    this.userService.getById(employee.id).subscribe({
      next: (user) => {
        if (this.selectedEmployee()?.id !== employee.id) {
          return;
        }

        this.selectedUser.set(user);
        this.detailLoading.set(false);
      },
      error: () => {
        if (this.selectedEmployee()?.id !== employee.id) {
          return;
        }
        this.detailError.set('No se pudo cargar la información del usuario asociado.');
        this.detailLoading.set(false);
      }
    });
  }

  closeEmployeeDetail(): void {
    this.selectedEmployee.set(null);
    this.selectedUser.set(null);
    this.detailError.set('');
    this.detailLoading.set(false);
  }

  
openShiftForm(employee: EmployeeDtoResponse): void {
  if (!this.isAdmin() || this.updatingShift()) {
    return;
  }

  this.selectedEmployeeForShift.set(employee);
  this.shiftError.set('');

  this.shiftForm.reset({
    shift: employee.shift
  });
}

cancelShiftChange(): void {
  if (this.updatingShift()) {
    return;
  }

  this.selectedEmployeeForShift.set(null);
  this.shiftError.set('');
  this.shiftForm.reset();
}

saveShiftChange(): void {
  if (!this.isAdmin()) {
    this.shiftError.set(
      'No tienes permisos para cambiar el turno.'
    );
    return;
  }

  const employee = this.selectedEmployeeForShift();

  if (!employee || this.updatingShift()) {
    return;
  }

  if (this.shiftForm.invalid) {
    this.shiftForm.markAllAsTouched();
    return;
  }

  const nuevoShift = this.shiftForm.controls.shift.value;

  if (nuevoShift === employee.shift) {
    this.shiftError.set(
      'Debe seleccionar un turno diferente al actual.'
    );
    return;
  }

  this.updatingShift.set(true);
  this.shiftError.set('');

  this.employeeService.updateShift(
    employee.id,
    nuevoShift
  ).subscribe({
    next: (updatedEmployee) => {

      this.employees.update(employees =>
        employees.map(current =>
          current.id === updatedEmployee.id
            ? updatedEmployee
            : current
        )
      );

      if (this.selectedEmployee()?.id === updatedEmployee.id) {
        this.selectedEmployee.set(updatedEmployee);
      }

      this.updatingShift.set(false);
      this.selectedEmployeeForShift.set(null);
      this.shiftForm.reset();
    },

    error: () => {

      this.shiftError.set('No se pudo actualizar el turno del empleado.');
      this.updatingShift.set(false);
    }
  });
}


  deleteEmployee(id: number): void {
    if (!this.isAdmin()) {
      this.errorMessage.set('No tienes permisos para eliminar empleados.');
      return;
    }

    if (this.deletingId() !== null) {
      return;
    }

    this.deletingId.set(id);
    this.errorMessage.set('');

    this.employeeService.delete(id).subscribe({
      next: () => {
        this.employees.update(employees =>
          employees.filter(employee => employee.id !== id)
        );

        const avatar = this.employeeAvatars()[id];

        if (avatar?.startsWith('blob:')) {
          URL.revokeObjectURL(avatar);
        }

        this.employeeAvatars.update(avatars => {
          const updated = { ...avatars };
          delete updated[id];
          return updated;
        });

        this.employeeRoles.update(roles => {
          const updated = { ...roles };
          delete updated[id];
          return updated;
        });

        if (this.selectedEmployee()?.id === id) {
          this.closeEmployeeDetail();
        }

        if (this.selectedEmployeeForShift()?.id === id) {
          this.cancelShiftChange();
        }

        this.deletingId.set(null);
      },
      error: () => {

        this.errorMessage.set(
          'No se pudo eliminar el empleado.'
        );

        this.deletingId.set(null);
      }
    });
  }

  ngOnDestroy(): void {
    Object.values(this.employeeAvatars()).forEach(url => {
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
  }

}