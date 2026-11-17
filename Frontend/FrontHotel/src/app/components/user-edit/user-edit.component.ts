import { Component, OnInit, ChangeDetectorRef, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { UserService } from '../../core/services/user.service';
import { RoleType } from '../../models/User-model';

@Component({
    selector: 'app-user-edit',
    imports: [CommonModule, ReactiveFormsModule, RouterLink],
    templateUrl: './user-edit.component.html',
    styleUrls: ['../user-form/user-form.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserEditComponent implements OnInit {
  private fb = inject(NonNullableFormBuilder);
  private userService = inject(UserService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  userId: number | null = null;
  formDataLoaded = false;
  profilePictureFile: File | undefined = undefined;

  // Estados reactivos con Signals
  loading = signal(false);
  successMessage = signal('');
  errorMessage = signal('');

  // Formulario reactivo unificado sin contraseña actual
  editForm = this.fb.group({
    username: ['', Validators.required],
    name: ['', Validators.required],
    surname: ['', Validators.required],
    dni: ['', Validators.required],
    gender: [''],
    email: ['', [Validators.required, Validators.email]],
    phoneNumber: [''],
    address: [''],
    birthDay: [''],
    role: ['GUEST' as RoleType],
    enabled: [true],
    passwordSection: this.fb.group({
      newPassword: ['', [Validators.minLength(1)]],
      confirmPassword: ['']
    })
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.userId = Number(idParam);
      this.loadUserData(this.userId);
    }
  }

  loadUserData(id: number): void {
    this.loading.set(true);
    
    this.userService.getById(id).subscribe({
      next: (user: any) => {
        this.editForm.patchValue({
          username: user.username || '',
          name: user.name || '',
          surname: user.surname || '',
          dni: user.dni || '',
          gender: user.gender || '',
          email: user.email || '',
          phoneNumber: user.phoneNumber || '',
          address: user.address || '',
          birthDay: user.birthDay || '',
          role: user.role || 'GUEST',
          enabled: user.enabled ?? true
        });

        this.formDataLoaded = true;
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set('No se pudieron cargar los datos del usuario.');
        this.cdr.markForCheck();
        console.error(err);
      }
    });
  }

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      this.profilePictureFile = file;
    }
  }

  onSubmit(): void {
    if (!this.userId) return;

    this.errorMessage.set('');
    this.successMessage.set('');

    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const formVal = this.editForm.getRawValue();
    const passVal = formVal.passwordSection;

    // Detectar si el usuario quiere cambiar la contraseña
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

    this.loading.set(true);

    const updatePayload = {
      username: formVal.username,
      name: formVal.name,
      surname: formVal.surname,
      dni: formVal.dni,
      gender: formVal.gender || undefined,
      email: formVal.email,
      phoneNumber: formVal.phoneNumber || undefined,
      address: formVal.address || undefined,
      birthDay: formVal.birthDay ? formVal.birthDay : ''
    };

    // 1. Actualizar los datos generales del usuario
    this.userService.updateUser(this.userId, updatePayload).subscribe({
      next: () => {
        // 2. Si se indicó cambio de contraseña, la actualizamos mediante el nuevo endpoint por ID
        if (isChangingPassword && this.userId) {
          this.userService.updatePasswordWithoutCurrent(this.userId, passVal.newPassword).subscribe({
            next: () => {
              this.handleImageUploadOrFinish();
            },
            error: (err: any) => {
              this.loading.set(false);
              const msg = err.error?.mensaje || err.error?.message || 'Error al actualizar la contraseña.';
              this.errorMessage.set(msg);
              this.cdr.markForCheck();
            }
          });
        } else {
          this.handleImageUploadOrFinish();
        }
      },
      error: (err: any) => {
        this.loading.set(false);
        const msg = err.error?.mensaje || err.error?.message || 'Error al actualizar el usuario.';
        this.errorMessage.set(msg);
        this.cdr.markForCheck();
      }
    });
  }

  handleImageUploadOrFinish(): void {
    if (this.profilePictureFile && this.userId) {
      const formData = new FormData();
      formData.append('profilePicture', this.profilePictureFile);

      this.userService.updateProfilePicture(this.userId, formData).subscribe({
        next: () => {
          this.finalizeSuccess('¡Modificación realizada con éxito!');
        },
        error: (err) => {
          console.error('Error al actualizar la foto', err);
          this.finalizeSuccess('Se guardaron los datos, pero hubo un error al actualizar la foto de perfil.');
        }
      });
    } else {
      this.finalizeSuccess('¡Modificación realizada con éxito!');
    }
  }

  finalizeSuccess(message: string): void {
    this.loading.set(false);
    this.successMessage.set(message);
    alert(message);
    this.router.navigate(['/dashboard/usuarios']);
  }
}