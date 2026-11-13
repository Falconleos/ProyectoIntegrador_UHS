import { Component, OnInit, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { CreditNoteService } from '../../core/services/credit-note.service';
import { CreditNoteDtoResponse } from '../../models/CreditNote-model'; // Asegúrate de importar tu interfaz correcta

import { BookingCancellationDtoResponse } from '../../models/Booking-model';
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
  creditNotes = signal<CreditNoteDtoResponse[]>([]);
  allCreditNotesCache = signal<CreditNoteDtoResponse[]>([]); // Caché para búsquedas
  loading = signal<boolean>(false);
  errorMessage = signal<string>('');
  searchCode = signal<string>('');

  // --- Estados del Modal de Detalle con Signals ---
  showModal = signal<boolean>(false);
  loadingDetail = signal<boolean>(false);
  cancellationDetail = signal<BookingCancellationDtoResponse | null>(null);
  detailError = signal<string>('');
  selectedCreditNote = signal<CreditNoteDtoResponse | null>(null);

  constructor(
    private creditNoteService: CreditNoteService,
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
        console.log("Notas de crédito cargadas del backend:", notes);
        const data = Array.isArray(notes) ? notes : [];
        this.creditNotes.set(data);
        this.allCreditNotesCache.set(data);
        this.loading.set(false);
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
      String(note.clientName || '').toLowerCase().includes(query) ||
      String(note.clientLastName || '').toLowerCase().includes(query) ||
      String(note.username || '').toLowerCase().includes(query)
    );

    this.creditNotes.set(filtered);
  }

  // --- Método para cambiar el estado de pago (paid) ---
  togglePaidStatus(id: number): void {
    this.creditNoteService.togglePaidStatus(id).subscribe({
      next: (updatedNote) => {
        console.log('Estado de pago actualizado para la nota:', updatedNote);

        const updateList = (list: CreditNoteDtoResponse[]) =>
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

    // Si tu nota de crédito trae vinculado el bookingId en el DTO o en la cuenta, lo utilizas aquí.
    // Si usas el accountId para buscar la reserva, asegúrate de tener el método o id disponible.
    const targetAccountId = note.accountId;
    if (!targetAccountId) {
      this.loadingDetail.set(false);
      this.detailError.set('La nota de crédito no contiene un identificador de cuenta asociado.');
      return;
    }

    // Opcional: si necesitas buscar por cuenta o si manejas la relación en el historial
    this.bookingService.getCancellationHistory().subscribe({
      next: (history: BookingCancellationDtoResponse[]) => {
        // Buscamos en el historial (puedes ajustar el criterio si manejas accountId o bookingId)
        const found = history.find(c => c.bookingId === targetAccountId); // Ajustar si es bookingId
        if (found) {
          this.cancellationDetail.set(found);
        } else {
          this.detailError.set(`No se encontró un registro de cancelación vinculado.`);
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