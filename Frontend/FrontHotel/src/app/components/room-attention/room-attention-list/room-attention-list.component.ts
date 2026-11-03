
import {Component, OnInit, computed, inject, signal} from '@angular/core';

import { ActivatedRoute, RouterLink } from '@angular/router';

import { RoomAttentionService } from '../../../core/services/room-attention.service';

import { RoomAttentionDtoResponse } from '../../../models/RoomAttention-model';

@Component({
  selector: 'app-room-attention-list',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './room-attention-list.component.html',
  styleUrl: './room-attention-list.component.css'
})
export class RoomAttentionListComponent implements OnInit {

  private roomAttentionService = inject(RoomAttentionService);
  private route = inject(ActivatedRoute);

  bookingId = signal<number | null>(null);

  attentions = signal<RoomAttentionDtoResponse[]>([]);

  loading = signal(false);
  deletingId = signal<number | null>(null);
  deliveringId = signal<number | null>(null);

  errorMessage = signal('');
  canModify = signal(false); //Indica si la interfaz permite realizar modificaciones.

  total = computed(() =>
    this.attentions().reduce(
      (acc, attention) => acc + attention.subtotal,
      0
    )
  );

  ngOnInit(): void {
    this.checkUserRole(); //Verifica si el usuario tiene permisos para realizar modifiaciones

    const idParam = this.route.snapshot.paramMap.get('bookingId'); //Captura parametro de URL
    const id = Number(idParam);

    if (idParam && Number.isInteger(id) && id > 0) {
      this.bookingId.set(id);
      this.loadAttentions();
    } else {
      this.errorMessage.set('ID de reserva no válido.');
    }
  }

  checkUserRole(): void { //Determinar si el usuario puede modificar atenciones desde la interfaz
    const storedRoles = localStorage.getItem('role'); //Obtiene roles del localStorage

    if (!storedRoles) { //Si no encuentra roles setea señal
      this.canModify.set(false);
      return;
    }

    let roles: unknown;

    try {
      roles = JSON.parse(storedRoles);
    } catch {
      roles = storedRoles;
    } //Interpreta contenido como json para admitir una cadena simple o un arreglo serializado

    const roleList = Array.isArray(roles) ? roles : [roles]; //Garantiza que se trabaje con un arreglo

    const allowed = roleList.some((role: unknown) => {
      let value = '';

      if (typeof role === 'string') {
        value = role;
      } else if (role && typeof role === 'object' && 'authority' in role) {
        value = String(role.authority);
      }

      return [
        'ADMIN',
        'ROLE_ADMIN',
        'RECEPCIONIST',
        'ROLE_RECEPCIONIST'
      ].includes(value);
    });

    this.canModify.set(allowed);
  }

  loadAttentions(): void {
    const id = this.bookingId();

    if (id === null) return;

    this.loading.set(true);
    this.errorMessage.set('');

    this.roomAttentionService.getByBooking(id).subscribe({
      next: (data) => {
        this.attentions.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Error al cargar los consumos de la reserva.');
        this.loading.set(false);
      }
    });
  }

  deleteAttention(id: number): void {
    if (!this.canModify() || this.deletingId() !== null) return;

    this.deletingId.set(id);
    this.errorMessage.set('');

    this.roomAttentionService.deleteAttention(id).subscribe({
      next: () => {
        this.attentions.update(attentions =>
          attentions.filter(attention => attention.id !== id)
        );
        this.deletingId.set(null);
      },
      error: () => {
        this.errorMessage.set('Error al eliminar el consumo.');
        this.deletingId.set(null);
      }
    });
  }

  markAsDelivered(id: number): void {
    if (!this.canModify() || this.deliveringId() !== null) return;

    this.deliveringId.set(id);
    this.errorMessage.set('');

    this.roomAttentionService.markAsDelivered(id).subscribe({
      next: () => {
        this.deliveringId.set(null);
        this.loadAttentions();
      },
      error: () => {
        this.errorMessage.set('Error al marcar el consumo como entregado.');
        this.deliveringId.set(null);
      }
    });
  }
}

