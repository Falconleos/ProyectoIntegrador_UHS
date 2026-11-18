import { Component, OnInit, ChangeDetectorRef, signal, computed, ChangeDetectionStrategy, inject } from '@angular/core';

import { Router, RouterLink } from '@angular/router';
import { UserService } from '../../core/services/user.service';
import { UserDtoResponse } from '../../models/User-model';
import { AuthService } from '../../core/services/auth.service';

@Component({
    selector: 'app-user-list',
    imports: [RouterLink],
    templateUrl: './user-list.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrls: ['./user-list.component.css']
})
export class UserListComponent implements OnInit {
  users: UserDtoResponse[] = [];
  loading = true;
  errorMessage = '';
  canModify = false;
  userAvatars: { [key: number]: string } = {};
  selectedUser: UserDtoResponse | null = null;

  private userService = inject(UserService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  
  ngOnInit(): void {
    this.checkUserRole(); //Comprueba rol del usuario
    this.loadUsers(); //Carga lista de huéspedes
  }

  // Valido el rol almacenado en el localStorage para definir permisos de modificación
  checkUserRole(): void {
    const storedRoles = localStorage.getItem('role');
    if (!storedRoles) {
      this.canModify = false;
      return;
    }

    try { //seteo canModify a true si el usuario tiene rol ADMIN o RECEPCIONIST
      const roles = JSON.parse(storedRoles); // Puede ser un array o un string
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
    
    this.userService.getByRole('GUEST').subscribe({ //solicita lista huespedes
      next: (data) => {
        this.users = Array.isArray(data) ? data : []; //verifica existencia de arreglo
        this.loading = false;
        
        this.users.forEach(user => { //solicita imagen de erfil para cada huesped
          this.loadUserAvatar(user);
        });

        this.cdr.markForCheck(); //avisa a Angular que se han producido cambios en el estado y que debe actualizar la vista
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
          window.location.reload(); // Recarga la página por completo
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

  //apertura y cierre de modal de detalles de usuario

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

    this.userService.getProfilePicture(user.id).subscribe({ //solicita imagen de perfil de usuario al servicio
      next: (blob) => { //datos binarios de la imagen
        const objectURL = URL.createObjectURL(blob); //crea url local de los datos recibidos
        this.userAvatars[user.id] = objectURL; //guarda url con avatar
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error al cargar la foto de perfil', err);
        this.userAvatars[user.id] = 'assets/default-avatar.png';
        this.cdr.markForCheck();
      }
    });
  }

  getUserAvatarUrl(user: UserDtoResponse | null): string { //obtiene url del avatar
    if (!user || !user.id) {
      return 'assets/default-avatar.png';
    }
    return this.userAvatars[user.id] || 'assets/default-avatar.png';
  }

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

}