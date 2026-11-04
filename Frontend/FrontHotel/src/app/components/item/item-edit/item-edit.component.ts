
import { Component, inject, OnInit, signal } from '@angular/core';
import {
  ReactiveFormsModule,
  NonNullableFormBuilder,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { ItemService } from '../../../core/services/item.service';
import { ItemDtoRequest } from '../../../models/Item-model';

@Component({
  selector: 'app-item-edit',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './item-edit.component.html',
  styleUrl: './item-edit.component.css'
})
export class ItemEditComponent implements OnInit {

  private fb = inject(NonNullableFormBuilder);
  private itemService = inject(ItemService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  loading = signal(false);
  saving = signal(false);
  errorMessage = signal('');
  selectedImage = signal<File | null>(null);
  itemId = signal<number | null>(null);
  itemLoaded = signal(false);

  itemForm = this.fb.group({
    description: ['', [
      Validators.required
    ]],
    quantity: [1, [
      Validators.required,
      Validators.min(1)
    ]],
    unitPrice: [0, [
      Validators.required,
      Validators.min(0.01)
    ]],
    isService: [false]
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = Number(idParam);

    if (idParam === null || !Number.isSafeInteger(id) || id <= 0) {
      this.errorMessage.set('El identificador del ítem no es válido.');
      return;
    }

    this.itemId.set(id);
    this.loadItem(id);
  }

  loadItem(id: number): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.itemLoaded.set(false);

    this.itemService.getById(id).subscribe({
      next: (data) => {
        this.itemForm.patchValue({
          description: data.description,
          quantity: data.quantity,
          unitPrice: data.unitPrice,
          isService: data.isService ?? false
        });

        this.loading.set(false);
        this.itemLoaded.set(true);
      },
      error: () => {
        this.errorMessage.set('No se pudieron cargar los datos del ítem.');
        this.loading.set(false);
      }
    });
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    this.selectedImage.set(file);
  }

  onSubmit(): void {

    if (!this.itemLoaded() || this.loading() || this.saving())  {
      return;
    }

    if (this.itemForm.invalid) {
      this.itemForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');

    const id = this.itemId()!;
    const request: ItemDtoRequest = this.itemForm.getRawValue();
    const image = this.selectedImage() ?? undefined;

    this.itemService.updateItem(id, request, image).subscribe({
      next: () => {
        this.saving.set(false);
        this.router.navigate(['/items']);
      },
      error: () => {
        this.errorMessage.set('No se pudo actualizar el ítem.');
        this.saving.set(false);
      }
    });
  }
}
