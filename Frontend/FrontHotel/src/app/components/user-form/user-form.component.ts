import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { UserService } from '../../core/services/user.service';
import { UserDtoRequestCreation, UserDtoRequest, RoleType } from '../../models/User-model';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './user-form.component.html',
  styleUrls: ['./user-form.component.css']
})
export class UserFormComponent implements OnInit {
  userId: number | null = null;
  isEditMode = false;

  formData = {
    username: '',
    password: '',
    name: '',
    surname: '',
    dni: '',
    gender: '',
    email: '',
    phoneNumber: '',
    address: '',
    birthDay: '',
    role: 'GUEST' as RoleType,
    profilePictureFile: undefined as File | undefined,
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
      this.isEditMode = true;
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
        this.formData.enabled = user.enabled ?? true;
        this.formData.role = user.role || 'GUEST';
        
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = 'No se pudieron cargar los datos del usuario para editar.';
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
    this.errorMessage = '';
    this.loading = true;

    if (this.isEditMode && this.userId) {
      // Payload para actualizar
      const updatePayload: UserDtoRequest = {
        username: this.formData.username,
        name: this.formData.name,
        surname: this.formData.surname,
        dni: this.formData.dni,
        gender: this.formData.gender,
        email: this.formData.email,
        phoneNumber: this.formData.phoneNumber,
        address: this.formData.address || undefined,
        birthDay: this.formData.birthDay ? this.formData.birthDay : '',
      };

      this.userService.updateUser(this.userId, updatePayload).subscribe({
        next: () => {
          this.loading = false;
          alert('¡Usuario actualizado con éxito!');
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

    } else {
      // Payload para crear
      const createPayload: UserDtoRequestCreation = {
        username: this.formData.username,
        password: this.formData.password,
        name: this.formData.name,
        surname: this.formData.surname,
        dni: this.formData.dni,
        gender: this.formData.gender,
        email: this.formData.email,
        phoneNumber: this.formData.phoneNumber,
        address: this.formData.address || undefined,
        birthDay: this.formData.birthDay ? this.formData.birthDay : undefined,
        role: this.formData.role,
        profilePictureFile: this.formData.profilePictureFile,
        enabled: this.formData.enabled
      };

      this.userService.createUser(createPayload).subscribe({
        next: () => {
          this.loading = false;
          alert('¡Usuario creado con éxito!');
          this.router.navigate(['/dashboard/usuarios']);
        },
        error: (err) => {
          this.loading = false;
          this.errorMessage = err.error?.mensaje || err.error?.message || 'Error al registrar el usuario.';
          this.cdr.markForCheck();
          alert(this.errorMessage);
          console.error(err);
        }
      });
    }
  }
}