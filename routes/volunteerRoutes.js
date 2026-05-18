const express = require('express');
const router = express.Router();
const { staffAuth } = require('../middleware/adminAuth');
const { loginLimiter } = require('../middleware/rateLimiter');
const { body } = require('express-validator');
const validateRequest = require('../middleware/validateRequest');

// Volunteer auth: any staff can access these
const volunteerAuth = staffAuth(['volunteer', 'mentor', 'admin', 'superadmin']);

// Auth
const staffCtrl = require('../controllers/admin/staffController');
router.post('/auth/login', loginLimiter, [body('staffId').notEmpty(), body('password').notEmpty(), body('role').notEmpty()], validateRequest, staffCtrl.staffLogin);
router.get('/auth/me', volunteerAuth, staffCtrl.getMe);

// Meal Pass Redemption (Scanner)
const mealCtrl = require('../controllers/admin/mealPassController');
router.post('/redeem/qr', volunteerAuth, mealCtrl.redeemByQR);
router.post('/redeem/manual', volunteerAuth, [body('teamId').notEmpty(), body('passId').notEmpty()], validateRequest, mealCtrl.redeemByTeamId);
router.get('/meal-passes', volunteerAuth, mealCtrl.listPasses);

// Help Queue
const helpCtrl = require('../controllers/admin/helpRequestController');
router.get('/help-requests', volunteerAuth, helpCtrl.listRequests);
router.put('/help-requests/:id/claim', volunteerAuth, helpCtrl.claimRequest);
router.put('/help-requests/:id/resolve', volunteerAuth, helpCtrl.resolveRequest);
router.get('/help-requests/my-claimed', volunteerAuth, helpCtrl.getMyClaimedRequests);

module.exports = router;
