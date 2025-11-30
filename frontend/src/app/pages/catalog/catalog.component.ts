import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime } from 'rxjs';
import { LIBRARY_API } from '@core/api/library-api.token';
import { BookWithAvailability } from '@core/models/library.models';
import { ToastService } from '@core/services/toast.service';

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, LucideAngularModule],
  templateUrl: './catalog.component.html',
})
export class CatalogComponent implements OnInit {
  private readonly api = inject(LIBRARY_API);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly categoryControl = new FormControl('all', { nonNullable: true });

  readonly books = signal<BookWithAvailability[]>([]);
  readonly categories = signal<string[]>([]);
  readonly isLoading = signal(true);
  readonly placeholderCover =
    'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=400&q=80';

  ngOnInit() {
    this.loadCategories();
    this.loadBooks();

    this.searchControl.valueChanges
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadBooks());

    this.categoryControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadBooks());
  }

  async loadCategories() {
    try {
      const data = await this.api.getCategories();
      this.categories.set(data);
    } catch (error) {
      console.error(error);
    }
  }

  async loadBooks() {
    this.isLoading.set(true);
    try {
      const books = await this.api.getBooks(this.searchControl.value.trim(), this.categoryControl.value);
      this.books.set(books);
    } catch (error) {
      this.toast.show({ title: 'Failed to load books', description: 'Please try again later', variant: 'destructive' });
    } finally {
      this.isLoading.set(false);
    }
  }
}
