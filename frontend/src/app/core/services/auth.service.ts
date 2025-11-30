import { Injectable, computed, signal, inject } from '@angular/core';
import { LIBRARY_API } from '@core/api/library-api.token';
import { User } from '../models/library.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private userSignal = signal<User | null>(null);
  private tokenSignal = signal<string | null>(null);
  private loadingSignal = signal(true);
  private initialization: Promise<void>;
  private readonly api = inject(LIBRARY_API);

  readonly user = computed(() => this.userSignal());
  readonly token = computed(() => this.tokenSignal());
  readonly isAuthenticated = computed(() => !!this.userSignal());
  readonly isAdmin = computed(() => this.userSignal()?.role === 'ADMIN');
  readonly isStaff = computed(() => this.userSignal()?.role === 'STAFF');
  readonly hasManagementAccess = computed(() => {
    const role = this.userSignal()?.role;
    return role === 'ADMIN' || role === 'STAFF';
  });
  readonly isLoading = computed(() => this.loadingSignal());

  constructor() {
    const storedToken = localStorage.getItem('library-token');
    if (storedToken) {
      this.initialization = this.restoreSession(storedToken);
    } else {
      this.loadingSignal.set(false);
      this.initialization = Promise.resolve();
    }
  }

  private async restoreSession(token: string) {
    try {
      const user = await this.api.getCurrentUser(token);
      this.userSignal.set(user);
      this.tokenSignal.set(token);
    } catch (error) {
      console.error('Failed to restore session', error);
      localStorage.removeItem('library-token');
    } finally {
      this.loadingSignal.set(false);
    }
  }

  waitForSession() {
    return this.initialization;
  }

  async login(email: string, password: string) {
    const response = await this.api.login(email, password);
    this.userSignal.set(response.user);
    this.tokenSignal.set(response.token);
    localStorage.setItem('library-token', response.token);
  }

  async register(name: string, email: string, password: string, studentId?: string) {
    const response = await this.api.register(name, email, password, studentId);
    this.userSignal.set(response.user);
    this.tokenSignal.set(response.token);
    localStorage.setItem('library-token', response.token);
  }
  async requestPasswordReset(email: string) {
    await this.api.requestPasswordReset(email);
  }

  async resetUserPassword(userId: string, newPassword: string) {
    await this.api.resetUserPassword(userId, newPassword);
  }

  async sendOverdueReminder(loanId: string) {
    await this.api.sendOverdueReminder(loanId);
  }

  logout() {
    this.userSignal.set(null);
    this.tokenSignal.set(null);
    localStorage.removeItem('library-token');
  }

  getTokenValue() {
    return this.tokenSignal();
  }

  getUserValue() {
    return this.userSignal();
  }
}
