import { Component, inject, OnInit, signal } from '@angular/core';
import {
  ReactiveFormsModule,
  NonNullableFormBuilder,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs'; // 👈 Importante

import { EmployeeService } from '../../../core/services/employee.service';
import { UserService } from '../../../core/services/user.service'; // 👈 Asegúrate de tenerlo inyectado

import {
  EmployeeDtoRequest,
  EmployeeDtoResponse,
  ShiftType
} from '../../../models/Employee-model';

@Component({
  selector: 'app-employee-edit',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './employee-edit.component.html',
  styleUrl: './employee-edit.component.css'
})
export class EmployeeEditComponent implements OnInit {

  private fb = inject(NonNullableFormBuilder);
  private employeeService = inject(EmployeeService);
  private userService = inject(UserService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  employeeId = signal<number | null>(null);
  employee = signal<EmployeeDtoResponse | null>(null);
  selectedProfilePicture: File | null = null;

  loading = signal(false);
  saving = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  readonly availableShifts: ShiftType[] = [
    'MORNING',
    'AFTERNOON',
    'NIGHT'
  ];

  employeeForm = this.fb.group({
    username: ['', [Validators.required]],
    name: ['', [Validators.required]],
    surname: ['', [Validators.required]],
    dni: ['', [Validators.required]],
    gender: [''],
    email: ['', [Validators.required, Validators.email]],
    phoneNumber: [''],
    address: [''],
    birthDay: [''],

    employeeNumber: [''],
    hireDate: ['', [Validators.required]],
    shift: this.fb.control<ShiftType>('MORNING', [Validators.required]),
    salary: [0, [Validators.required, Validators.min(0.01)]]
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = Number(idParam);

    if (!idParam || !Number.isSafeInteger(id) || id <= 0) {
      this.errorMessage.set('El ID del empleado no es válido.');
      return;
    }

    this.employeeId.set(id);
    this.loadEmployee(id);
  }

  loadEmployee(id: number): void {
    this.loading.set(true);
    this.errorMessage.set('');

    // Consultamos empleado y usuario en paralelo ya que comparten el mismo ID
    forkJoin({
      employee: this.employeeService.getById(id),
      user: this.userService.getById(id)
    }).subscribe({
      next: ({ employee, user }: { employee: any, user: any }) => {
        this.employee.set(employee);

        this.employeeForm.patchValue({
          // Datos completos del usuario
          username: user.username || '',
          name: user.name || '',
          surname: user.surname || '',
          dni: user.dni || '',
          gender: user.gender || '',
          email: user.email || '',
          phoneNumber: user.phoneNumber || '',
          address: user.address || '',
          birthDay: user.birthDay || '',

          // Datos laborales del empleado
          employeeNumber: employee.employeeNumber || '',
          hireDate: employee.hireDate || '',
          shift: employee.shift || 'MORNING',
          salary: employee.salary || 0
        });

        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error al cargar datos:', err);
        this.errorMessage.set('No se pudieron cargar los datos del empleado.');
        this.loading.set(false);
      }
    });
  }

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      this.selectedProfilePicture = file;
    }
  }

 onSubmit(): void {
    if (this.saving() || this.loading()) return;

    const id = this.employeeId();
    if (id === null) return;

    if (this.employeeForm.invalid) {
      this.employeeForm.markAllAsTouched();
      return;
    }

    const formValue = this.employeeForm.getRawValue();

    const updatePayload: EmployeeDtoRequest = {
      userId: id,
      username: formValue.username,
      name: formValue.name,
      surname: formValue.surname,
      dni: formValue.dni,
      gender: formValue.gender || undefined,
      email: formValue.email,
      phoneNumber: formValue.phoneNumber || undefined,
      address: formValue.address || undefined,
      birthDay: formValue.birthDay || undefined,
      employeeNumber: formValue.employeeNumber || undefined,
      hireDate: formValue.hireDate,
      shift: formValue.shift,
      salary: Number(formValue.salary)
    };

    this.saving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.employeeService.update(id, updatePayload).subscribe({
      next: () => {
        if (this.selectedProfilePicture) {
          this.uploadProfilePicture(id, this.selectedProfilePicture);
        } else {
          this.saving.set(false);
          this.successMessage.set('Empleado y usuario actualizados correctamente.');
          this.router.navigate(['/dashboard/employee-list']);
        }
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'No se pudo actualizar la información.');
        this.saving.set(false);
      }
    });
  }

  uploadProfilePicture(userId: number, file: File): void {
    const formData = new FormData();
    formData.append('profilePicture', file);

    this.userService.updateProfilePicture(userId, formData).subscribe({
      next: () => {
        this.saving.set(false);
        this.successMessage.set('Empleado, usuario y foto actualizados correctamente.');
        this.router.navigate(['/dashboard/employee-list']);
      },
      error: () => {
        this.saving.set(false);
        this.successMessage.set('Se guardaron los datos, pero hubo un error al actualizar la foto.');
        this.router.navigate(['/dashboard/employee-list']);
      }
    });
  }
}