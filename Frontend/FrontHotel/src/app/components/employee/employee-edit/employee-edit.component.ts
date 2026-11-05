
import { Component, inject, OnInit, signal } from '@angular/core';
import {
  ReactiveFormsModule,
  NonNullableFormBuilder,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { EmployeeService } from '../../../core/services/employee.service';

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
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  employeeId = signal<number | null>(null);
  employee = signal<EmployeeDtoResponse | null>(null);

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
    employeeNumber: [''],

    hireDate: ['', [
      Validators.required
    ]],

    shift: this.fb.control<ShiftType>('MORNING', [
      Validators.required
    ]),

    salary: [0, [
      Validators.required,
      Validators.min(0.01)
    ]]
  });

  ngOnInit(): void { //Confirma id valido y carga empleado de interes
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = Number(idParam);

    if (!idParam || !Number.isSafeInteger(id) || id <= 0) {
      this.errorMessage.set('El ID del empleado no es válido.');
      return;
    }

    this.employeeId.set(id);
    this.loadEmployee(id);
  }

  loadEmployee(id: number): void { //consulta al backend y completa el formulario.
    this.loading.set(true);
    this.errorMessage.set('');

    this.employeeService.getById(id).subscribe({
      next: (employee) => { //Si encuentra al empleado, lo modifica
        this.employee.set(employee);

        this.employeeForm.patchValue({
          employeeNumber: employee.employeeNumber ?? '',
          hireDate: employee.hireDate,
          shift: employee.shift,
          salary: employee.salary
        });

        this.loading.set(false);
      },

      error: () => {
        this.errorMessage.set('No se pudieron cargar los datos del empleado.');
        this.loading.set(false);
      }
    });
  }

  onSubmit(): void {
    if (this.saving() || this.loading()) {
      return;
    }

    const id = this.employeeId();
    const currentEmployee = this.employee();

    if (id === null || currentEmployee === null) {
      this.errorMessage.set(
        'No se encontró el empleado que desea editar.'
      );
      return;
    }

    if (this.employeeForm.invalid) {
      this.employeeForm.markAllAsTouched();
      return;
    }

    const formValue = this.employeeForm.getRawValue();

    const updatedEmployee: EmployeeDtoRequest = {
      userId: id,
      employeeNumber: formValue.employeeNumber || undefined,
      emergencyPhoneNumber:
        currentEmployee.emergencyPhoneNumber,
      hireDate: formValue.hireDate,
      shift: formValue.shift,
      salary: Number(formValue.salary)
    };

    this.saving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.employeeService.update(id, updatedEmployee).subscribe({
      next: () => {
        this.saving.set(false);
        this.successMessage.set('Empleado actualizado correctamente.');
        this.router.navigate(['/dashboard/employee-list']);
      },

      error: () => {
        this.errorMessage.set('No se pudo actualizar el empleado.');
        this.saving.set(false);
      }
    });
  }
}

