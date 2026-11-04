
import { Component, inject, signal } from '@angular/core';
import {
  ReactiveFormsModule,
  NonNullableFormBuilder,
  Validators
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { ItemService } from '../../../core/services/item.service';
import { ItemDtoRequest } from '../../../models/Item-model';

@Component({
  selector: 'app-item-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './item-form.component.html',
  styleUrl: './item-form.component.css'
})
export class ItemFormComponent {

  private fb = inject(NonNullableFormBuilder);
  private itemService = inject(ItemService);
  private router = inject(Router);

  saving = signal(false);
  errorMessage = signal('');
  selectedImage = signal<File | null>(null);

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

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    this.selectedImage.set(file);
  }

  onSubmit(): void {
    if (this.itemForm.invalid) {
      this.itemForm.markAllAsTouched();
      return;
    }

    if (this.saving()) return;

    this.saving.set(true);
    this.errorMessage.set('');

    const request: ItemDtoRequest = this.itemForm.getRawValue();

    const image = this.selectedImage() ?? undefined;

    this.itemService.createItem(request, image).subscribe({
      next: () => {
        this.saving.set(false);
        this.router.navigate(['/items']);
      },
      error: () => {
        this.errorMessage.set('No se pudo crear el ítem.');
        this.saving.set(false);
      }
    });
  }
}