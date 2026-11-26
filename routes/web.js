import express from 'express';
import DashboardController from '../controllers/DashboardController.js';
import AuthController from '../controllers/AuthController.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';

const router = express.Router();

router.get('/login', AuthController.loginPage);
router.post('/login', AuthController.login);
router.get('/verify-otp', AuthController.otpPage);
router.post('/verify-otp', AuthController.verifyOtp);
router.post('/setup', AuthController.setup);
router.post('/logout', AuthController.logout);

router.use(requireAuth);
router.get('/', requirePermission('dashboard', 'GET'), DashboardController.index);
router.get('/dashboard', requirePermission('dashboard', 'GET'), DashboardController.index);
router.get('/users', requirePermission('users', 'GET'), AuthController.usersPage);
router.post('/users', requirePermission('users', 'POST'), AuthController.createUser);
router.get('/settings', requirePermission('settings', 'GET'), AuthController.settingsPage);
router.post('/settings', requirePermission('settings', 'UPDATE'), AuthController.saveSettings);

export default router;
