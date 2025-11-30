import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { debounceTime } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LIBRARY_API } from '@core/api/library-api.token';
import { BookWithAvailability } from '@core/models/library.models';
import { ToastService } from '@core/services/toast.service';

@Component({
  selector: 'app-admin-books',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './admin-books.component.html',
})
export class AdminBooksComponent implements OnInit {
  private readonly api = inject(LIBRARY_API);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);

  readonly searchControl = this.fb.control('');

  readonly books = signal<BookWithAvailability[]>([]);
  readonly isLoading = signal(true);
  readonly dialogOpen = signal(false);
  readonly editingBook = signal<BookWithAvailability | null>(null);
  readonly submitting = signal(false);
  readonly deletingBookId = signal<string | null>(null);
  readonly isRestoring = signal(false);

  readonly form = this.fb.group({
    title: ['', Validators.required],
    author: ['', Validators.required],
    ISBN: ['', Validators.required],
    description: [''],
    imageUrl: [''],
    includeCover: [false],
    category: ['', Validators.required],
    publicationYear: [new Date().getFullYear(), [Validators.required, Validators.min(0)]],
    shelfLocation: ['', Validators.required],
    numberOfCopies: [3, [Validators.required, Validators.min(1)]],
  });

  readonly dialogTitle = computed(() => (this.editingBook() ? 'Edit Book' : 'Add New Book'));

  ngOnInit() {
    this.loadBooks();

    this.searchControl.valueChanges?.pipe(debounceTime(300), takeUntilDestroyed()).subscribe(() => this.loadBooks());
  }

  async loadBooks() {
    this.isLoading.set(true);
    try {
      const books = await this.api.getAdminBooks(this.searchControl.value?.trim());
      this.books.set(books);
    } catch (error) {
      console.error(error);
    } finally {
      this.isLoading.set(false);
    }
  }

  openCreateDialog() {
    this.editingBook.set(null);
    this.form.reset({
      title: '',
      author: '',
      ISBN: '',
      description: '',
      imageUrl: '',
      includeCover: false,
      category: '',
      publicationYear: new Date().getFullYear(),
      shelfLocation: '',
      numberOfCopies: 3,
    });
    this.dialogOpen.set(true);
  }

  openEditDialog(book: BookWithAvailability) {
    this.editingBook.set(book);
    this.form.patchValue({
      title: book.title,
      author: book.author,
      ISBN: book.ISBN,
      description: book.description,
      category: book.category,
      publicationYear: book.publicationYear,
      shelfLocation: book.shelfLocation,
      imageUrl: book.imageUrl ?? '',
      includeCover: !!book.imageUrl,
      numberOfCopies: book.totalCopies,
    });
    this.dialogOpen.set(true);
  }

  closeDialog() {
    this.dialogOpen.set(false);
  }

  handleImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.toast.show({ title: 'Unsupported file', description: 'Please select an image file (PNG, JPG, SVG).', variant: 'destructive' });
      input.value = '';
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      this.toast.show({ title: 'File too large', description: 'Cover images must be smaller than 2MB.', variant: 'destructive' });
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      this.form.patchValue({ imageUrl: dataUrl });
    };
    reader.onerror = () => {
      this.toast.show({ title: 'Upload failed', description: 'Could not read the selected file.', variant: 'destructive' });
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  clearImage() {
    this.form.patchValue({ imageUrl: '' });
  }

  handleCoverToggle(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    if (!checked) {
      this.form.patchValue({ imageUrl: '' });
    }
  }

  async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const value = this.form.getRawValue();
    const includeCover = value.includeCover;
    const imageUrl = includeCover ? value.imageUrl?.trim() || undefined : undefined;

    try {
      if (this.editingBook()) {
        await this.api.updateBook(this.editingBook()!._id, {
          title: value.title!,
          author: value.author!,
          ISBN: value.ISBN!,
          description: value.description || '',
          category: value.category!,
          publicationYear: value.publicationYear!,
          shelfLocation: value.shelfLocation!,
          imageUrl,
          numberOfCopies: value.numberOfCopies ?? undefined,
        });
        this.toast.show({ title: 'Book updated', description: `Successfully updated ${value.title}` });
      } else {
        await this.api.createBook({
          title: value.title!,
          author: value.author!,
          ISBN: value.ISBN!,
          description: value.description || '',
          category: value.category!,
          publicationYear: value.publicationYear!,
          shelfLocation: value.shelfLocation!,
          imageUrl,
          numberOfCopies: value.numberOfCopies!,
        });
        this.toast.show({ title: 'Book created', description: `Successfully created ${value.title}` });
      }
      this.closeDialog();
      await this.loadBooks();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save book';
      this.toast.show({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      this.submitting.set(false);
    }
  }

  async deleteBook(book: BookWithAvailability) {
    const confirmed = window.confirm(`Delete ${book.title}? This cannot be undone.`);
    if (!confirmed) {
      return;
    }

    this.deletingBookId.set(book._id);
    try {
      await this.api.deleteBook(book._id);
      this.toast.show({ title: 'Book removed', description: `${book.title} has been deleted.` });
      await this.loadBooks();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete book';
      this.toast.show({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      this.deletingBookId.set(null);
    }
  }

  restoreSampleData() {
    if (this.isRestoring()) {
      return;
    }
    this.isRestoring.set(true);
    this.api.resetLibraryData();
    this.loadBooks()
      .then(() => {
        this.toast.show({ title: 'Sample data restored', description: 'All demo books are available again.' });
      })
      .finally(() => this.isRestoring.set(false));
  }

  get submitButtonLabel() {
    if (this.submitting()) {
      return 'Saving…';
    }
    return this.editingBook() ? 'Update Book' : 'Create Book';
  }
}
