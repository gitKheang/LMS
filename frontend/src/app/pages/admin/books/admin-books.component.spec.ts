import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminBooksComponent } from './admin-books.component';
import { LibraryApi } from '@core/api/library-api.types';
import { LIBRARY_API } from '@core/api/library-api.token';
import { ToastService } from '@core/services/toast.service';
import { BookWithAvailability } from '@core/models/library.models';

describe('AdminBooksComponent', () => {
  let fixture: ComponentFixture<AdminBooksComponent>;
  let component: AdminBooksComponent;
  let api: jasmine.SpyObj<LibraryApi>;
  let toast: jasmine.SpyObj<ToastService>;

  beforeEach(async () => {
    api = jasmine.createSpyObj<LibraryApi>('LibraryApi', ['getAdminBooks', 'updateBook', 'createBook', 'deleteBook'], {});
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['show']);

    api.getAdminBooks.and.resolveTo([]);

    await TestBed.configureTestingModule({
      imports: [AdminBooksComponent],
      providers: [
        { provide: LIBRARY_API, useValue: api },
        { provide: ToastService, useValue: toast },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminBooksComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should forward numberOfCopies when updating a book', async () => {
    const existingBook: BookWithAvailability = {
      _id: 'book-1',
      title: 'Test Book',
      author: 'Author',
      ISBN: '1234567890',
      description: 'Desc',
      category: 'Test',
      publicationYear: 2020,
      shelfLocation: 'A1',
      isActive: true,
      imageUrl: undefined,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      availableCopies: 2,
      totalCopies: 2,
    };
    component.openEditDialog(existingBook);
    component.form.patchValue({ numberOfCopies: 5 });
    api.updateBook.and.resolveTo({ ...existingBook, totalCopies: 5, availableCopies: 4 });

    await component.submit();

    expect(api.updateBook).toHaveBeenCalledWith(
      existingBook._id,
      jasmine.objectContaining({
        numberOfCopies: 5,
      })
    );
  });

  it('should keep number of copies editable while editing a book', async () => {
    const existingBook: BookWithAvailability = {
      _id: 'book-2',
      title: 'Another Book',
      author: 'Author',
      ISBN: '0987654321',
      description: 'Desc',
      category: 'Test',
      publicationYear: 2021,
      shelfLocation: 'B1',
      isActive: true,
      imageUrl: undefined,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      availableCopies: 1,
      totalCopies: 1,
    };

    component.openEditDialog(existingBook);
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('input[formcontrolname="numberOfCopies"]') as HTMLInputElement | null;
    expect(input).not.toBeNull();
    expect(input?.value).toBe('1');
  });

  it('should delete book when confirmed', async () => {
    const book: BookWithAvailability = {
      _id: 'book-3',
      title: 'Delete Me',
      author: 'Author',
      ISBN: '555',
      description: '',
      category: 'Test',
      publicationYear: 2022,
      shelfLocation: 'B2',
      isActive: true,
      imageUrl: undefined,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      availableCopies: 1,
      totalCopies: 1,
    };

    spyOn(window, 'confirm').and.returnValue(true);
    api.deleteBook.and.resolveTo();

    await component.deleteBook(book);

    expect(api.deleteBook).toHaveBeenCalledWith(book._id);
  });


});
