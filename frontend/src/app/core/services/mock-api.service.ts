import { Injectable } from '@angular/core';
import { addDays, isAfter, parseISO } from 'date-fns';
import {
  AuthResponse,
  Book,
  BookCopy,
  BookWithAvailability,
  CreateBookPayload,
  CreateLoanPayload,
  DashboardStats,
  Loan,
  LoanStatus,
  LoanWithRelations,
  UpdateBookPayload,
  User,
  UserRole,
} from '../models/library.models';
import { bookCopies, books, loans, users } from '../data/mock-data';
import { LibraryApi } from '@core/api/library-api.types';

@Injectable({ providedIn: 'root' })
export class MockApiService implements LibraryApi {
  private readonly initialBooks = this.clone(books);
  private readonly initialBookCopies = this.clone(bookCopies);
  private readonly initialLoans = this.clone(loans);

  private async simulateDelay(duration = 300) {
    await new Promise((resolve) => setTimeout(resolve, duration));
  }

  private generateToken(user: User) {
    return btoa(JSON.stringify({ id: user._id, email: user.email, role: user.role }));
  }

  private sanitizeUser(user: User): User {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...rest } = user;
    return { ...rest } as User;
  }

  private clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value));
  }

  private getAvailableCopies(bookId: string) {
    return bookCopies.filter((copy) => copy.bookId === bookId && copy.status === 'AVAILABLE').length;
  }

  private getTotalCopies(bookId: string) {
    return bookCopies.filter((copy) => copy.bookId === bookId).length;
  }

  private withAvailability(book: Book): BookWithAvailability {
    return {
      ...book,
      availableCopies: this.getAvailableCopies(book._id),
      totalCopies: this.getTotalCopies(book._id),
    };
  }

  private refreshLoanStatus(loan: Loan): Loan {
    if (loan.returnDate) {
      return loan;
    }

    const dueDate = parseISO(loan.dueDate);
    if (isAfter(new Date(), dueDate)) {
      loan.status = 'OVERDUE';
    } else {
      loan.status = 'BORROWED';
    }
    return loan;
  }

  async register(name: string, email: string, password: string, studentId?: string): Promise<AuthResponse> {
    await this.simulateDelay();

    if (users.some((u) => u.email === email)) {
      throw new Error('Email already exists');
    }

    const newUser: User = {
      _id: `user-${Date.now()}`,
      name,
      email,
      passwordHash: password,
      studentId,
      role: 'USER',
      status: 'ACTIVE',
      needsPasswordReset: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    users.push(newUser);

    const token = this.generateToken(newUser);
    return {
      token,
      user: this.sanitizeUser(newUser),
    };
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    await this.simulateDelay();

    const user = users.find((u) => u.email === email && u.passwordHash === password);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    if (user.status === 'BLOCKED') {
      throw new Error('Account is blocked');
    }

    return {
      token: this.generateToken(user),
      user: this.sanitizeUser(user),
    };
  }

  async getCurrentUser(token: string): Promise<User> {
    await this.simulateDelay(150);

    try {
      const decoded = JSON.parse(atob(token)) as { id: string };
      const user = users.find((u) => u._id === decoded.id);
      if (!user) {
        throw new Error('User not found');
      }
      return this.sanitizeUser(user);
    } catch {
      throw new Error('Invalid session');
    }
  }

  async getCategories(): Promise<string[]> {
    await this.simulateDelay(150);
    const categories = Array.from(new Set(books.filter((b) => b.isActive).map((b) => b.category)));
    return categories.sort();
  }

  async getBooks(search?: string, category?: string): Promise<BookWithAvailability[]> {
    await this.simulateDelay();
    let filtered = books.filter((book) => book.isActive);

    if (search) {
      const term = search.toLowerCase();
      filtered = filtered.filter(
        (book) =>
          book.title.toLowerCase().includes(term) ||
          book.author.toLowerCase().includes(term) ||
          book.ISBN.toLowerCase().includes(term)
      );
    }

    if (category && category !== 'all') {
      filtered = filtered.filter((book) => book.category === category);
    }

    return filtered.map((book) => this.clone(this.withAvailability(book)));
  }

  async getBookById(id: string): Promise<BookWithAvailability> {
    await this.simulateDelay();
    const book = books.find((b) => b._id === id);
    if (!book) {
      throw new Error('Book not found');
    }
    return this.clone(this.withAvailability(book));
  }

  async getLoansForUser(userId: string): Promise<LoanWithRelations[]> {
    await this.simulateDelay();

    const userLoans = loans
      .filter((loan) => loan.userId === userId)
      .map((loan) => this.refreshLoanStatus(loan))
      .map((loan) => this.enrichLoan(loan));

    return this.clone(userLoans);
  }

  private enrichLoan(loan: Loan): LoanWithRelations {
    const book = books.find((b) => b._id === loan.bookId);
    const copy = bookCopies.find((c) => c._id === loan.copyId);
    const user = users.find((u) => u._id === loan.userId);

    if (!book || !copy || !user) {
      throw new Error('Invalid loan record');
    }

    return {
      ...loan,
      book,
      copy,
      user: this.sanitizeUser(user),
    };
  }

  async getAdminBooks(search?: string): Promise<BookWithAvailability[]> {
    await this.simulateDelay();
    let filtered = books;

    if (search) {
      const term = search.toLowerCase();
      filtered = filtered.filter(
        (book) =>
          book.title.toLowerCase().includes(term) ||
          book.author.toLowerCase().includes(term) ||
          book.ISBN.toLowerCase().includes(term)
      );
    }

    return filtered.map((book) => this.clone(this.withAvailability(book)));
  }

  async createBook(payload: CreateBookPayload): Promise<BookWithAvailability> {
    await this.simulateDelay();
    const sanitizedImage = payload.imageUrl?.trim();

    const newBook: Book = {
      _id: `book-${Date.now()}`,
      title: payload.title,
      author: payload.author,
      ISBN: payload.ISBN,
      description: payload.description,
      category: payload.category,
      publicationYear: payload.publicationYear,
      shelfLocation: payload.shelfLocation,
      isActive: true,
      imageUrl: sanitizedImage || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    books.push(newBook);

    for (let i = 0; i < payload.numberOfCopies; i += 1) {
      const copy: BookCopy = {
        _id: `copy-${Date.now()}-${i}`,
        bookId: newBook._id,
        copyCode: this.generateCopyCode(newBook.title, i + 1),
        status: 'AVAILABLE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      bookCopies.push(copy);
    }

    return this.clone(this.withAvailability(newBook));
  }

  private generateCopyCode(title: string, index: number) {
    const prefix = title
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 4);
    return `${prefix}-${String(index).padStart(3, '0')}`;
  }

  async updateBook(bookId: string, payload: UpdateBookPayload): Promise<BookWithAvailability> {
    await this.simulateDelay();
    const book = books.find((b) => b._id === bookId);
    if (!book) {
      throw new Error('Book not found');
    }

    const { numberOfCopies, ...rest } = payload;
    const sanitizedImage = payload.imageUrl?.trim();

    Object.assign(book, { ...rest, imageUrl: sanitizedImage || undefined }, { updatedAt: new Date().toISOString() });

    if (numberOfCopies && numberOfCopies > this.getTotalCopies(bookId)) {
      const existingTotal = this.getTotalCopies(bookId);
      const copiesToAdd = numberOfCopies - existingTotal;
      for (let i = 0; i < copiesToAdd; i += 1) {
        const copy: BookCopy = {
          _id: `copy-${Date.now()}-${i}`,
          bookId: book._id,
          copyCode: this.generateCopyCode(book.title, existingTotal + i + 1),
          status: 'AVAILABLE',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        bookCopies.push(copy);
      }
    }

    return this.clone(this.withAvailability(book));
  }

  async deactivateBook(bookId: string): Promise<void> {
    await this.simulateDelay();
    const book = books.find((b) => b._id === bookId);
    if (book) {
      book.isActive = false;
      book.updatedAt = new Date().toISOString();
    }
  }

  async reactivateBook(bookId: string): Promise<void> {
    await this.simulateDelay();
    const book = books.find((b) => b._id === bookId);
    if (book) {
      book.isActive = true;
      book.updatedAt = new Date().toISOString();
    }
  }

  async deleteBook(bookId: string): Promise<void> {
    await this.simulateDelay();
    const index = books.findIndex((b) => b._id === bookId);
    if (index === -1) {
      throw new Error('Book not found');
    }

    books.splice(index, 1);

    for (let i = bookCopies.length - 1; i >= 0; i -= 1) {
      if (bookCopies[i].bookId === bookId) {
        bookCopies.splice(i, 1);
      }
    }

    for (let i = loans.length - 1; i >= 0; i -= 1) {
      if (loans[i].bookId === bookId) {
        loans.splice(i, 1);
      }
    }
  }

  resetLibraryData() {
    books.splice(0, books.length, ...this.clone(this.initialBooks));
    bookCopies.splice(0, bookCopies.length, ...this.clone(this.initialBookCopies));
    loans.splice(0, loans.length, ...this.clone(this.initialLoans));
  }

  async getAdminUsers(): Promise<User[]> {
    await this.simulateDelay();
    return this.clone(users.map((user) => this.sanitizeUser(user)));
  }

  async createStaffMember(name: string, email: string, password: string): Promise<User> {
    await this.simulateDelay();

    if (users.some((u) => u.email === email)) {
      throw new Error('Email already exists');
    }

    const newStaff: User = {
      _id: `staff-${Date.now()}`,
      name,
      email,
      passwordHash: password,
      role: 'STAFF',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    users.push(newStaff);
    return this.clone(this.sanitizeUser(newStaff));
  }

  async deleteUser(userId: string, requesterId: string, requesterRole: UserRole): Promise<void> {
    await this.simulateDelay();

    const targetIndex = users.findIndex((u) => u._id === userId);
    if (targetIndex === -1) {
      throw new Error('User not found');
    }

    const targetUser = users[targetIndex];

    if (targetUser._id === requesterId) {
      throw new Error('You cannot delete your own account');
    }

    if (targetUser.role === 'ADMIN' && requesterRole !== 'ADMIN') {
      throw new Error('Only administrators can remove another admin');
    }

    if (targetUser.role === 'STAFF' && requesterRole !== 'ADMIN') {
      throw new Error('Only administrators can remove staff members');
    }

    // Remove associated loans and free any copies
    for (let i = loans.length - 1; i >= 0; i -= 1) {
      if (loans[i].userId === userId) {
        const copy = bookCopies.find((c) => c._id === loans[i].copyId);
        if (copy && loans[i].status !== 'RETURNED') {
          copy.status = 'AVAILABLE';
          copy.updatedAt = new Date().toISOString();
        }
        loans.splice(i, 1);
      }
    }

    users.splice(targetIndex, 1);
  }

  async getAdminLoans(): Promise<LoanWithRelations[]> {
    await this.simulateDelay();
    return this.clone(loans.map((loan) => this.enrichLoan(this.refreshLoanStatus(loan))));
  }

  async requestPasswordReset(email: string): Promise<void> {
    await this.simulateDelay();
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      throw new Error('User not found');
    }
    if (user.role !== 'USER') {
      throw new Error('Only student accounts can request a reset through this form');
    }
    user.needsPasswordReset = true;
    user.updatedAt = new Date().toISOString();
  }

  async resetUserPassword(userId: string, newPassword: string): Promise<void> {
    await this.simulateDelay();
    const user = users.find((u) => u._id === userId);
    if (!user) {
      throw new Error('User not found');
    }
    user.passwordHash = newPassword;
    user.needsPasswordReset = false;
    user.updatedAt = new Date().toISOString();
  }

  async createLoan(payload: CreateLoanPayload): Promise<LoanWithRelations> {
    await this.simulateDelay();
    const availableCopy = bookCopies.find((copy) => copy.bookId === payload.bookId && copy.status === 'AVAILABLE');
    if (!availableCopy) {
      throw new Error('No copies available for this book');
    }

    const newLoan: Loan = {
      _id: `loan-${Date.now()}`,
      userId: payload.userId,
      bookId: payload.bookId,
      copyId: availableCopy._id,
      borrowDate: new Date().toISOString(),
      dueDate: payload.dueDate,
      returnDate: null,
      status: 'BORROWED',
      reminderSent: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    availableCopy.status = 'BORROWED';
    availableCopy.updatedAt = new Date().toISOString();

    loans.push(newLoan);

    return this.clone(this.enrichLoan(newLoan));
  }

  async returnLoan(loanId: string): Promise<void> {
    await this.simulateDelay();
    const loan = loans.find((l) => l._id === loanId);
    if (!loan) {
      throw new Error('Loan not found');
    }

    loan.returnDate = new Date().toISOString();
    loan.status = 'RETURNED';
    loan.updatedAt = new Date().toISOString();

    const copy = bookCopies.find((c) => c._id === loan.copyId);
    if (copy) {
      copy.status = 'AVAILABLE';
      copy.updatedAt = new Date().toISOString();
    }
  }

  async getDashboardStats(): Promise<DashboardStats> {
    await this.simulateDelay();

    const activeLoans = loans.filter((loan) => loan.status === 'BORROWED' || loan.status === 'OVERDUE');
    const overdueLoans = loans.filter((loan) => this.refreshLoanStatus(loan).status === 'OVERDUE');

    const recentLoans = loans
      .slice()
      .sort((a, b) => parseISO(b.borrowDate).getTime() - parseISO(a.borrowDate).getTime())
      .slice(0, 5)
      .map((loan) => this.enrichLoan(loan));

    return {
      activeBooks: books.filter((book) => book.isActive).length,
      totalUsers: users.length,
      activeLoans: activeLoans.length,
      overdueLoans: overdueLoans.length,
      recentLoans: this.clone(recentLoans),
    };
  }

  async sendOverdueReminder(loanId: string): Promise<void> {
    await this.simulateDelay(200);
    const loan = loans.find((l) => l._id === loanId);
    if (!loan) {
      throw new Error('Loan not found');
    }
    this.refreshLoanStatus(loan);
    if (loan.status !== 'OVERDUE') {
      throw new Error('Only overdue loans can receive reminders');
    }
    loan.reminderSent = true;
    loan.updatedAt = new Date().toISOString();
  }

  async getAvailableBooksForLoans(): Promise<BookWithAvailability[]> {
    await this.simulateDelay(150);
    return this.clone(
      books
        .filter((book) => book.isActive && this.getAvailableCopies(book._id) > 0)
        .map((book) => this.withAvailability(book))
    );
  }
}
