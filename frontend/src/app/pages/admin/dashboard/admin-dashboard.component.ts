import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { LIBRARY_API } from '@core/api/library-api.token';
import { DashboardStats } from '@core/models/library.models';
import { format, parseISO } from 'date-fns';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './admin-dashboard.component.html',
})
export class AdminDashboardComponent implements OnInit {
  private readonly api = inject(LIBRARY_API);

  readonly stats = signal<DashboardStats | null>(null);
  readonly isLoading = signal(true);

  ngOnInit() {
    this.loadStats();
  }

  async loadStats() {
    this.isLoading.set(true);
    try {
      const stats = await this.api.getDashboardStats();
      this.stats.set(stats);
    } catch (error) {
      console.error(error);
    } finally {
      this.isLoading.set(false);
    }
  }

  formatDate(value: string) {
    return format(parseISO(value), 'MMM dd, yyyy');
  }
}
