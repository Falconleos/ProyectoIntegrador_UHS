import { Component, OnInit, ChangeDetectorRef, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { UserService } from '../../core/services/user.service';
import { UserDtoResponse } from '../../models/User-model';
import { AuthService } from '../../core/services/auth.service';

@Component({
    selector: 'app-user-list',
    imports: [CommonModule, RouterLink],
    templateUrl: './user-list.component.html',
    styleUrls: ['./user-list.component.css']
})
export class UserListComponent implements OnInit {
  users: UserDtoResponse[] = [];
  loading = true;
  errorMessage = '';
  canModify = false;
  userAvatars: { [key: number]: string } = {};
  selectedUser: UserDtoResponse | null = null;

  // ==========================================
  // FILTRO SENCILLO (Texto de búsqueda)
  // ==========================================
  searchText = signal('');

  filteredUsers = computed(() => {
    const list = this.users;
    const search = this.searchText().toLowerCase().trim();

    if (!search) return list;

    return list.filter(user => {
      // Unimos nombre, apellido, username y DNI en una sola cadena para buscar en todos
      const name = user.name || '';
      const surname = user.surname || '';
      const username = user.username || '';
      const dni = user.dni || '';

      const searchString = `${name} ${surname} ${username} ${dni}`.toLowerCase();
      return searchString.includes(search);
    });
  });

  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchText.set(input.value);
  }
  // ==========================================

  constructor(
    private userService: UserService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.checkUserRole();
    this.loadUsers();
  }

  // Valido el rol almacenado en el localStorage para definir permisos de modificación
  checkUserRole(): void {
    const storedRoles = localStorage.getItem('role');
    if (!storedRoles) {
      this.canModify = false;
      return;
    }

    try {
      const roles = JSON.parse(storedRoles);
      const rolesArray = Array.isArray(roles) ? roles : [roles];
      
      this.canModify = rolesArray.some((r: any) => {
        const roleName = typeof r === 'string' ? r : (r?.name || '');
        return roleName === 'ROLE_ADMIN' || roleName === 'ROLE_RECEPCIONIST';
      });
    } catch (e) {
      this.canModify = false;
    }
  }

  // Invoco al servicio para obtener la lista de usuarios y precargar sus avatares
  loadUsers(): void {
    this.loading = true;
    this.errorMessage = '';
    
    this.userService.getByRole('GUEST').subscribe({
      next: (data) => {
        this.users = Array.isArray(data) ? data : [];
        this.loading = false;
        
        this.users.forEach(user => {
          this.loadUserAvatar(user);
        });

        this.cdr.markForCheck();
      },
      error: (err) => {
        this.errorMessage = 'No se pudieron cargar los huéspedes.';
        this.loading = false;
        this.cdr.markForCheck();
        console.error(err);
      }
    });
  }

  // Verifico permisos y elimino el usuario seleccionado mediante el servicio
  deleteUser(id: number): void {
    if (!this.canModify) {
      alert('No tienes los permisos necesarios para realizar esta acción.');
      return;
    }

    if (confirm('¿Estás seguro de que deseas eliminar este usuario?')) {
      this.userService.deleteUser(id).subscribe({
        next: () => {
          this.users = this.users.filter(user => user.id !== id);
          delete this.userAvatars[id];
          this.cdr.markForCheck();
        },
        error: (err) => {
          alert('Error al eliminar el usuario.');
          console.error(err);
        }
      });
    }
  }

  goToNewUser(): void {
    if (this.canModify) {
      this.router.navigate(['/dashboard/user-creation']);
    } else {
      alert('No tienes los permisos necesarios.');
    }
  }

  openUserDetail(user: UserDtoResponse): void {
    this.selectedUser = user;
    this.loadUserAvatar(user);
  }

  closeUserDetail(): void {
    this.selectedUser = null;
  }

  deleteUserModal(id: number): void {
    this.closeUserDetail();
    this.deleteUser(id);
  }

  // Solicito la imagen al servicio, genero un blob URL local y actualizo el estado
  loadUserAvatar(user: UserDtoResponse): void {
    if (!user || !user.id) return;
    if (this.userAvatars[user.id]) return;

    this.userService.getProfilePicture(user.id).subscribe({
      next: (blob) => {
        const objectURL = URL.createObjectURL(blob);
        this.userAvatars[user.id] = objectURL;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error al cargar la foto de perfil', err);
        this.userAvatars[user.id] = 'assets/default-avatar.png';
        this.cdr.markForCheck();
      }
    });
  }

  getUserAvatarUrl(user: UserDtoResponse | null): string {
    if (!user || !user.id) {
      return 'assets/default-avatar.png';
    }
    return this.userAvatars[user.id] || 'assets/default-avatar.png';
  }
}