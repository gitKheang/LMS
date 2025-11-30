import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginComponent } from './login.component';
import { AuthService } from '@core/services/auth.service';
import { ToastService } from '@core/services/toast.service';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';

class AuthServiceMock {
  login = jasmine.createSpy('login').and.resolveTo(undefined);
  isAdmin = jasmine.createSpy('isAdmin').and.returnValue(false);
  isStaff = jasmine.createSpy('isStaff').and.returnValue(false);
  hasManagementAccess = jasmine.createSpy('hasManagementAccess').and.returnValue(false);
  isAuthenticated = jasmine.createSpy('isAuthenticated').and.returnValue(true);
}

class ToastServiceMock {
  show = jasmine.createSpy('show');
}

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  let auth: AuthServiceMock;
  let routerNavigateSpy: jasmine.Spy;

  const createActivatedRoute = (returnUrl?: string) =>
    ({
      snapshot: {
        queryParamMap: convertToParamMap(returnUrl ? { returnUrl } : {}),
      },
    }) as ActivatedRoute;

  async function setup(returnUrl?: string) {
    await TestBed.configureTestingModule({
      imports: [LoginComponent, RouterTestingModule],
      providers: [
        { provide: AuthService, useClass: AuthServiceMock },
        { provide: ToastService, useClass: ToastServiceMock },
        { provide: ActivatedRoute, useValue: createActivatedRoute(returnUrl) },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    auth = TestBed.inject(AuthService) as unknown as AuthServiceMock;
    const router = TestBed.inject(Router);
    routerNavigateSpy = spyOn(router, 'navigateByUrl').and.resolveTo(true);
    fixture.detectChanges();
  }

  async function fillAndSubmitForm() {
    component.form.setValue({
      email: 'user@example.com',
      password: 'password',
    });
    await component.submit();
  }

  it('falls back to staff dashboard when staff user cannot access admin-only route', async () => {
    await setup('/admin/books');
    auth.isStaff.and.returnValue(true);
    auth.hasManagementAccess.and.returnValue(true);

    await fillAndSubmitForm();

    expect(routerNavigateSpy).toHaveBeenCalledWith('/admin/users');
  });

  it('allows admin to return to admin-only route after login', async () => {
    await setup('/admin/books');
    auth.isAdmin.and.returnValue(true);
    auth.hasManagementAccess.and.returnValue(true);

    await fillAndSubmitForm();

    expect(routerNavigateSpy).toHaveBeenCalledWith('/admin/books');
  });
});
