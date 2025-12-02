import { CommonModule } from "@angular/common";
import {
  Component,
  inject,
  signal,
  OnInit,
  OnDestroy,
  effect,
} from "@angular/core";
import { Router, RouterLink, RouterLinkActive } from "@angular/router";
import { LucideAngularModule } from "lucide-angular";
import { AuthService } from "@core/services/auth.service";
import { UserRole, Notification } from "@core/models/library.models";
import { LIBRARY_API } from "@core/api/library-api.token";

interface NavigationCard {
  label: string;
  icon: string;
  route: string;
  allowedRoles?: UserRole[];
  roleRoutes?: Partial<Record<UserRole, string>>;
}

@Component({
  selector: "app-navigation",
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, LucideAngularModule],
  templateUrl: "./navigation.component.html",
})
export class NavigationComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly api = inject(LIBRARY_API);
  private notificationInterval: any;
  private wasAuthenticated = false;

  auth = this.authService;
  notifications = signal<Notification[]>([]);
  unreadCount = signal(0);
  showNotifications = signal(false);

  readonly cards: NavigationCard[] = [
    { label: "Catalog", icon: "search", route: "/catalog" },
    {
      label: "Active Books",
      icon: "book-open",
      route: "/admin/books",
      allowedRoles: ["ADMIN", "STAFF"],
    },
    {
      label: "Total Users",
      icon: "users",
      route: "/admin/users",
      allowedRoles: ["ADMIN", "STAFF"],
    },
    {
      label: "Active Loans",
      icon: "book-marked",
      route: "/admin/loans",
      allowedRoles: ["ADMIN", "STAFF", "USER"],
      roleRoutes: { USER: "/my-account" },
    },
  ];

  constructor() {
    // Use effect to react to auth state changes
    effect(() => {
      const isAuthenticated = this.auth.isAuthenticated();

      // User just logged in
      if (isAuthenticated && !this.wasAuthenticated) {
        this.loadNotifications();
        this.startPolling();
      }

      // User just logged out
      if (!isAuthenticated && this.wasAuthenticated) {
        this.stopPolling();
        this.notifications.set([]);
        this.unreadCount.set(0);
        this.showNotifications.set(false);
      }

      this.wasAuthenticated = isAuthenticated;
    });
  }

  ngOnInit() {
    // Initial load if already authenticated
    if (this.auth.isAuthenticated()) {
      this.wasAuthenticated = true;
      this.loadNotifications();
      this.startPolling();
    }
  }

  ngOnDestroy() {
    this.stopPolling();
  }

  private startPolling() {
    if (this.notificationInterval) return;
    // Poll for new notifications every 30 seconds
    this.notificationInterval = setInterval(() => {
      if (this.auth.isAuthenticated()) {
        this.loadUnreadCount();
      }
    }, 30000);
  }

  private stopPolling() {
    if (this.notificationInterval) {
      clearInterval(this.notificationInterval);
      this.notificationInterval = null;
    }
  }

  async loadNotifications() {
    try {
      const [notifications, countResult] = await Promise.all([
        this.api.getNotifications(),
        this.api.getUnreadNotificationCount(),
      ]);
      this.notifications.set(notifications);
      this.unreadCount.set(countResult.count);
    } catch (error) {
      console.error("Failed to load notifications:", error);
    }
  }

  async loadUnreadCount() {
    try {
      const result = await this.api.getUnreadNotificationCount();
      this.unreadCount.set(result.count);
    } catch (error) {
      console.error("Failed to load unread count:", error);
    }
  }

  toggleNotifications() {
    this.showNotifications.update((v) => !v);
    if (this.showNotifications()) {
      this.loadNotifications();
    }
  }

  async handleNotificationClick(notification: Notification) {
    // Mark as read
    try {
      if (!notification.isRead) {
        await this.api.markNotificationAsRead(notification._id);
        this.notifications.update((list) =>
          list.map((n) =>
            n._id === notification._id ? { ...n, isRead: true } : n
          )
        );
        this.unreadCount.update((c) => Math.max(0, c - 1));
      }
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }

    // Navigate to relevant page based on notification type
    const route = this.getNotificationRoute(notification);
    if (route) {
      this.showNotifications.set(false);
      await this.router.navigateByUrl(route);
    }
  }

  getNotificationRoute(notification: Notification): string | null {
    switch (notification.type) {
      case "PASSWORD_RESET_REQUEST":
        return "/admin/users";
      case "OVERDUE_REMINDER":
        return "/my-account";
      case "LOAN_CREATED":
        return "/my-account";
      default:
        return null;
    }
  }

  async markAsRead(notification: Notification) {
    try {
      await this.api.markNotificationAsRead(notification._id);
      this.notifications.update((list) =>
        list.map((n) =>
          n._id === notification._id ? { ...n, isRead: true } : n
        )
      );
      this.unreadCount.update((c) => Math.max(0, c - 1));
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  }

  async markAllAsRead() {
    try {
      await this.api.markAllNotificationsAsRead();
      this.notifications.update((list) =>
        list.map((n) => ({ ...n, isRead: true }))
      );
      this.unreadCount.set(0);
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  }

  async deleteNotification(notification: Notification, event: Event) {
    event.stopPropagation();
    try {
      await this.api.deleteNotification(notification._id);
      this.notifications.update((list) =>
        list.filter((n) => n._id !== notification._id)
      );
      if (!notification.isRead) {
        this.unreadCount.update((c) => Math.max(0, c - 1));
      }
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  getNotificationIcon(notification: Notification): string {
    switch (notification.type) {
      case "OVERDUE_REMINDER":
        return "alert-circle";
      case "PASSWORD_RESET_REQUEST":
        return "key";
      case "LOAN_CREATED":
        return "book-open";
      default:
        return "bell";
    }
  }

  getNotificationIconClass(notification: Notification): string {
    if (notification.isRead) {
      return "bg-muted";
    }
    switch (notification.type) {
      case "OVERDUE_REMINDER":
        return "bg-destructive/10";
      case "PASSWORD_RESET_REQUEST":
        return "bg-orange-500/10";
      case "LOAN_CREATED":
        return "bg-primary/10";
      default:
        return "bg-primary/10";
    }
  }

  getNotificationIconColorClass(notification: Notification): string {
    if (notification.isRead) {
      return "text-muted-foreground";
    }
    switch (notification.type) {
      case "OVERDUE_REMINDER":
        return "text-destructive";
      case "PASSWORD_RESET_REQUEST":
        return "text-orange-500";
      case "LOAN_CREATED":
        return "text-primary";
      default:
        return "text-primary";
    }
  }

  async logout() {
    this.authService.logout();
    await this.router.navigateByUrl("/");
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
