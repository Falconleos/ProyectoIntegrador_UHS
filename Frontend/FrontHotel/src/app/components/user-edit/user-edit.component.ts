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

    // Usamos el DTO de modificación que no requiere password
    const updatePayload = {
      username: this.formData.username,
      name: this.formData.name,
      surname: this.formData.surname,
      dni: this.formData.dni,
      gender: this.formData.gender || undefined,
      email: this.formData.email,
      phoneNumber: this.formData.phoneNumber || undefined,
      address: this.formData.address || undefined,
      birthDay: this.formData.birthDay ? this.formData.birthDay : ''
    };

    // 1. Primero actualizamos los datos de texto
    this.userService.updateUser(this.userId, updatePayload).subscribe({
      next: () => {
        // 2. Si el usuario seleccionó una foto nueva, la subimos en paralelo/secuencia
        if (this.formData.profilePictureFile && this.userId) {
          this.onUploadPhoto(this.userId, this.formData.profilePictureFile);
        } else {
          this.loading = false;
          alert('¡Usuario modificado con éxito!');
          this.router.navigate(['/dashboard/usuarios']);
        }
      },
      error: (err: any) => {
        this.loading = false;
        this.errorMessage = err.error?.mensaje || err.error?.message || 'Error al actualizar el usuario.';
        this.cdr.markForCheck();
        alert(this.errorMessage);
        console.error(err);
      }
    });
  }

  onUploadPhoto(userId: number, file: File): void {
    const formData = new FormData();
    formData.append('profilePicture', file);

    this.userService.updateProfilePicture(userId, formData).subscribe({
      next: (response: any) => {
        this.loading = false;
        console.log('Foto de perfil actualizada con éxito', response);
        alert('¡Usuario y foto de perfil modificados con éxito!');
        this.router.navigate(['/dashboard/usuarios']);
      },
      error: (err: any) => {
        this.loading = false;
        console.error('Error al actualizar la foto', err);
        alert('Se guardaron los datos, pero hubo un error al actualizar la foto de perfil.');
        this.router.navigate(['/dashboard/usuarios']);
      }
    });
  }

}