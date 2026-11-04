
import { Component, inject, signal } from '@angular/core';
import {
  ReactiveFormsModule,
  NonNullableFormBuilder,
  Validators
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { EmployeeService } from '../../../core/services/employee.service';

import {
  EmployeeCreateUnifiedDTO,
  RoleType,
  ShiftType
} from '../../../models/Employee-model';

@Component({
  selector: 'app-employee-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './employee-form.component.html',
  styleUrl: './employee-form.component.css'
})
export class EmployeeFormComponent {

  private fb = inject(NonNullableFormBuilder);
  private employeeService = inject(EmployeeService);
  private router = inject(Router);

  saving = signal(false);
  errorMessage = signal('');
  fileError = signal('');

  selectedFile = signal<File | null>(null);

  availableRoles: RoleType[] = [
    'ADMIN',
    'RECEPCIONIST',
    'HOUSEKEEPING',
    'MAINTENANCE',
    'RELIEF_STAFF'
  ];

  availableShifts: ShiftType[] = [
    'MORNING',
    'AFTERNOON',
    'NIGHT'
  ];

  availableGenders: string[] = [
    'MASCULINO',
    'FEMENINO',
    'OTRO',
    'PREFIERO NO DECIR'
  ];

  private getTodayDate(): string {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  employeeForm = this.fb.group({

    // Datos del usuario
    username: ['', [
      Validators.required
    ]],

    password: ['', [
      Validators.required
    ]],

    name: ['', [
      Validators.required,
      Validators.minLength(3),
      Validators.maxLength(50)
    ]],

    surname: ['', [
      Validators.required,
      Validators.minLength(3),
      Validators.maxLength(50)
    ]],

    dni: ['', [
      Validators.required,
      Validators.pattern(/^\d{7,10}$/)
    ]],

    gender: ['MASCULINO', [
      Validators.maxLength(20)
    ]],

    email: ['', [
      Validators.required,
      Validators.email
    ]],

    phoneNumber: ['', [
      Validators.maxLength(15)
    ]],

    address: ['', [
      Validators.maxLength(150)
    ]],

    birthDay: ['', [
      Validators.required
    ]],

    role: this.fb.control<RoleType>('RECEPCIONIST', [
      Validators.required
    ]),

    // Datos laborales
    employeeNumber: [''],

    emergencyPhoneNumber: [''],

    hireDate: [this.getTodayDate()],

    shift: this.fb.control<ShiftType>('MORNING'),

    salary: [0]

  });

  // Capturar y validar fotografía
  onFileSelected(event: Event): void {

    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    this.fileError.set('');
    this.selectedFile.set(null);

    if (!file) {
      return;
    }

    const maxSizeInBytes = 2 * 1024 * 1024;

    if (file.size > maxSizeInBytes) {
      const fileSizeMb = (file.size / (1024 * 1024)).toFixed(1);

      this.fileError.set(`La imagen pesa ${fileSizeMb} MB. El tamaño máximo permitido es de 2 MB.`);

      input.value = '';
      return;
    }

    this.selectedFile.set(file);
  }

  // Guardar empleado
  onSubmit(): void {

    if (this.employeeForm.invalid) {
      this.employeeForm.markAllAsTouched();
      return;
    }

    if (this.fileError()) {
      return;
    }

    if (this.saving()) {
      return;
    }

    const formValue = this.employeeForm.getRawValue();

    // La fecha de nacimiento debe ser anterior a hoy
    if (formValue.birthDay >= this.getTodayDate()) {
      this.errorMessage.set('La fecha de nacimiento debe ser anterior a hoy.');
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');

    const employee: EmployeeCreateUnifiedDTO = {

      // Datos del usuario
      username: formValue.username,
      password: formValue.password,
      name: formValue.name,
      surname: formValue.surname,
      dni: formValue.dni,

      gender: formValue.gender || undefined,

      email: formValue.email,

      phoneNumber: formValue.phoneNumber || undefined,
      address: formValue.address || undefined,

      birthDay: formValue.birthDay,
      role: formValue.role,

      profilePictureFile: this.selectedFile() || undefined,

      // Datos laborales
      employeeNumber: formValue.employeeNumber || undefined,

      emergencyPhoneNumber:
        formValue.emergencyPhoneNumber || undefined,

      hireDate: formValue.hireDate || this.getTodayDate(),

      shift: formValue.shift,
      salary: Number(formValue.salary)
    };

    this.employeeService.create(employee).subscribe({
      next: () => {
        this.saving.set(false);
        this.router.navigate(['/dashboard/employees']);
      },

      error: () => {
        this.errorMessage.set('No se pudo registrar el empleado. Verificá que el DNI, email y nombre de usuario no estén registrados.');
        this.saving.set(false);
      }
    });
  }
}
