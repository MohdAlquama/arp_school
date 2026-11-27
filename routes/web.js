import express from 'express';
import DashboardController from '../controllers/DashboardController.js';
import AuthController from '../controllers/AuthController.js';
import CashfreeController from '../controllers/CashfreeController.js';
import CategoryController from '../controllers/CategoryController.js';
import StudentController from '../controllers/StudentController.js';
import Student from '../models/Student.js';
import StudentPaymentController from '../controllers/StudentPaymentController.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';

const router = express.Router();

router.get('/login', AuthController.loginPage);
router.post('/login', AuthController.login);
router.get('/verify-otp', AuthController.otpPage);
router.post('/verify-otp', AuthController.verifyOtp);
router.post('/setup', AuthController.setup);
router.post('/logout', AuthController.logout);
router.post('/cashfree/webhook', StudentPaymentController.cashfreeWebhook);
router.post('/api/v1/course-payments/webhook', StudentPaymentController.cashfreeWebhook);

router.use(requireAuth);
router.get('/', requirePermission('dashboard', 'GET'), DashboardController.index);
router.get('/dashboard', requirePermission('dashboard', 'GET'), DashboardController.index);
router.get('/users', requirePermission('users', 'GET'), AuthController.usersPage);
router.post('/users', requirePermission('users', 'POST'), AuthController.createUser);
router.get('/settings', requirePermission('settings', 'GET'), AuthController.settingsPage);
router.post('/settings', requirePermission('settings', 'UPDATE'), AuthController.saveSettings);
router.get('/cashfree', requirePermission('payments', 'GET'), CashfreeController.settingsPage);
router.post('/cashfree', requirePermission('payments', 'UPDATE'), CashfreeController.saveCredentials);
router.post('/cashfree/test', requirePermission('payments', 'UPDATE'), CashfreeController.testConnection);
router.get('/students', requirePermission('students', 'GET'), StudentController.index);
router.get('/students/new', requirePermission('students', 'GET'), StudentController.createPage);
router.post('/students', requirePermission('students', 'POST'), StudentController.create);
router.get('/students/:id', requirePermission('students', 'GET'), StudentPaymentController.detail);
router.post('/students/:id/installments', requirePermission('students', 'POST'), StudentPaymentController.addInstallment);
router.post('/students/installments/:installmentId/cash', requirePermission('students', 'POST'), StudentPaymentController.recordCash);
router.post('/students/installments/:installmentId/cashfree', requirePermission('students', 'POST'), StudentPaymentController.createCashfreeLink);
router.get('/students/categories/:categoryId/subcategories', requirePermission('students', 'GET'), async (req, res) => {
    const categoryId = Number(req.params.categoryId);
    if (!Number.isSafeInteger(categoryId) || categoryId < 1) return res.status(400).json({ error: 'Invalid category.' });
    return res.json(await Student.subcategoriesForCategory(categoryId));
});
router.get('/students/:id/image', requirePermission('students', 'GET'), StudentController.image);
router.get('/students/:id/edit', requirePermission('students', 'GET'), StudentController.editPage);
router.post('/students/:id', requirePermission('students', 'UPDATE'), StudentController.update);
router.post('/students/:id/delete', requirePermission('students', 'DELETE'), StudentController.delete);
router.get('/categories', requirePermission('categories', 'GET'), CategoryController.index);
router.post('/categories', requirePermission('categories', 'POST'), CategoryController.createCategory);
router.post('/categories/subcategories', requirePermission('categories', 'POST'), CategoryController.createSubcategory);

export default router;
