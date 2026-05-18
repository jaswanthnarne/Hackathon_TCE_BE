const express = require('express');
const router = express.Router();
const { staffAuth } = require('../middleware/adminAuth');
const { loginLimiter } = require('../middleware/rateLimiter');
const { body } = require('express-validator');
const validateRequest = require('../middleware/validateRequest');

// Judge + admin can access
const judgeAuth = staffAuth(['judge', 'admin', 'superadmin']);

// Auth (reuses staff login)
const staffCtrl = require('../controllers/admin/staffController');
router.post('/auth/login', loginLimiter, [body('staffId').notEmpty(), body('password').notEmpty(), body('role').notEmpty()], validateRequest, staffCtrl.staffLogin);
router.get('/auth/me', judgeAuth, staffCtrl.getMe);

// Judging
const judgeCtrl = require('../controllers/admin/judgeController');
router.get('/teams', judgeAuth, judgeCtrl.getAssignedTeams);
router.post('/score', judgeAuth, [body('teamId').notEmpty(), body('scores').notEmpty()], validateRequest, judgeCtrl.submitScore);
router.get('/scoreboard', judgeAuth, judgeCtrl.getScoreboard);

// Venue map (for finding teams)
const tableCtrl = require('../controllers/admin/tableController');
router.get('/venue-map', judgeAuth, tableCtrl.getVenueMap);

module.exports = router;
