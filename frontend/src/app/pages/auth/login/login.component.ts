import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '@core/services/auth.service';
import { ToastService } from '@core/services/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, LucideAngularModule],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  readonly isSubmitting = signal(false);
  readonly showPassword = signal(false);
  readonly forgotDialogOpen = signal(false);
  readonly forgotEmail = signal('');
  readonly isResetSubmitting = signal(false);
  readonly returnUrl = computed(() => this.route.snapshot.queryParamMap.get('returnUrl') || '/');

  async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const { email, password } = this.form.value;

    try {
      await this.auth.login(email!, password!);
      this.toast.show({ title: 'Login successful', description: 'Welcome back!' });
      const redirectTarget = this.resolveRedirectTarget(this.returnUrl());
      await this.router.navigateByUrl(redirectTarget);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid credentials';
      this.toast.show({ title: 'Login failed', description: message, variant: 'destructive' });
    } finally {
      this.isSubmitting.set(false);
    }
  }

  togglePasswordVisibility() {
    this.showPassword.update((value) => !value);
  }

  openForgotDialog() {
    this.forgotEmail.set(this.form.value.email || '');
    this.forgotDialogOpen.set(true);
  }

  closeForgotDialog() {
    if (!this.isResetSubmitting()) {
      this.forgotDialogOpen.set(false);
    }
  }

  async submitResetRequest() {
    if (!this.forgotEmail()) {
      this.toast.show({
        title: 'Email required',
        description: 'Enter the email associated with the account.',
        variant: 'destructive',
      });
      return;
    }

    this.isResetSubmitting.set(true);
    try {
      await this.auth.requestPasswordReset(this.forgotEmail());
      this.toast.show({
        title: 'Request sent',
        description: 'Please check your email for the new temporary password.',
      });
      this.forgotDialogOpen.set(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit reset request';
      this.toast.show({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      this.isResetSubmitting.set(false);
    }
  }

  private resolveRedirectTarget(returnUrl: string | null) {
    const fallback = this.defaultDestination();
    if (!returnUrl || returnUrl === '/') {
      return fallback;
    }
    return this.canAccessRoute(returnUrl) ? returnUrl : fallback;
  }

  private defaultDestination() {
    if (this.auth.isAdmin()) {
      return '/admin';
    }
    if (this.auth.isStaff()) {
      return '/admin/users';
    }
    return '/catalog';
  }

  private canAccessRoute(target: string) {
    if (target.startsWith('/admin/books')) {
      return this.auth.isAdmin();
    }
    if (target.startsWith('/admin')) {
      return this.auth.hasManagementAccess();
    }
    if (target.startsWith('/my-account')) {
      return this.auth.isAuthenticated();
    }
    return true;
  }
}
