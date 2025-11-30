import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { format, parseISO } from 'date-fns';
import { LIBRARY_API } from '@core/api/library-api.token';
import { User } from '@core/models/library.models';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '@core/services/auth.service';
import { ToastService } from '@core/services/toast.service';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, ReactiveFormsModule],
  templateUrl: './admin-users.component.html',
})
export class AdminUsersComponent implements OnInit {
  private readonly api = inject(LIBRARY_API);
  readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly users = signal<User[]>([]);
  readonly isLoading = signal(true);
  readonly isSubmitting = signal(false);
  readonly deletingUserId = signal<string | null>(null);
  readonly staffDialogOpen = signal(false);
  readonly showStaffPassword = signal(false);

  readonly memberCount = computed(() => this.users().filter((user) => user.role === 'USER').length);
  readonly adminCount = computed(() => this.users().filter((user) => user.role === 'ADMIN').length);
  readonly staffCount = computed(() => this.users().filter((user) => user.role === 'STAFF').length);

  readonly staffForm = this.fb.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });
  readonly resetForm = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(6)]],
  });
  readonly resetDialogOpen = signal(false);
  readonly resetTargetUser = signal<User | null>(null);
  readonly isResetSubmitting = signal(false);

  ngOnInit() {
    this.loadUsers();
  }

  private sortUsersByRole(list: User[]) {
    const priority: Record<User['role'], number> = {
      ADMIN: 0,
      STAFF: 1,
      USER: 2,
    };
    return list.slice().sort((a, b) => {
      const roleDiff = priority[a.role] - priority[b.role];
      if (roleDiff !== 0) {
        return roleDiff;
      }
      return a.name.localeCompare(b.name);
    });
  }

  async loadUsers() {
    this.isLoading.set(true);
    try {
      const users = await this.api.getAdminUsers();
      this.users.set(this.sortUsersByRole(users));
    } catch (error) {
      console.error(error);
    } finally {
      this.isLoading.set(false);
    }
  }

  formatDate(value: string) {
    return format(parseISO(value), 'MMM dd, yyyy');
  }

  openStaffDialog() {
    this.staffForm.reset();
    this.staffDialogOpen.set(true);
  }

  closeStaffDialog() {
    if (!this.isSubmitting()) {
      this.staffDialogOpen.set(false);
      this.showStaffPassword.set(false);
    }
  }

  async createStaff() {
    if (this.staffForm.invalid) {
      this.staffForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const { name, email, password } = this.staffForm.value;

    try {
      await this.api.createStaffMember(name!, email!, password!);
      this.toast.show({ title: 'Staff member created', description: `${name} can now log in as staff.` });
      this.staffDialogOpen.set(false);
      this.showStaffPassword.set(false);
      await this.loadUsers();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create staff member';
      this.toast.show({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      this.isSubmitting.set(false);
    }
  }

  toggleStaffPasswordVisibility() {
    this.showStaffPassword.update((value) => !value);
  }

  openResetDialog(user: User) {
    this.resetForm.reset();
    this.resetTargetUser.set(user);
    this.resetDialogOpen.set(true);
  }

  closeResetDialog() {
    if (!this.isResetSubmitting()) {
      this.resetDialogOpen.set(false);
      this.resetTargetUser.set(null);
    }
  }

  canDelete(user: User) {
    const current = this.auth.getUserValue();
    if (!current) {
      return false;
    }
    if (user._id === current._id) {
      return false;
    }
    if (user.role === 'ADMIN' && current.role !== 'ADMIN') {
      return false;
    }
    if (current.role === 'STAFF' && user.role !== 'USER') {
      return false;
    }
    return true;
  }

  canResetPassword(user: User) {
    const current = this.auth.getUserValue();
    if (!current) {
      return false;
    }
    if (current.role === 'ADMIN') {
      return true;
    }
    if (current.role === 'STAFF' && user.role === 'USER') {
      return true;
    }
    return false;
  }

  async resetPassword() {
    if (this.resetForm.invalid || !this.resetTargetUser()) {
      this.resetForm.markAllAsTouched();
      return;
    }

    this.isResetSubmitting.set(true);
    const password = this.resetForm.value.password!;
    const target = this.resetTargetUser()!;

    try {
      await this.auth.resetUserPassword(target._id, password);
      this.toast.show({ title: 'Password updated', description: `${target.name}'s password has been reset.` });
      this.resetDialogOpen.set(false);
      this.resetTargetUser.set(null);
      await this.loadUsers();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to reset password';
      this.toast.show({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      this.isResetSubmitting.set(false);
    }
  }

  async deleteUser(user: User) {
    const requester = this.auth.getUserValue();
    if (!requester) {
      this.toast.show({ title: 'Error', description: 'You must be logged in', variant: 'destructive' });
      return;
    }

    const confirmed = window.confirm(`Are you sure you want to remove ${user.name}?`);
    if (!confirmed) {
      return;
    }

    this.deletingUserId.set(user._id);
    try {
      await this.api.deleteUser(user._id, requester._id, requester.role);
      this.toast.show({ title: 'User removed', description: `${user.name} has been removed from the system.` });
      await this.loadUsers();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete user';
      this.toast.show({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      this.deletingUserId.set(null);
    }
  }

  async copyResetPassword() {
    const password = this.resetForm.value.password;
    if (!password || password.length === 0) {
      this.toast.show({
        title: 'Password required',
        description: 'Enter a temporary password before copying.',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard) {
        throw new Error('Clipboard not available');
      }
      await navigator.clipboard.writeText(password);
      this.toast.show({ title: 'Copied', description: 'Temporary password copied to clipboard.' });
    } catch (error) {
      this.toast.show({
        title: 'Copy failed',
        description: error instanceof Error ? error.message : 'Unable to copy to clipboard',
        variant: 'destructive',
      });
    }
  }

  emailLink(user: User) {
    const base = `mailto:${user.email}`;
    const params = new URLSearchParams();

    if (user.needsPasswordReset) {
      params.set('subject', 'University Library password reset');
      params.set(
        'body',
        `Hi ${user.name},\n\nWe received your request to reset the University Library password. Please use the temporary password shared in this email and change it immediately after logging in.\n\nThank you.`
      );
    } else {
      params.set('subject', 'University Library account support');
    }

    const query = params.toString();
    return query ? `${base}?${query}` : base;
  }

  emailLinkTitle(user: User) {
    return user.needsPasswordReset ? 'Reply to this password reset request' : 'Email this user';
  }
}
