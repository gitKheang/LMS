import { Injectable, signal } from '@angular/core';

export type ToastVariant = 'default' | 'destructive' | 'success';

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private toastsSignal = signal<ToastMessage[]>([]);
  private timers = new Map<string, number>();

  readonly toasts = this.toastsSignal.asReadonly();

  show(message: Omit<ToastMessage, 'id'>, duration = 4000) {
    const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Date.now().toString();
    const toast: ToastMessage = { id, ...message };
    this.toastsSignal.update((current) => [...current, toast]);

    const timer = window.setTimeout(() => {
      this.dismiss(id);
    }, duration);

    this.timers.set(id, timer);
  }

  dismiss(id: string) {
    const timer = this.timers.get(id);
    if (timer) {
      window.clearTimeout(timer);
      this.timers.delete(id);
    }
    this.toastsSignal.update((current) => current.filter((toast) => toast.id !== id));
  }
}
