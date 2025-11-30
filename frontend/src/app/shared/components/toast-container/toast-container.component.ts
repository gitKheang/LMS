import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { ToastService, ToastVariant } from '@core/services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './toast-container.component.html',
  styleUrl: './toast-container.component.css',
})
export class ToastContainerComponent {
  private readonly toastService = inject(ToastService);
  readonly toasts = this.toastService.toasts;

  dismiss(id: string) {
    this.toastService.dismiss(id);
  }

  iconName(variant: ToastVariant | undefined) {
    if (variant === 'destructive') {
      return 'alert-circle';
    }
    if (variant === 'success') {
      return 'check-circle';
    }
    return 'book-open';
  }

  variantClasses(variant: ToastVariant | undefined) {
    switch (variant) {
      case 'destructive':
        return 'bg-destructive text-destructive-foreground';
      case 'success':
        return 'bg-success text-success-foreground';
      default:
        return 'bg-card text-card-foreground border border-border';
    }
  }
}
