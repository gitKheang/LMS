import { Routes } from '@angular/router';
import { HomeComponent } from '@app/pages/home/home.component';
import { LoginComponent } from '@app/pages/auth/login/login.component';
import { RegisterComponent } from '@app/pages/auth/register/register.component';
import { CatalogComponent } from '@app/pages/catalog/catalog.component';
import { BookDetailsComponent } from '@app/pages/book-details/book-details.component';
import { MyAccountComponent } from '@app/pages/my-account/my-account.component';
import { AdminDashboardComponent } from '@app/pages/admin/dashboard/admin-dashboard.component';
import { AdminBooksComponent } from '@app/pages/admin/books/admin-books.component';
import { AdminLoansComponent } from '@app/pages/admin/loans/admin-loans.component';
import { AdminUsersComponent } from '@app/pages/admin/users/admin-users.component';
import { NotFoundComponent } from '@app/pages/not-found/not-found.component';
import { authGuard } from '@core/guards/auth.guard';
import { adminGuard } from '@core/guards/admin.guard';
import { managementGuard } from '@core/guards/management.guard';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'catalog', component: CatalogComponent },
  { path: 'books/:id', component: BookDetailsComponent },
  { path: 'my-account', component: MyAccountComponent, canActivate: [authGuard] },
{ path: 'admin', component: AdminDashboardComponent, canActivate: [managementGuard] },
{ path: 'admin/books', component: AdminBooksComponent, canActivate: [managementGuard] },
{ path: 'admin/loans', component: AdminLoansComponent, canActivate: [managementGuard] },
  { path: 'admin/users', component: AdminUsersComponent, canActivate: [managementGuard] },
  { path: '**', component: NotFoundComponent },
];
