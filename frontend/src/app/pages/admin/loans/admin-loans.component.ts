import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { addDays, format, parseISO } from 'date-fns';
import { LIBRARY_API } from '@core/api/library-api.token';
import { LoanWithRelations, User, BookWithAvailability } from '@core/models/library.models';
import { ToastService } from '@core/services/toast.service';

@Component({
  selector: 'app-admin-loans',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './admin-loans.component.html',
})
export class AdminLoansComponent implements OnInit {
  private readonly api = inject(LIBRARY_API);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);

  readonly loans = signal<LoanWithRelations[]>([]);
  readonly users = signal<User[]>([]);
  readonly availableBooks = signal<BookWithAvailability[]>([]);
  readonly isLoading = signal(true);
  readonly dialogOpen = signal(false);
  readonly submitting = signal(false);
  readonly remindingLoanId = signal<string | null>(null);

  readonly form = this.fb.group({
    userId: ['', Validators.required],
    bookId: ['', Validators.required],
    dueDate: [format(addDays(new Date(), 14), 'yyyy-MM-dd'), Validators.required],
  });

  readonly activeLoans = computed(() => this.loans().filter((loan) => loan.status === 'BORROWED' || loan.status === 'OVERDUE'));
  readonly returnedLoans = computed(() => this.loans().filter((loan) => loan.status === 'RETURNED'));
  readonly overdueCount = computed(() => this.loans().filter((loan) => loan.status === 'OVERDUE').length);

  ngOnInit() {
    this.loadAllData();
  }

  async loadAllData() {
    this.isLoading.set(true);
    try {
      const [loans, users, books] = await Promise.all([
        this.api.getAdminLoans(),
        this.api.getAdminUsers(),
        this.api.getAvailableBooksForLoans(),
      ]);
      this.loans.set(loans);
      this.users.set(users.filter((user) => user.role === 'USER'));
      this.availableBooks.set(books);
    } catch (error) {
      console.error(error);
    } finally {
      this.isLoading.set(false);
    }
  }

  openDialog() {
    this.form.reset({
      userId: '',
      bookId: '',
      dueDate: format(addDays(new Date(), 14), 'yyyy-MM-dd'),
    });
    this.dialogOpen.set(true);
  }

  closeDialog() {
    this.dialogOpen.set(false);
  }

  async createLoan() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    try {
      await this.api.createLoan({
        userId: this.form.value.userId!,
        bookId: this.form.value.bookId!,
        dueDate: this.form.value.dueDate!,
      });
      this.toast.show({ title: 'Loan created', description: 'Successfully created new loan' });
      this.closeDialog();
      await this.loadAllData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create loan';
      this.toast.show({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      this.submitting.set(false);
    }
  }

  async markReturned(loan: LoanWithRelations) {
    try {
      await this.api.returnLoan(loan._id);
      this.toast.show({ title: 'Book returned', description: `${loan.book.title} marked as returned` });
      await this.loadAllData();
    } catch (error) {
      this.toast.show({ title: 'Error', description: 'Failed to mark as returned', variant: 'destructive' });
    }
  }

  formatDate(value: string | null) {
    if (!value) {
      return '';
    }
    return format(parseISO(value), 'MMM dd, yyyy');
  }

  statusClasses(status: LoanWithRelations['status']) {
    switch (status) {
      case 'OVERDUE':
        return 'bg-destructive/10 text-destructive border border-destructive/20';
      case 'RETURNED':
        return 'bg-secondary text-secondary-foreground border border-border';
      default:
        return 'bg-primary/10 text-primary border border-primary/20';
    }
  }

  async sendReminder(loan: LoanWithRelations) {
    this.remindingLoanId.set(loan._id);
    try {
      await this.api.sendOverdueReminder(loan._id);
      this.toast.show({
        title: 'Reminder sent',
        description: `Notified ${loan.user?.name} about the overdue book.`,
      });
      await this.loadAllData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send reminder';
      this.toast.show({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      this.remindingLoanId.set(null);
    }
  }
}
