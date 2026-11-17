import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RoomService } from '../../core/services/room.service';
import { BookingService } from '../../core/services/booking.service';
import { PaymentService } from '../../core/services/payment.service';
import { RoomAttentionService } from '../../core/services/room-attention.service';

@Component({
    selector: 'app-inicio',
    imports: [CommonModule],
    templateUrl: './inicio.component.html',
    styleUrl: './inicio.component.css'
})
export class InicioComponent implements OnInit {

  private roomService = inject(RoomService);
  private bookingService = inject(BookingService);
  private paymentService = inject(PaymentService);
  private attentionService = inject(RoomAttentionService);

  // KPIs principales
  totalRooms = signal<number>(0);
  activeBookingsCount = signal<number>(0);     // Estadías activas
  pendingBookingsCount = signal<number>(0);    // Reservas pendientes
  todayRevenue = signal<number>(0);            // Ingresos del día corregidos
  pendingAttentionsCount = signal<number>(0);  // Servicios pendientes

  // Variables para el gráfico de torta de ocupación
  occupancyPercentage = signal<number>(0);
  occupiedRoomsCount = signal<number>(0);
  availableRoomsCount = signal<number>(0);

  ngOnInit(): void {
    this.cargarDatosDashboard();
  }

  cargarDatosDashboard(): void {
    // 1. Total de habitaciones, estadías activas, reservas pendientes y gráfico
    this.roomService.getRoomCount().subscribe({
      next: (totalCount) => {
        this.totalRooms.set(totalCount);

        this.bookingService.getAll().subscribe({
          next: (bookings) => {
            // Estadías activas (ej. CHECKED_IN o CONFIRMED según tu negocio)
            const activas = bookings.filter(b => b.state === 'CHECKED_IN' || b.state === 'CONFIRMED');
            const ocupadasCount = activas.length;
            this.activeBookingsCount.set(ocupadasCount);
            this.occupiedRoomsCount.set(ocupadasCount);

            // NUEVO: Reservas pendientes (ej. estado 'PENDING')
            const pendientesReservas = bookings.filter(b => b.state === 'PENDING');
            this.pendingBookingsCount.set(pendientesReservas.length);

            // Habitaciones disponibles
            const disponibles = Math.max(0, totalCount - ocupadasCount);
            this.availableRoomsCount.set(disponibles);

            // Porcentaje de ocupación
            if (totalCount > 0) {
              const porcentaje = (ocupadasCount / totalCount) * 100;
              this.occupancyPercentage.set(Math.round(porcentaje));
            }
          },
          error: (err) => console.error('Error al cargar reservas', err)
        });
      },
      error: (err) => console.error('Error al cargar habitaciones', err)
    });

    // 2. Ingresos del Día (Robusto y con diagnóstico en consola)
    this.paymentService.getAllPayments().subscribe({
      next: (payments) => {
        // Imprimimos en consola los pagos para ver exactamente cómo llega 'paymentDate'
        console.log('Pagos obtenidos del servidor:', payments);

        const hoy = new Date();
        
        const sumaHoy = payments
          .filter(p => {
            if (!p.paymentDate) return false;

            // Intentamos convertirlo a un objeto Date de JS
            const fechaPago = new Date(p.paymentDate);

            // Si es una fecha válida, comparamos año, mes y día exactos
            if (!isNaN(fechaPago.getTime())) {
              return (
                fechaPago.getDate() === hoy.getDate() &&
                fechaPago.getMonth() === hoy.getMonth() &&
                fechaPago.getFullYear() === hoy.getFullYear()
              );
            }
            const pStr = String(p.paymentDate);
            const anioStr = String(hoy.getFullYear());
            const mesStr = String(hoy.getMonth() + 1).padStart(2, '0');
            const diaStr = String(hoy.getDate()).padStart(2, '0');

            return pStr.includes(anioStr) && pStr.includes(mesStr) && pStr.includes(diaStr);
          })
          .reduce((acc, p) => acc + (p.amount || 0), 0);

        this.todayRevenue.set(sumaHoy);
      },
      error: (err) => console.error('Error al cargar pagos del día', err)
    });

    // 3. Cantidad de servicios pendientes
    this.attentionService.getAll().subscribe({
      next: (attentions) => {
        const pendientes = attentions.filter(a => !a.delivered);
        this.pendingAttentionsCount.set(pendientes.length);
      },
      error: (err) => console.error('Error al cargar atenciones', err)
    });
  }

}