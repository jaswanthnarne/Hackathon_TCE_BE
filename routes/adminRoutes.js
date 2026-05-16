const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const { loginLimiter } = require('../middleware/rateLimiter');
const { body } = require('express-validator');
const validateRequest = require('../middleware/validateRequest');
const { imageUpload, excelUpload } = require('../config/multer');

// Auth
const authCtrl = require('../controllers/admin/authController');
router.post('/auth/login', loginLimiter, [body('email').isEmail(), body('password').notEmpty()], validateRequest, authCtrl.login);
router.post('/auth/logout', adminAuth, authCtrl.logout);
router.post('/auth/forgot-password', [body('email').isEmail()], validateRequest, authCtrl.forgotPassword);
router.post('/auth/reset-password/:token', [body('password').isLength({ min: 6 })], validateRequest, authCtrl.resetPassword);
router.get('/auth/me', adminAuth, authCtrl.getMe);

// Teams
const teamCtrl = require('../controllers/admin/teamController');
router.get('/teams', adminAuth, teamCtrl.listTeams);
router.post('/teams', adminAuth, [body('teamName').notEmpty(), body('teamLead.name').notEmpty(), body('teamLead.email').isEmail()], validateRequest, teamCtrl.createTeam);
router.get('/teams/export', adminAuth, teamCtrl.exportTeams);
router.get('/teams/:id', adminAuth, teamCtrl.getTeam);
router.put('/teams/:id', adminAuth, teamCtrl.updateTeam);
router.delete('/teams/:id', adminAuth, teamCtrl.deleteTeam);
router.delete('/teams/bulk', adminAuth, teamCtrl.bulkDeleteTeams);
router.post('/teams/bulk-import-json', adminAuth, teamCtrl.bulkImportTeamsJson);
router.put('/teams/:id/status', adminAuth, [body('status').isIn(['pending', 'approved', 'rejected', 'locked'])], validateRequest, teamCtrl.changeStatus);
router.put('/teams/:id/reset-password', adminAuth, teamCtrl.resetPassword);
router.put('/teams/:id/force-password-change', adminAuth, teamCtrl.forcePasswordChange);

// Members
const memberCtrl = require('../controllers/admin/memberController');
router.post('/teams/:id/members', adminAuth, [body('name').notEmpty(), body('email').isEmail()], validateRequest, memberCtrl.addMember);
router.put('/teams/:id/members/:memberId', adminAuth, memberCtrl.editMember);
router.delete('/teams/:id/members/:memberId', adminAuth, memberCtrl.removeMember);
router.put('/teams/:id/change-lead', adminAuth, [body('newLeadMemberId').notEmpty()], validateRequest, memberCtrl.changeLead);

// Password Requests
const pwCtrl = require('../controllers/admin/passwordRequestController');
router.get('/password-requests', adminAuth, pwCtrl.listRequests);
router.put('/password-requests/:id/approve', adminAuth, pwCtrl.approveRequest);
router.put('/password-requests/:id/deny', adminAuth, pwCtrl.denyRequest);

// Questions
const questionCtrl = require('../controllers/admin/questionController');
router.get('/questions', adminAuth, questionCtrl.listQuestions);
router.post('/questions', adminAuth, [body('questionText').notEmpty(), body('questionType').notEmpty(), body('marks').isNumeric()], validateRequest, questionCtrl.createQuestion);
router.get('/questions/export', adminAuth, questionCtrl.exportQuestions);
router.get('/questions/:id', adminAuth, questionCtrl.getQuestion);
router.put('/questions/:id', adminAuth, questionCtrl.updateQuestion);
router.delete('/questions/:id', adminAuth, questionCtrl.deleteQuestion);
router.post('/questions/:id/duplicate', adminAuth, questionCtrl.duplicateQuestion);
router.post('/questions/bulk-import', adminAuth, excelUpload.single('file'), questionCtrl.bulkImport);

// Problem Statements (Hackathon Challenges)
const problemCtrl = require('../controllers/admin/problemController');
router.get('/problems', adminAuth, problemCtrl.list);
router.post('/problems', adminAuth, [body('title').notEmpty(), body('description').notEmpty()], validateRequest, problemCtrl.create);
router.get('/problems/:id', adminAuth, problemCtrl.get);
router.put('/problems/:id', adminAuth, problemCtrl.update);
router.delete('/problems/:id', adminAuth, problemCtrl.remove);

