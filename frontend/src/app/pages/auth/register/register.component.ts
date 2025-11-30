import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '@core/services/auth.service';
import { ToastService } from '@core/services/toast.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, LucideAngularModule],
  templateUrl: './register.component.html',
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly form = this.fb.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    studentId: [''],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required],
  });

  readonly isSubmitting = signal(false);
  readonly showPassword = signal(false);
  readonly showConfirmPassword = signal(false);

  get passwordsMatch() {
    return this.form.value.password === this.form.value.confirmPassword;
  }

  async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (!this.passwordsMatch) {
      this.toast.show({ title: 'Registration failed', description: 'Passwords do not match', variant: 'destructive' });
      return;
    }

    this.isSubmitting.set(true);
    const { name, email, password, studentId } = this.form.value;

    try {
      await this.auth.register(name!, email!, password!, studentId || undefined);
      this.toast.show({ title: 'Registration successful', description: 'Welcome to the library!' });
      await this.router.navigateByUrl('/catalog');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong';
      this.toast.show({ title: 'Registration failed', description: message, variant: 'destructive' });
    } finally {
      this.isSubmitting.set(false);
    }
  }

  togglePasswordVisibility(target: 'password' | 'confirm') {
    if (target === 'password') {
      this.showPassword.update((value) => !value);
    } else {
      this.showConfirmPassword.update((value) => !value);
    }
  }
}
