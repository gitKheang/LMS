export type UserRole = 'USER' | 'ADMIN' | 'STAFF';
export type UserStatus = 'ACTIVE' | 'BLOCKED';

export interface User {
  _id: string;
  name: string;
  email: string;
  passwordHash?: string;
  studentId?: string;
  role: UserRole;
  status: UserStatus;
  needsPasswordReset?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Book {
  _id: string;
  title: string;
  author: string;
  ISBN: string;
  description: string;
  category: string;
  publicationYear: number;
  shelfLocation: string;
  isActive: boolean;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookCopy {
  _id: string;
  bookId: string;
  copyCode: string;
  status: 'AVAILABLE' | 'BORROWED' | 'LOST';
  createdAt: string;
  updatedAt: string;
}

export type LoanStatus = 'BORROWED' | 'RETURNED' | 'OVERDUE';

export interface Loan {
  _id: string;
  userId: string;
  bookId: string;
  copyId: string;
  borrowDate: string;
  dueDate: string;
  returnDate: string | null;
  status: LoanStatus;
  reminderSent?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoanWithRelations extends Loan {
  user?: User;
  book: Book;
  copy: BookCopy;
}

export interface BookWithAvailability extends Book {
  availableCopies: number;
  totalCopies: number;
}

export interface DashboardStats {
  activeBooks: number;
  totalUsers: number;
  activeLoans: number;
  overdueLoans: number;
  recentLoans: LoanWithRelations[];
}

export interface CreateBookPayload {
  title: string;
  author: string;
  ISBN: string;
  description: string;
  category: string;
  publicationYear: number;
  shelfLocation: string;
  numberOfCopies: number;
  imageUrl?: string;
}

export interface UpdateBookPayload extends Omit<CreateBookPayload, 'numberOfCopies'> {
  numberOfCopies?: number;
}

export interface CreateLoanPayload {
  userId: string;
  bookId: string;
  dueDate: string;
}
