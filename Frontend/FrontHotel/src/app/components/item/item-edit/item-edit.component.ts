import { Component, inject, OnInit, signal, OnDestroy } from '@angular/core';
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
export class ItemEditComponent implements OnInit, OnDestroy {

  private fb = inject(NonNullableFormBuilder);
  private itemService = inject(ItemService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  loading = signal(false);
  loadingImage = signal(false);
  saving = signal(false);
  errorMessage = signal('');
  
  selectedImage = signal<File | null>(null);
  existingImageUrl = signal<string | null>(null);
  itemId = signal<number | null>(null);
  itemLoaded = signal(false);
  selectedImagePreview = signal<string | null>(null);

  itemForm = this.fb.group({
    description: ['', [Validators.required]],
    quantity: [1, [Validators.required, Validators.min(1)]],
    unitPrice: [0, [Validators.required, Validators.min(0.01)]],
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

        this.loadExistingImage(id);

        this.loading.set(false);
        this.itemLoaded.set(true);
      },
      error: () => {
        this.errorMessage.set('No se pudieron cargar los datos del ítem.');
        this.loading.set(false);
      }
    });
  }

  loadExistingImage(id: number): void {
    this.loadingImage.set(true);
    this.itemService.getItemImage(id).subscribe({
      next: (blob) => {
        if (blob && blob.size > 0) {
          const url = URL.createObjectURL(blob);
          this.existingImageUrl.set(url);
        }
        this.loadingImage.set(false);
      },
      error: () => {
        this.loadingImage.set(false);
      }
    });
  }

  removeExistingImage(): void {
    if (!window.confirm('¿Estás seguro de eliminar la imagen actual?')) return;

    const id = this.itemId()!;
    this.itemService.deleteItemImage(id).subscribe({
      next: () => {
        const currentUrl = this.existingImageUrl();
        if (currentUrl) URL.revokeObjectURL(currentUrl);
        this.existingImageUrl.set(null);
      },
      error: () => {
        this.errorMessage.set('No se pudo eliminar la imagen.');
      }
    });
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    const currentPreview = this.selectedImagePreview();
    if (currentPreview) {
      URL.revokeObjectURL(currentPreview);
    }

    if (file) {
      this.selectedImage.set(file);
      const previewUrl = URL.createObjectURL(file);
      this.selectedImagePreview.set(previewUrl);
    } else {
      this.selectedImage.set(null);
      this.selectedImagePreview.set(null);
    }
  }

  ngOnDestroy(): void {
    const url = this.existingImageUrl();
    if (url) URL.revokeObjectURL(url);

    const previewUrl = this.selectedImagePreview();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }

  onSubmit(): void {
    if (!this.itemLoaded() || this.loading() || this.saving()) {
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
        this.router.navigate(['/dashboard/item-list']);
      },
      error: () => {
        this.errorMessage.set('No se pudo actualizar el ítem.');
        this.saving.set(false);
      }
    });
  }
}