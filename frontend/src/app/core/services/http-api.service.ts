import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { LibraryApi } from '@core/api/library-api.types';
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
import { API_CONFIG } from '../config/api.config';

/**
 * HTTP-based implementation of LibraryApi
 * Communicates with Express backend REST API
 */
@Injectable({ providedIn: 'root' })
export class HttpApiService implements LibraryApi {
  private http = inject(HttpClient);
  private baseUrl = API_CONFIG.baseUrl;

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('library-token');
    if (token) {
      return new HttpHeaders({ Authorization: `Bearer ${token}` });
    }
    return new HttpHeaders();
  }

  // ========== AUTHENTICATION ==========

  async register(
    name: string,
    email: string,
    password: string,
    studentId?: string
  ): Promise<AuthResponse> {
    return firstValueFrom(
      this.http.post<AuthResponse>(`${this.baseUrl}/auth/register`, {
        name,
        email,
        password,
        studentId,
      })
    );
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    return firstValueFrom(
      this.http.post<AuthResponse>(`${this.baseUrl}/auth/login`, {
        email,
        password,
      })
    );
  }

  async getCurrentUser(token: string): Promise<User> {
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return firstValueFrom(
      this.http.get<User>(`${this.baseUrl}/auth/me`, { headers })
    );
  }

  // ========== BOOKS ==========

  async getCategories(): Promise<string[]> {
    return firstValueFrom(
      this.http.get<string[]>(`${this.baseUrl}/books/categories`)
    );
  }

  async getBooks(search?: string, category?: string): Promise<BookWithAvailability[]> {
    let params = new HttpParams();
    if (search) params = params.set('search', search);
    if (category) params = params.set('category', category);

    return firstValueFrom(
      this.http.get<BookWithAvailability[]>(`${this.baseUrl}/books`, { params })
    );
  }

  async getBookById(id: string): Promise<BookWithAvailability> {
    return firstValueFrom(
      this.http.get<BookWithAvailability>(`${this.baseUrl}/books/${id}`)
    );
  }

  async getAdminBooks(search?: string): Promise<BookWithAvailability[]> {
    let params = new HttpParams();
    if (search) params = params.set('search', search);

    return firstValueFrom(
      this.http.get<BookWithAvailability[]>(`${this.baseUrl}/admin/books`, {
        headers: this.getAuthHeaders(),
        params,
      })
    );
  }

  async createBook(payload: CreateBookPayload): Promise<BookWithAvailability> {
    return firstValueFrom(
      this.http.post<BookWithAvailability>(`${this.baseUrl}/admin/books`, payload, {
        headers: this.getAuthHeaders(),
      })
    );
  }

  async updateBook(
    bookId: string,
    payload: UpdateBookPayload
  ): Promise<BookWithAvailability> {
    return firstValueFrom(
      this.http.put<BookWithAvailability>(
        `${this.baseUrl}/admin/books/${bookId}`,
        payload,
        { headers: this.getAuthHeaders() }
      )
    );
  }

  async deleteBook(bookId: string): Promise<void> {
    await firstValueFrom(
      this.http.delete<void>(`${this.baseUrl}/admin/books/${bookId}`, {
        headers: this.getAuthHeaders(),
      })
    );
  }

  async getAvailableBooksForLoans(): Promise<BookWithAvailability[]> {
    return firstValueFrom(
      this.http.get<BookWithAvailability[]>(`${this.baseUrl}/books/available-for-loans`, {
        headers: this.getAuthHeaders(),
      })
    );
  }

  // ========== LOANS ==========

  async getLoansForUser(userId: string): Promise<LoanWithRelations[]> {
    return firstValueFrom(
      this.http.get<LoanWithRelations[]>(`${this.baseUrl}/loans/user/${userId}`, {
        headers: this.getAuthHeaders(),
      })
    );
  }

  async getAdminLoans(): Promise<LoanWithRelations[]> {
    return firstValueFrom(
      this.http.get<LoanWithRelations[]>(`${this.baseUrl}/admin/loans`, {
        headers: this.getAuthHeaders(),
      })
    );
  }

  async createLoan(payload: CreateLoanPayload): Promise<LoanWithRelations> {
    return firstValueFrom(
      this.http.post<LoanWithRelations>(`${this.baseUrl}/admin/loans`, payload, {
        headers: this.getAuthHeaders(),
      })
    );
  }

  async returnLoan(loanId: string): Promise<void> {
    await firstValueFrom(
      this.http.post<void>(`${this.baseUrl}/admin/loans/${loanId}/return`, {}, {
        headers: this.getAuthHeaders(),
      })
    );
  }

  async getDashboardStats(): Promise<DashboardStats> {
    return firstValueFrom(
      this.http.get<DashboardStats>(`${this.baseUrl}/admin/dashboard`, {
        headers: this.getAuthHeaders(),
      })
    );
  }

  async sendOverdueReminder(loanId: string): Promise<void> {
    await firstValueFrom(
      this.http.post<void>(`${this.baseUrl}/admin/loans/${loanId}/remind`, {}, {
        headers: this.getAuthHeaders(),
      })
    );
  }

  // ========== USERS ==========

  async getAdminUsers(): Promise<User[]> {
    return firstValueFrom(
      this.http.get<User[]>(`${this.baseUrl}/admin/users`, {
        headers: this.getAuthHeaders(),
      })
    );
  }

  async createStaffMember(
    name: string,
    email: string,
    password: string
  ): Promise<User> {
    return firstValueFrom(
      this.http.post<User>(
        `${this.baseUrl}/admin/users/staff`,
        { name, email, password },
        { headers: this.getAuthHeaders() }
      )
    );
  }

  async deleteUser(
    userId: string,
    requesterId: string,
    requesterRole: UserRole
  ): Promise<void> {
    await firstValueFrom(
      this.http.delete<void>(`${this.baseUrl}/admin/users/${userId}`, {
        headers: this.getAuthHeaders(),
      })
    );
  }

  async requestPasswordReset(email: string): Promise<void> {
    await firstValueFrom(
      this.http.post<void>(`${this.baseUrl}/users/request-password-reset`, { email })
    );
  }

  async resetUserPassword(userId: string, newPassword: string): Promise<void> {
    await firstValueFrom(
      this.http.post<void>(
        `${this.baseUrl}/admin/users/${userId}/reset-password`,
        { newPassword },
        { headers: this.getAuthHeaders() }
      )
    );
  }

  // ========== UTILITY ==========

  resetLibraryData(): void {
    console.warn('resetLibraryData is not available for HTTP API');
  }
}
