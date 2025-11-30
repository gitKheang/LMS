import {
  AuthResponse,
  BookWithAvailability,
  CreateBookPayload,
  CreateLoanPayload,
  DashboardStats,
  LoanWithRelations,
  UpdateBookPayload,
  User,
  UserRole,
} from '@core/models/library.models';

export interface LibraryApi {
  register(name: string, email: string, password: string, studentId?: string): Promise<AuthResponse>;
  login(email: string, password: string): Promise<AuthResponse>;
  getCurrentUser(token: string): Promise<User>;
  getCategories(): Promise<string[]>;
  getBooks(search?: string, category?: string): Promise<BookWithAvailability[]>;
  getBookById(id: string): Promise<BookWithAvailability>;
  getLoansForUser(userId: string): Promise<LoanWithRelations[]>;
  getAdminBooks(search?: string): Promise<BookWithAvailability[]>;
  createBook(payload: CreateBookPayload): Promise<BookWithAvailability>;
  updateBook(bookId: string, payload: UpdateBookPayload): Promise<BookWithAvailability>;
  deleteBook(bookId: string): Promise<void>;
  getAdminUsers(): Promise<User[]>;
  createStaffMember(name: string, email: string, password: string): Promise<User>;
  deleteUser(userId: string, requesterId: string, requesterRole: UserRole): Promise<void>;
  getAdminLoans(): Promise<LoanWithRelations[]>;
  requestPasswordReset(email: string): Promise<void>;
  resetUserPassword(userId: string, newPassword: string): Promise<void>;
  sendOverdueReminder(loanId: string): Promise<void>;
  getAvailableBooksForLoans(): Promise<BookWithAvailability[]>;
  createLoan(payload: CreateLoanPayload): Promise<LoanWithRelations>;
  returnLoan(loanId: string): Promise<void>;
  getDashboardStats(): Promise<DashboardStats>;
  resetLibraryData(): void;
}
