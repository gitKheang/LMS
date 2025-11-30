import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { LIBRARY_API } from '@core/api/library-api.token';
import { BookWithAvailability } from '@core/models/library.models';

@Component({
  selector: 'app-book-details',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule],
  templateUrl: './book-details.component.html',
})
export class BookDetailsComponent implements OnInit {
  private readonly api = inject(LIBRARY_API);
  private readonly route = inject(ActivatedRoute);

  readonly book = signal<BookWithAvailability | null>(null);
  readonly isLoading = signal(true);

  ngOnInit() {
    this.loadBook();
  }

  async loadBook() {
    this.isLoading.set(true);
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.isLoading.set(false);
      return;
    }

    try {
      const book = await this.api.getBookById(id);
      this.book.set(book);
    } catch (error) {
      console.error(error);
      this.book.set(null);
    } finally {
      this.isLoading.set(false);
    }
  }
}
