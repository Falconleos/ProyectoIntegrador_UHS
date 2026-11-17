import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CurrencyPipe } from '@angular/common';

import { ItemService } from '../../../core/services/item.service';
import { ItemDtoResponse } from '../../../models/Item-model';

// Interfaz extendida para incluir la URL temporal de la imagen
interface ItemWithImage extends ItemDtoResponse {
  imageUrl?: string;
}

@Component({
    selector: 'app-item-list',
    imports: [RouterLink, CurrencyPipe],
    templateUrl: './item-list.component.html',
    styleUrl: './item-list.component.css'
})
export class ItemListComponent implements OnInit, OnDestroy {

  // Estados reactivos gestionados mediante Signals
  items = signal<ItemWithImage[]>([]);
  loading = signal<boolean>(false);
  errorMessage = signal<string>('');
  deletingId = signal<number | null>(null);

  // Inyección de dependencias tradicional por constructor (más clara para explicaciones académicas)
  constructor(private itemService: ItemService) {}

  ngOnInit(): void {
    this.loadItems();
  }

  // Método principal para obtener todos los ítems y disparar la carga de sus imágenes
  loadItems(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    // Limpiamos recursos de imágenes previos y reseteamos el estado
    this.clearImages();
    this.items.set([]);

    this.itemService.getAll().subscribe({
      next: (data: ItemDtoResponse[]) => {
        this.items.set(data);
        this.loading.set(false);

        // Por cada ítem obtenido, solicitamos su imagen de forma asíncrona
        data.forEach(item => {
          this.loadItemImage(item.id);
        });
      },
      error: (err) => {
        this.errorMessage.set('No se pudieron cargar los ítems.');
        this.loading.set(false);
        console.error(err);
      }
    });
  }

  // Obtiene la imagen de cada ítem y genera una URL temporal para renderizarla
  loadItemImage(id: number): void {
    this.itemService.getItemImage(id).subscribe({
      next: (blob: Blob) => {
        if (blob.size === 0) return;

        // Generamos una URL local a partir del Blob recibido
        const imageUrl = URL.createObjectURL(blob);
        const itemExists = this.items().some(item => item.id === id);

        if (!itemExists) {
          URL.revokeObjectURL(imageUrl);
          return;
        }

        // Actualizamos inmutablemente el arreglo en la señal para disparar la detección OnPush
        this.items.update(items =>
          items.map(item =>
            item.id === id
              ? { ...item, imageUrl }
              : item
          )
        );
      },
      error: () => {
        // Un ítem puede no tener imagen asociada; se omite de forma silenciosa
      }
    });
  }

  // Elimina un registro y actualiza el listado solo cuando el backend confirma el éxito
  deleteItem(id: number): void {
    if (this.deletingId() !== null) return;

    this.deletingId.set(id);
    this.errorMessage.set('');

    this.itemService.deleteItem(id).subscribe({
      next: () => {
        const deletedItem = this.items().find(item => item.id === id);

        // Liberamos la memoria de la URL temporal si el ítem tenía imagen
        if (deletedItem?.imageUrl) {
          URL.revokeObjectURL(deletedItem.imageUrl);
        }

        // Filtramos el ítem eliminado del estado reactivo
        this.items.update(items =>
          items.filter(item => item.id !== id)
        );

        this.deletingId.set(null);
      },
      error: (err) => {
        this.errorMessage.set('No se pudo eliminar el ítem.');
        this.deletingId.set(null);
        console.error(err);
      }
    });
  }

  // Limpia y libera las URLs creadas en memoria para evitar fugas (Memory Leaks)
  private clearImages(): void {
    this.items().forEach(item => {
      if (item.imageUrl) {
        URL.revokeObjectURL(item.imageUrl);
      }
    });
  }

  ngOnDestroy(): void {
    // Aseguramos la limpieza de memoria al destruir el componente
    this.clearImages();
  }
}