// Overrides
const overrideCtrl = require('../controllers/admin/overrideController');
router.post('/overrides/answer', adminAuth, overrideCtrl.overrideAnswer);
router.post('/overrides/score', adminAuth, overrideCtrl.overrideScore);
router.post('/overrides/submission', adminAuth, overrideCtrl.overrideSubmission);
router.post('/overrides/time-extension', adminAuth, overrideCtrl.timeExtension);
router.post('/overrides/reset-answers', adminAuth, overrideCtrl.resetAnswers);

// Submissions
const subCtrl = require('../controllers/admin/submissionController');
router.get('/submissions', adminAuth, subCtrl.listSubmissions);
router.get('/submissions/:teamId', adminAuth, subCtrl.getSubmission);
router.put('/submissions/:id/evaluate', adminAuth, subCtrl.evaluateSubmission);

// Results
const resultCtrl = require('../controllers/admin/resultController');
router.get('/results', adminAuth, resultCtrl.listResults);
router.post('/results/calculate', adminAuth, resultCtrl.calculateResults);
router.post('/results/publish', adminAuth, resultCtrl.publishResults);
router.post('/results/unpublish', adminAuth, resultCtrl.unpublishResults);
router.get('/results/export', adminAuth, resultCtrl.exportResults);
router.put('/results/:teamId', adminAuth, resultCtrl.editResult);

// Certificates
const certCtrl = require('../controllers/admin/certificateController');
router.post('/certificates/generate/all', adminAuth, certCtrl.generateAllCerts);
router.post('/certificates/generate/winners', adminAuth, certCtrl.generateWinnerCerts);
router.post('/certificates/email/all', adminAuth, certCtrl.emailAllCerts);
router.get('/certificates/download/:teamId', adminAuth, certCtrl.downloadCert);
router.get('/certificates/download/bulk', adminAuth, certCtrl.downloadBulkCerts);

// Announcements
const annCtrl = require('../controllers/admin/announcementController');
router.get('/announcements', adminAuth, annCtrl.list);
router.post('/announcements', adminAuth, [body('title').notEmpty(), body('message').notEmpty()], validateRequest, annCtrl.create);
router.put('/announcements/:id', adminAuth, annCtrl.update);
router.delete('/announcements/:id', adminAuth, annCtrl.remove);
router.put('/announcements/:id/pin', adminAuth, annCtrl.togglePin);

// Email
const emailCtrl = require('../controllers/admin/emailController');
router.post('/email/send', adminAuth, [body('subject').notEmpty(), body('body').notEmpty()], validateRequest, emailCtrl.sendBulkEmail);
router.get('/email/logs', adminAuth, emailCtrl.getEmailLogs);

// Config
const configCtrl = require('../controllers/admin/configController');
router.get('/config', adminAuth, configCtrl.getConfig);
router.put('/config', adminAuth, configCtrl.updateConfig);
router.post('/config/logo', adminAuth, imageUpload.single('logo'), configCtrl.uploadLogo);
router.post('/config/banner', adminAuth, imageUpload.single('banner'), configCtrl.uploadBanner);

// Analytics
const analyticsCtrl = require('../controllers/admin/analyticsController');
router.get('/analytics/dashboard', adminAuth, analyticsCtrl.dashboard);
router.get('/analytics/registration-trend', adminAuth, analyticsCtrl.registrationTrend);
router.get('/analytics/college-wise', adminAuth, analyticsCtrl.collegeWise);
router.get('/analytics/score-distribution', adminAuth, analyticsCtrl.scoreDistribution);
router.get('/analytics/question-analysis', adminAuth, analyticsCtrl.questionAnalysis);

// Reports
const reportCtrl = require('../controllers/admin/reportsController');
router.get('/reports/teams', adminAuth, reportCtrl.teamsReport);
router.get('/reports/participants', adminAuth, reportCtrl.participantsReport);
router.get('/reports/scores', adminAuth, reportCtrl.scoresReport);
router.get('/reports/submissions', adminAuth, reportCtrl.submissionsReport);
router.get('/reports/college-wise', adminAuth, reportCtrl.collegeReport);

// Audit
const auditCtrl = require('../controllers/admin/auditController');
router.get('/audit', adminAuth, auditCtrl.getLogs);

module.exports = router;
