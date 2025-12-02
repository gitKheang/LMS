import { CommonModule } from "@angular/common";
import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { format, parseISO } from "date-fns";
import { LIBRARY_API } from "@core/api/library-api.token";
import { LoanWithRelations, Notification } from "@core/models/library.models";
import { AuthService } from "@core/services/auth.service";
import { ToastService } from "@core/services/toast.service";
import { LucideAngularModule } from "lucide-angular";

@Component({
  selector: "app-my-account",
  standalone: true,
  imports: [CommonModule, LucideAngularModule, ReactiveFormsModule],
  templateUrl: "./my-account.component.html",
})
export class MyAccountComponent implements OnInit {
  private readonly api = inject(LIBRARY_API);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);

  readonly loans = signal<LoanWithRelations[]>([]);
  readonly notifications = signal<Notification[]>([]);
  readonly isLoading = signal(true);
  readonly activeTab = signal<"current" | "history">("current");
  
  // Change password
  readonly showChangePassword = signal(false);
  readonly isChangingPassword = signal(false);
  readonly showCurrentPassword = signal(false);
  readonly showNewPassword = signal(false);
  readonly showConfirmPassword = signal(false);

  readonly passwordForm = this.fb.group({
    currentPassword: ["", [Validators.required]],
    newPassword: ["", [Validators.required, Validators.minLength(6)]],
    confirmPassword: ["", [Validators.required]],
  });

  readonly currentLoans = computed(() =>
    this.loans().filter(
      (loan) => loan.status === "BORROWED" || loan.status === "OVERDUE"
    )
  );
  readonly pastLoans = computed(() =>
    this.loans().filter((loan) => loan.status === "RETURNED")
  );
  readonly overdueCount = computed(
    () => this.loans().filter((loan) => loan.status === "OVERDUE").length
  );
  readonly unreadNotifications = computed(() =>
    this.notifications().filter((n) => !n.isRead)
  );
  // Get only the latest unread notification (most recent first)
  readonly latestUnreadNotification = computed(() => {
    const unread = this.unreadNotifications();
    return unread.length > 0 ? unread[0] : null;
  });
  // Count of remaining unread notifications after the current one
  readonly remainingNotificationsCount = computed(() => {
    return Math.max(0, this.unreadNotifications().length - 1);
  });

  ngOnInit() {
    this.loadLoans();
    this.loadNotifications();
  }

  async loadLoans() {
    this.isLoading.set(true);
    const user = this.auth.getUserValue();
    if (!user) {
      this.isLoading.set(false);
      return;
    }

    try {
      const loans = await this.api.getLoansForUser(user._id);
      this.loans.set(loans);
    } catch (error) {
      console.error(error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadNotifications() {
    try {
      const notifications = await this.api.getNotifications();
      this.notifications.set(notifications);
    } catch (error) {
      console.error("Failed to load notifications:", error);
    }
  }

  async dismissNotification(notification: Notification) {
    try {
      await this.api.markNotificationAsRead(notification._id);
      this.notifications.update((list) =>
        list.map((n) =>
          n._id === notification._id ? { ...n, isRead: true } : n
        )
      );
    } catch (error) {
      console.error("Failed to dismiss notification:", error);
    }
  }

  async deleteNotification(notification: Notification) {
    try {
      await this.api.deleteNotification(notification._id);
      this.notifications.update((list) =>
        list.filter((n) => n._id !== notification._id)
      );
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  }

  formatDate(value: string | null) {
    if (!value) {
      return "";
    }
    return format(parseISO(value), "MMM dd, yyyy");
  }

  formatNotificationDate(dateString: string): string {
    const date = new Date(dateString);
    return format(date, "MMM dd, yyyy 'at' h:mm a");
  }

  setTab(tab: "current" | "history") {
    this.activeTab.set(tab);
  }

  statusClasses(status: LoanWithRelations["status"]) {
    switch (status) {
      case "OVERDUE":
        return "bg-destructive/10 text-destructive border border-destructive/30";
      case "RETURNED":
        return "bg-secondary text-secondary-foreground border border-border";
      default:
        return "bg-primary/10 text-primary border border-primary/30";
    }
  }

  statusLabel(status: LoanWithRelations["status"]) {
    if (status === "OVERDUE") {
      return "Overdue";
    }
    if (status === "RETURNED") {
      return "Returned";
    }
    return "Active";
  }

  // ========== CHANGE PASSWORD ==========

  openChangePassword() {
    this.passwordForm.reset();
    this.showChangePassword.set(true);
  }

  closeChangePassword() {
    this.showChangePassword.set(false);
    this.passwordForm.reset();
  }

  toggleCurrentPasswordVisibility() {
    this.showCurrentPassword.update((v) => !v);
  }

  toggleNewPasswordVisibility() {
    this.showNewPassword.update((v) => !v);
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword.update((v) => !v);
  }

  async submitChangePassword() {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const { currentPassword, newPassword, confirmPassword } = this.passwordForm.value;

    if (newPassword !== confirmPassword) {
      this.toast.show({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive",
      });
      return;
    }

    this.isChangingPassword.set(true);
    try {
      await this.api.changePassword(currentPassword!, newPassword!);
      this.toast.show({
        title: "Success",
        description: "Your password has been changed successfully",
      });
      this.closeChangePassword();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to change password";
      this.toast.show({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      this.isChangingPassword.set(false);
    }
  }
}
