const express = require('express');
const router = express.Router();
const teamAuth = require('../middleware/teamAuth');
const { loginLimiter } = require('../middleware/rateLimiter');
const { body } = require('express-validator');
const validateRequest = require('../middleware/validateRequest');
const { submissionUpload } = require('../config/multer');

// Auth
const authCtrl = require('../controllers/team/authController');
router.post('/auth/login', loginLimiter, [body('teamId').notEmpty(), body('password').notEmpty()], validateRequest, authCtrl.login);
router.post('/auth/change-password', teamAuth, [body('currentPassword').notEmpty(), body('newPassword').isLength({ min: 8 })], validateRequest, authCtrl.changePassword);
router.post('/auth/forgot-password', [body('teamId').notEmpty(), body('email').isEmail()], validateRequest, authCtrl.forgotPassword);

// Profile
const profileCtrl = require('../controllers/team/profileController');
router.get('/profile', teamAuth, profileCtrl.getProfile);
router.get('/members', teamAuth, profileCtrl.getMembers);

// Member Management (self-service)
const memberCtrl = require('../controllers/team/memberController');
router.post('/members/invite', teamAuth, [body('name').notEmpty().withMessage('Name is required'), body('email').isEmail().withMessage('Valid email is required'), body('usn').notEmpty().withMessage('USN is required')], validateRequest, memberCtrl.inviteMember);
router.get('/members/invites', teamAuth, memberCtrl.getPendingInvites);
router.delete('/members/invites/:inviteId', teamAuth, memberCtrl.cancelInvite);
router.put('/members/:memberId', teamAuth, memberCtrl.updateMember);
router.delete('/members/:memberId', teamAuth, memberCtrl.removeMember);

// Questions
const questionCtrl = require('../controllers/team/questionController');
router.get('/questions', teamAuth, questionCtrl.getQuestions);
router.get('/questions/status', teamAuth, questionCtrl.getAnswerStatus);
router.post('/questions/answer', teamAuth, [body('questionId').notEmpty()], validateRequest, questionCtrl.saveAnswer);
router.post('/questions/submit', teamAuth, questionCtrl.submitAll);
router.get('/questions/results', teamAuth, questionCtrl.getResults);

// Problem Statement Selection
const ProblemStatement = require('../models/ProblemStatement');
const Team = require('../models/Team');

router.get('/problems', teamAuth, async (req, res, next) => {
  try {
    const problems = await ProblemStatement.find({ isActive: true }).populate('selectedBy', 'teamId teamName').sort({ category: 1, difficulty: 1 }).lean();
    const team = await Team.findById(req.team._id).select('selectedProblem selectionChangesLeft').lean();
    successResponse(res, 200, 'Problems fetched', { problems, selectedProblem: team?.selectedProblem, changesLeft: team?.selectionChangesLeft ?? 3 });
  } catch (error) { next(error); }
});

router.post('/problems/select', teamAuth, async (req, res, next) => {
  try {
    const { problemId } = req.body;
    if (!problemId) return res.status(400).json({ success: false, message: 'Problem ID is required' });

    const config = await HackathonConfig.findOne().lean();
    if (config && config.isProblemSelectionOpen === false) {
      return res.status(403).json({ success: false, message: 'Problem selection is currently locked by the organizers.' });
    }

    const team = await Team.findById(req.team._id);
    if (team.selectionChangesLeft <= 0) return res.status(403).json({ success: false, message: 'No selection changes left. You have used all 3 changes.' });

    const problem = await ProblemStatement.findById(problemId);
    if (!problem || !problem.isActive) return res.status(404).json({ success: false, message: 'Problem not found' });

    // Check max teams limit
    if (problem.maxTeams > 0 && problem.selectedBy.length >= problem.maxTeams) {
      const alreadySelected = problem.selectedBy.some(id => id.toString() === team._id.toString());
      if (!alreadySelected) return res.status(400).json({ success: false, message: `This problem has reached the maximum team limit (${problem.maxTeams})` });
    }

    // Remove from previous problem
    if (team.selectedProblem) {
      await ProblemStatement.findByIdAndUpdate(team.selectedProblem, { $pull: { selectedBy: team._id } });
    }

    // Add to new problem
    await ProblemStatement.findByIdAndUpdate(problemId, { $addToSet: { selectedBy: team._id } });

    // Update team
    team.selectedProblem = problemId;
    team.selectionChangesLeft -= 1;
    await team.save();

    successResponse(res, 200, `Problem selected! ${team.selectionChangesLeft} change(s) remaining`, { selectedProblem: problemId, changesLeft: team.selectionChangesLeft });
  } catch (error) { next(error); }
});

// Submission
const submissionCtrl = require('../controllers/team/submissionController');
router.post('/submission', teamAuth, submissionUpload.single('file'), submissionCtrl.submit);
router.get('/submission', teamAuth, submissionCtrl.getSubmission);
router.put('/submission', teamAuth, submissionUpload.single('file'), submissionCtrl.resubmit);

// Announcements
const Announcement = require('../models/Announcement');
const { successResponse } = require('../utils/apiResponse');
router.get('/announcements', teamAuth, async (req, res, next) => {
  try {
    const announcements = await Announcement.find({ isPublished: true }).sort({ isPinned: -1, createdAt: -1 }).lean();
    successResponse(res, 200, 'Announcements', { announcements });
  } catch (error) { next(error); }
});

// Leaderboard
const Result = require('../models/Result');
const HackathonConfig = require('../models/HackathonConfig');
router.get('/leaderboard', teamAuth, async (req, res, next) => {
  try {
    const config = await HackathonConfig.findOne().lean();
    if (!config?.isLeaderboardPublic) return res.status(403).json({ success: false, message: 'Leaderboard not published' });
    const results = await Result.find({ isPublished: true }).populate('teamId', 'teamId teamName teamLead.college').sort({ rank: 1 }).lean();
    successResponse(res, 200, 'Leaderboard', { results, myTeamId: req.team._id });
  } catch (error) { next(error); }
});

// Certificate
router.get('/certificate', teamAuth, async (req, res, next) => {
  try {
    const result = await Result.findOne({ teamId: req.team._id }).lean();
    if (!result?.certificateUrl) return res.status(404).json({ success: false, message: 'Certificate not available yet' });
    successResponse(res, 200, 'Certificate', { url: result.certificateUrl });
  } catch (error) { next(error); }
});

// ============ WALLET (Digital Coupons) ============
const mealCtrl = require('../controllers/admin/mealPassController');
router.get('/wallet', teamAuth, mealCtrl.getTeamWallet);
router.post('/wallet/tap-redeem', teamAuth, mealCtrl.tapRedeem);

// ============ HELP DESK ============
const helpCtrl = require('../controllers/admin/helpRequestController');
router.post('/help/request', teamAuth, [body('category').notEmpty(), body('description').notEmpty()], validateRequest, helpCtrl.createRequest);
router.get('/help/my-requests', teamAuth, helpCtrl.getMyRequests);

// ============ CHALLENGES ============
const challengeCtrl = require('../controllers/admin/challengeController');
router.get('/challenges', teamAuth, challengeCtrl.getActiveChallenges);
router.post('/challenges/submit', teamAuth, [body('challengeId').notEmpty(), body('proof').notEmpty()], validateRequest, challengeCtrl.submitProof);
router.get('/badges', teamAuth, challengeCtrl.getMyBadges);

// ============ VENUE MAP (public for teams) ============
const tableCtrl = require('../controllers/admin/tableController');
router.get('/venue-map', teamAuth, tableCtrl.getVenueMap);

module.exports = router;

