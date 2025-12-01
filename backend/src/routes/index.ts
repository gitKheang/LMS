import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as authController from '../controllers/auth.controller';
import * as booksController from '../controllers/books.controller';
import * as loansController from '../controllers/loans.controller';
import * as usersController from '../controllers/users.controller';

const router = Router();

// ========== AUTH ROUTES ==========
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.get('/auth/me', authenticate, authController.getCurrentUser);

// ========== BOOKS ROUTES ==========
router.get('/books/categories', booksController.getCategories);
router.get('/books', booksController.getBooks);
router.get('/books/available-for-loans', authenticate, booksController.getAvailableBooksForLoans);
router.get('/books/:id', booksController.getBookById);

// Admin book routes
router.get('/admin/books', authenticate, requireRole('ADMIN', 'STAFF'), booksController.getAdminBooks);
router.post('/admin/books', authenticate, requireRole('ADMIN', 'STAFF'), booksController.createBook);
router.put('/admin/books/:id', authenticate, requireRole('ADMIN', 'STAFF'), booksController.updateBook);
router.delete('/admin/books/:id', authenticate, requireRole('ADMIN', 'STAFF'), booksController.deleteBook);

// ========== LOANS ROUTES ==========
router.get('/loans/user/:userId', authenticate, loansController.getLoansForUser);
router.get('/admin/loans', authenticate, requireRole('ADMIN', 'STAFF'), loansController.getAdminLoans);
router.post('/admin/loans', authenticate, requireRole('ADMIN', 'STAFF'), loansController.createLoan);
router.post('/admin/loans/:id/return', authenticate, requireRole('ADMIN', 'STAFF'), loansController.returnLoan);
router.post('/admin/loans/:id/remind', authenticate, requireRole('ADMIN', 'STAFF'), loansController.sendOverdueReminder);
router.get('/admin/dashboard', authenticate, requireRole('ADMIN', 'STAFF'), loansController.getDashboardStats);

// ========== USERS ROUTES ==========
router.get('/admin/users', authenticate, requireRole('ADMIN', 'STAFF'), usersController.getAdminUsers);
router.post('/admin/users/staff', authenticate, requireRole('ADMIN'), usersController.createStaffMember);
router.delete('/admin/users/:id', authenticate, requireRole('ADMIN', 'STAFF'), usersController.deleteUser);
router.post('/users/request-password-reset', usersController.requestPasswordReset);
router.post('/admin/users/:id/reset-password', authenticate, requireRole('ADMIN', 'STAFF'), usersController.resetUserPassword);

export default router;
