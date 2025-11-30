import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '@core/services/auth.service';
import { UserRole } from '@core/models/library.models';

interface NavigationCard {
  label: string;
  icon: string;
  route: string;
  allowedRoles?: UserRole[];
  roleRoutes?: Partial<Record<UserRole, string>>;
}

@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, LucideAngularModule],
  templateUrl: './navigation.component.html',
})
export class NavigationComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  auth = this.authService;
  readonly cards: NavigationCard[] = [
    { label: 'Catalog', icon: 'search', route: '/catalog' },
    { label: 'Active Books', icon: 'book-open', route: '/admin/books', allowedRoles: ['ADMIN', 'STAFF'] },
    { label: 'Total Users', icon: 'users', route: '/admin/users', allowedRoles: ['ADMIN', 'STAFF'] },
    {
      label: 'Active Loans',
      icon: 'book-marked',
      route: '/admin/loans',
      allowedRoles: ['ADMIN', 'STAFF', 'USER'],
      roleRoutes: { USER: '/my-account' },
    },
  ];

  async logout() {
    this.authService.logout();
    await this.router.navigateByUrl('/');
  }

  canShowCard(card: NavigationCard) {
    if (!this.auth.isAuthenticated()) {
      return false;
    }

    if (!card.allowedRoles?.length) {
      return true;
    }

    const role = this.auth.user()?.role;
    return !!role && card.allowedRoles.includes(role);
  }

  resolveRoute(card: NavigationCard) {
    const role = this.auth.user()?.role;
    if (role && card.roleRoutes?.[role]) {
      return card.roleRoutes[role]!;
    }
    return card.route;
  }
}
