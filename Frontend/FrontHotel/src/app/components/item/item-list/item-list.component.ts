
import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ItemService } from '../../../core/services/item.service';
import { ItemDtoResponse } from '../../../models/Item-model';
import { CurrencyPipe } from '@angular/common';

interface ItemWithImage extends ItemDtoResponse {
  imageUrl?: string;
}

@Component({
  selector: 'app-item-list',
  standalone: true,
  imports: [RouterLink, CurrencyPipe],
  templateUrl: './item-list.component.html',
  styleUrl: './item-list.component.css'
})
export class ItemListComponent implements OnInit, OnDestroy {

  private itemService = inject(ItemService);

  items = signal<ItemWithImage[]>([]);

  loading = signal(false);
  errorMessage = signal('');
  deletingId = signal<number | null>(null);

  ngOnInit(): void {
    this.loadItems();
  }

  loadItems(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.clearImages();
    this.items.set([]);

    this.itemService.getAll().subscribe({
      next: (data) => {
        this.items.set(data);
        this.loading.set(false);

        data.forEach(item => {
          this.loadItemImage(item.id);
        });
      },
      error: () => {
        this.errorMessage.set('No se pudieron cargar los ítems.');
        this.loading.set(false);
      }
    });
  }

  //Obtiene la imagen de cada ítem y genera una URL temporal para mostrarla
  loadItemImage(id: number): void {
    this.itemService.getItemImage(id).subscribe({
      next: (blob) => {
        if (blob.size === 0) return;

        const imageUrl = URL.createObjectURL(blob);

        const itemExists = this.items().some(item => item.id === id);

        if (!itemExists) {
          URL.revokeObjectURL(imageUrl);
          return;
        }

        this.items.update(items =>
          items.map(item =>
            item.id === id
              ? { ...item, imageUrl }
              : item
          )
        );
      },
      error: () => {
        // Un ítem puede no tener imagen.
      }
    });
  }

  //elimina un registro y actualiza el listado solamente cuando el backend confirma la operación
  deleteItem(id: number): void {
    if (this.deletingId() !== null) return;

    this.deletingId.set(id);
    this.errorMessage.set('');

    this.itemService.deleteItem(id).subscribe({
      next: () => {
        const deletedItem = this.items().find(item => item.id === id);

        if (deletedItem?.imageUrl) {
          URL.revokeObjectURL(deletedItem.imageUrl);
        }

        this.items.update(items =>
          items.filter(item => item.id !== id)
        );

        this.deletingId.set(null);
      },
      error: () => {
        this.errorMessage.set('No se pudo eliminar el ítem.');
        this.deletingId.set(null);
      }
    });
  }

  private clearImages(): void {
    this.items().forEach(item => {
      if (item.imageUrl) {
        URL.revokeObjectURL(item.imageUrl);
      }
    });
  }

  ngOnDestroy(): void {
    this.clearImages();
  }
}