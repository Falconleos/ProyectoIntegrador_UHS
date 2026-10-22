import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { UserService } from '../../core/services/user.service';
import { RoleType, UserDtoRequest } from '../../models/User-model';

@Component({
  selector: 'app-user-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './user-edit.component.html',
  styleUrls: ['../user-form/user-form.component.css'] // Reutilizamos los estilos del formulario de creación
})
export class UserEditComponent implements OnInit {
  userId: number | null = null;

  formData = {
    username: '',
    name: '',
    surname: '',
    dni: '',
    gender: '',
    email: '',
    phoneNumber: '',
    address: '',
    birthDay: '',
    profilePictureFile: undefined as File | undefined,
    role: 'GUEST' as RoleType,
    enabled: true
  };

  loading = false;
  errorMessage = '';

  constructor(
    private userService: UserService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.userId = Number(idParam);
      this.loadUserData(this.userId);
    }
  }

  loadUserData(id: number): void {
    this.loading = true;
    this.userService.getById(id).subscribe({
      next: (user: any) => {
        this.formData.username = user.username || '';
        this.formData.name = user.name || '';
        this.formData.surname = user.surname || '';
        this.formData.dni = user.dni || '';
        this.formData.gender = user.gender || '';
        this.formData.email = user.email || '';
        this.formData.phoneNumber = user.phoneNumber || '';
        this.formData.address = user.address || '';
        this.formData.birthDay = user.birthDay || '';
        this.formData.role = user.role || 'GUEST';
        this.formData.enabled = user.enabled ?? true;

        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = 'No se pudieron cargar los datos del usuario.';
        this.cdr.markForCheck();
        console.error(err);
      }
    });
  }

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      this.formData.profilePictureFile = file;
    }
  }

  onSubmit(): void {
    if (!this.userId) return;

    this.errorMessage = '';
    this.loading = true;

    // Incluimos la contraseña vacía o por defecto para satisfacer la validación del backend
    const updatePayload: UserDtoRequest = {
      username: this.formData.username,
      password: '', // <--- Enviamos esto para que el backend no lance el error de que es necesaria
      name: this.formData.name,
      surname: this.formData.surname,
      dni: this.formData.dni,
      gender: this.formData.gender || undefined,
      email: this.formData.email,
      phoneNumber: this.formData.phoneNumber || undefined,
      address: this.formData.address || undefined,
      birthDay: this.formData.birthDay ? this.formData.birthDay : ''
    };

    this.userService.updateUser(this.userId, updatePayload).subscribe({
      next: () => {
        this.loading = false;
        alert('¡Usuario modificado con éxito!');
        this.router.navigate(['/dashboard/usuarios']);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.mensaje || err.error?.message || 'Error al actualizar el usuario.';
        this.cdr.markForCheck();
        alert(this.errorMessage);
        console.error(err);
      }
    });
  }
}