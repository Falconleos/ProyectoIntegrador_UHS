import { Component, OnInit, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { CreditNoteService } from '../../core/services/credit-note.service';
import { AccountService } from '../../core/services/account.service';

import { BookingCancellationDtoResponse } from '../../models/Booking-model';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { BookingService } from '../../core/services/booking.service';

@Component({
  selector: 'app-credit-note-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './credit-note-list.component.html',
  styleUrls: ['./credit-note-list.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CreditNoteListComponent implements OnInit {
  // --- Estados con Signals ---
  creditNotes = signal<any[]>([]);
  allCreditNotesCache = signal<any[]>([]); // Caché para preservar la lista completa al realizar búsquedas
  loading = signal<boolean>(false);
  errorMessage = signal<string>('');
  searchCode = signal<string>('');

  // --- Estados del Modal de Detalle con Signals ---
  showModal = signal<boolean>(false);
  loadingDetail = signal<boolean>(false);
  cancellationDetail = signal<BookingCancellationDtoResponse | null>(null);
  detailError = signal<string>('');
  selectedCreditNote = signal<any>(null);

  constructor(
    private creditNoteService: CreditNoteService,
    private accountService: AccountService,
    private bookingService: BookingService
  ) {}

  ngOnInit(): void {
    this.loadCreditNotes();
  }

  loadCreditNotes(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    
    this.creditNoteService.getAllCreditNotes().subscribe({
      next: (notes) => {
        console.log("Notas de crédito crudas del backend:", notes);
        
        if (!notes || notes.length === 0) {
          this.creditNotes.set([]);
          this.allCreditNotesCache.set([]);
          this.loading.set(false);
          return;
        }

        const accountRequests = notes.map(note => {
          const accountId = note.accountId;
          if (!accountId) return of(note);

          return this.accountService.getAccountById(accountId).pipe(
            map(account => {
              console.log(`Datos obtenidos para la cuenta ${accountId}:`, account);
              return {
                ...note,
                account: account 
              };
            }),
            catchError((err: HttpErrorResponse) => {
              console.error(`Error al buscar la cuenta ${accountId}:`, err);
              return of(note);
            })
          );
        });

        forkJoin(accountRequests).subscribe({
          next: (enrichedNotes) => {
            console.log("Notas de crédito enriquecidas finales:", enrichedNotes);
            this.creditNotes.set(enrichedNotes);
            this.allCreditNotesCache.set(enrichedNotes);
            this.loading.set(false);
          },
          error: (err: HttpErrorResponse) => {
            console.error('Error general en forkJoin:', err);
            this.creditNotes.set(notes);
            this.allCreditNotesCache.set(notes);
            this.loading.set(false);
          }
        });
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error al cargar las notas de crédito:', err);
        this.errorMessage.set('No se pudieron cargar las notas de crédito.');
        this.loading.set(false);
      }
    });
  }

  onSearch(): void {
    const query = this.searchCode().trim().toLowerCase();
    const cache = this.allCreditNotesCache();

    if (!query) {
      this.creditNotes.set(cache);
      return;
    }
    
    const filtered = cache.filter(note => 
      String(note.id).includes(query) || 
      String(note.accountId).includes(query) ||
      String(note.account?.name || '').toLowerCase().includes(query) ||
      String(note.account?.surname || '').toLowerCase().includes(query) ||
      String(note.account?.dni || '').includes(query)
    );

    this.creditNotes.set(filtered);
  }

  // --- Método para cambiar el estado de pago (paid) ---
  togglePaidStatus(id: number): void {
    this.creditNoteService.togglePaidStatus(id).subscribe({
      next: (updatedNote) => {
        console.log('Estado de pago actualizado para la nota:', updatedNote);

        // Actualizamos en la caché principal manteniendo los datos de la cuenta enriquecidos
        const updateList = (list: any[]) =>
          list.map(note => {
            if (note.id === id) {
              return {
                ...note,
                paid: updatedNote.paid
              };
            }
            return note;
          });

        this.allCreditNotesCache.update(updateList);
        this.creditNotes.update(updateList);
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error al actualizar el estado de pago:', err);
        this.errorMessage.set('No se pudo actualizar el estado de pago de la nota de crédito.');
      }
    });
  }

  viewDetail(id: number): void {
    console.log('Ver detalle de nota de crédito ID:', id);
    const note = this.creditNotes().find(n => n.id === id);
    if (!note) return;

    this.selectedCreditNote.set(note);
    this.showModal.set(true);
    this.loadingDetail.set(true);
    this.cancellationDetail.set(null);
    this.detailError.set('');

    const targetBookingId = note.account?.bookingId;
    if (!targetBookingId) {
      this.loadingDetail.set(false);
      this.detailError.set('La cuenta asociada no contiene un identificador de reserva (bookingId).');
      return;
    }

    this.bookingService.getCancellationHistory().subscribe({
      next: (history: BookingCancellationDtoResponse[]) => {
        const found = history.find(c => c.bookingId === targetBookingId);
        if (found) {
          this.cancellationDetail.set(found);
        } else {
          this.detailError.set(`No se encontró un registro de cancelación vinculado a la reserva #${targetBookingId}.`);
        }
        this.loadingDetail.set(false);
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error al obtener el historial de cancelaciones:', err);
        this.loadingDetail.set(false);
        this.detailError.set('Error de conexión al intentar obtener los detalles de la cancelación.');
      }
    });
  }

  closeModal(): void {
    this.showModal.set(false);
    this.selectedCreditNote.set(null);
    this.cancellationDetail.set(null);
    this.detailError.set('');
  }
}