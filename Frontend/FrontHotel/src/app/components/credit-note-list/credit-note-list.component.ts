import { Component, OnInit, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { CreditNoteService } from '../../core/services/credit-note.service';
import { CreditNoteDtoResponse } from '../../models/CreditNote-model';
import { BookingCancellationDtoResponse } from '../../models/Booking-model';
import { BookingService } from '../../core/services/booking.service';

@Component({
    selector: 'app-credit-note-list',
    imports: [CommonModule, FormsModule],
    templateUrl: './credit-note-list.component.html',
    styleUrls: ['./credit-note-list.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CreditNoteListComponent implements OnInit {

  // --- Estados reactivos gestionados con Signals ---
  creditNotes = signal<CreditNoteDtoResponse[]>([]);
  allCreditNotesCache = signal<CreditNoteDtoResponse[]>([]);
  loading = signal<boolean>(false);
  errorMessage = signal<string>('');
  searchCode = signal<string>('');

  // --- SEÑALES PARA LOS FILTROS ---
  searchTerm = signal<string>('');
  statusFilter = signal<string>('ALL'); // 'ALL' | 'PAID' | 'PENDING'

  // --- SEÑAL COMPUTADA QUE FILTRA LA LISTA AUTOMÁTICAMENTE ---
  filteredCreditNotes = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const status = this.statusFilter();

    return this.creditNotes().filter(note => {
      // 1. Filtro por Nombre o Apellido del cliente
      const name = note.clientName ? note.clientName.toLowerCase() : '';
      const lastName = note.clientLastName ? note.clientLastName.toLowerCase() : '';
      const fullName = `${name} ${lastName}`;
      const matchesSearch = fullName.includes(term);

      // 2. Filtro por Estado (Pagado / Pendiente)
      let matchesStatus = true;
      if (status === 'PAID') {
        matchesStatus = note.paid === true;
      } else if (status === 'PENDING') {
        matchesStatus = !note.paid;
      }

      return matchesSearch && matchesStatus;
    });
  });

  // --- Estados reactivos para el Modal de Detalle ---
  showModal = signal<boolean>(false);
  loadingDetail = signal<boolean>(false);
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

  togglePaidStatus(id: number): void {
    this.creditNoteService.togglePaidStatus(id).subscribe({
      next: (updatedNote) => {
        const updateList = (list: CreditNoteDtoResponse[]) =>
          list.map(note => note.id === id ? { ...note, paid: updatedNote.paid } : note);

        this.allCreditNotesCache.update(updateList);
        this.creditNotes.update(updateList);
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error al actualizar el estado de pago:', err);
        this.errorMessage.set('No se pudo actualizar el estado de pago de la nota de crédito.');
      }
    });
  }

  // Abre el modal de detalle seleccionando directamente la nota del listado cargado
  viewDetail(id: number): void {
    const note = this.creditNotes().find(n => n.id === id);
    if (!note) {
      this.detailError.set('No se encontró la nota de crédito seleccionada.');
      return;
    }

    this.selectedCreditNote.set(note);
    this.showModal.set(true);
    this.loadingDetail.set(false);
    this.detailError.set('');
  }

  closeModal(): void {
    this.showModal.set(false);
    this.selectedCreditNote.set(null);
    this.detailError.set('');
  }
}