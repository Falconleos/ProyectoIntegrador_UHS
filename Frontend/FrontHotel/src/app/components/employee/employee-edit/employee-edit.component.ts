import { Component, inject, OnInit, signal, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import {
  ReactiveFormsModule,
  NonNullableFormBuilder,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { EmployeeService } from '../../../core/services/employee.service';
import { UserService } from '../../../core/services/user.service';

import {
  EmployeeDtoRequest,
  EmployeeDtoResponse,
  ShiftType
} from '../../../models/Employee-model';

@Component({
    selector: 'app-employee-edit',
    imports: [ReactiveFormsModule, RouterLink],
    templateUrl: './employee-edit.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush, // Recomendado cambiar a OnPush igual que en usuario
    styleUrl: './employee-edit.component.css'
})
export class EmployeeEditComponent implements OnInit {

  private fb = inject(NonNullableFormBuilder);
  private employeeService = inject(EmployeeService);
  private userService = inject(UserService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef); // Añadido para refrescar la vista con signals/OnPush

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

  // 1. Añadimos el group de passwordSection igual que en usuarios
  employeeForm = this.fb.group({
    username: ['', [Validators.required]],
    name: ['', [Validators.required]],
    surname: ['', [Validators.required]],
    dni: ['', [Validators.required]],
    gender: [''],
    email: ['', [Validators.required, Validators.email]],
    phoneNumber: [''],
    emergencyPhoneNumber: [''],
    address: [''],
    birthDay: [''],

    employeeNumber: [''],
    hireDate: ['', [Validators.required]],
    shift: this.fb.control<ShiftType>('MORNING', [Validators.required]),
    salary: [0, [Validators.required, Validators.min(0.01)]],
    
    passwordSection: this.fb.group({
      newPassword: ['', [Validators.minLength(1)]],
      confirmPassword: ['']
    })
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

    forkJoin({
      employee: this.employeeService.getById(id),
      user: this.userService.getById(id)
    }).subscribe({
      next: ({ employee, user }: { employee: any, user: any }) => {
        this.employee.set(employee);

        this.employeeForm.patchValue({
          username: user.username || '',
          name: user.name || '',
          surname: user.surname || '',
          dni: user.dni || '',
          gender: user.gender || employee.gender || '', // 👈 Busca primero en user y como respaldo en employee
          email: user.email || '',
          phoneNumber: user.phoneNumber || '',
          address: user.address || '',
          birthDay: user.birthDay || '',

          employeeNumber: employee.employeeNumber || '',
          emergencyPhoneNumber: employee.emergencyPhoneNumber || '',
          hireDate: employee.hireDate || '',
          shift: employee.shift || 'MORNING',
          salary: employee.salary || 0
        });

        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error al cargar datos:', err);
        this.errorMessage.set('No se pudieron cargar los datos del empleado.');
        this.loading.set(false);
        this.cdr.markForCheck();
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

    this.errorMessage.set('');
    this.successMessage.set('');

    if (this.employeeForm.invalid) {
      this.employeeForm.markAllAsTouched();
      return;
    }

    const formValue = this.employeeForm.getRawValue();
    const passVal = formValue.passwordSection;

    // 2. Validar las contraseñas si el usuario intenta cambiarlas
    const isChangingPassword = !!passVal.newPassword || !!passVal.confirmPassword;
    
    if (isChangingPassword) {
      if (!passVal.newPassword || !passVal.confirmPassword) {
        this.errorMessage.set('Para cambiar la contraseña, debés completar ambos campos de la sección de contraseña.');
        return;
      }
      if (passVal.newPassword !== passVal.confirmPassword) {
        this.errorMessage.set('La nueva contraseña y su confirmación no coinciden.');
        return;
      }
    }

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
      emergencyPhoneNumber: formValue.emergencyPhoneNumber || undefined,
      hireDate: formValue.hireDate,
      shift: formValue.shift,
      salary: Number(formValue.salary)
    };

    this.saving.set(true);

    // 3. Actualizar datos laborales y de empleado primero
    this.employeeService.update(id, updatePayload).subscribe({
      next: () => {
        // 4. Si se indicó cambio de contraseña, la actualizamos
        if (isChangingPassword) {
          this.userService.updatePasswordWithoutCurrent(id, passVal.newPassword).subscribe({
            next: () => {
              this.handleImageUploadOrFinish(id);
            },
            error: (err: any) => {
              this.saving.set(false);
              const msg = err.error?.mensaje || err.error?.message || 'Error al actualizar la contraseña.';
              this.errorMessage.set(msg);
              this.cdr.markForCheck();
            }
          });
        } else {
          this.handleImageUploadOrFinish(id);
        }
      },
      error: (err: any) => {
        this.saving.set(false);
        const msg = err.error?.mensaje || err.error?.message || 'No se pudo actualizar la información.';
        this.errorMessage.set(msg);
        this.cdr.markForCheck();
      }
    });
  }

  handleImageUploadOrFinish(userId: number): void {
    if (this.selectedProfilePicture) {
      const formData = new FormData();
      formData.append('profilePicture', this.selectedProfilePicture);

      this.userService.updateProfilePicture(userId, formData).subscribe({
        next: () => {
          this.finalizeSuccess('Empleado, usuario y foto actualizados correctamente.');
        },
        error: () => {
          this.finalizeSuccess('Se guardaron los datos, pero hubo un error al actualizar la foto.');
        }
      });
    } else {
      this.finalizeSuccess('Empleado y usuario actualizados correctamente.');
    }
  }

  finalizeSuccess(message: string): void {
    this.saving.set(false);
    this.successMessage.set(message);
    alert(message);
    this.router.navigate(['/dashboard/employee-list']);
  }
}