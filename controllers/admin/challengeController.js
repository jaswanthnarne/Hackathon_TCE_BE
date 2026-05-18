const Challenge = require('../../models/Challenge');
const Team = require('../../models/Team');
const { successResponse, errorResponse } = require('../../utils/apiResponse');

// === ADMIN: Challenge CRUD ===

exports.createChallenge = async (req, res, next) => {
  try {
    const { title, description, deadline, reward } = req.body;
    const challenge = await Challenge.create({
      title, description, deadline: deadline || null,
      reward: reward || { type: 'badge', name: 'Challenge Winner' },
      createdBy: req.admin._id,
    });
    successResponse(res, 201, 'Challenge created', { challenge });
  } catch (error) { next(error); }
};

exports.listChallenges = async (req, res, next) => {
  try {
    const challenges = await Challenge.find().sort({ createdAt: -1 }).lean();
    successResponse(res, 200, 'Challenges', { challenges });
  } catch (error) { next(error); }
};

exports.updateChallenge = async (req, res, next) => {
  try {
    const challenge = await Challenge.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!challenge) return errorResponse(res, 404, 'Challenge not found');
    successResponse(res, 200, 'Challenge updated', { challenge });
  } catch (error) { next(error); }
};

exports.deleteChallenge = async (req, res, next) => {
  try {
    await Challenge.findByIdAndDelete(req.params.id);
    successResponse(res, 200, 'Challenge deleted');
  } catch (error) { next(error); }
};

// Admin: mark winner
exports.markWinner = async (req, res, next) => {
  try {
    const { challengeId, teamObjectId } = req.body;
    const challenge = await Challenge.findById(challengeId);
    if (!challenge) return errorResponse(res, 404, 'Challenge not found');

    const sub = challenge.submissions.find(s => s.team.toString() === teamObjectId);
    if (!sub) return errorResponse(res, 404, 'Submission not found');

    sub.isWinner = true;
    await challenge.save();

    // Award badge to team
    const team = await Team.findById(teamObjectId);
    if (team) {
      team.badges.push({
        name: challenge.reward?.name || challenge.title + ' Winner',
        challengeId: challenge._id,
      });
      await team.save();
    }

    successResponse(res, 200, 'Winner marked and badge awarded', { challenge });
  } catch (error) { next(error); }
};

// === TEAM: View & submit challenges ===

exports.getActiveChallenges = async (req, res, next) => {
  try {
    const challenges = await Challenge.find({ isActive: true }).sort({ createdAt: -1 }).lean();
    // Mark which ones this team has submitted to
    const teamId = req.team._id.toString();
    const result = challenges.map(c => ({
      ...c,
      hasSubmitted: c.submissions.some(s => s.team.toString() === teamId),
      mySubmission: c.submissions.find(s => s.team.toString() === teamId) || null,
    }));
    successResponse(res, 200, 'Active challenges', { challenges: result });
  } catch (error) { next(error); }
};

exports.submitProof = async (req, res, next) => {
  try {
    const { challengeId, proof } = req.body;
    if (!challengeId || !proof) return errorResponse(res, 400, 'Challenge ID and proof are required');

    const challenge = await Challenge.findById(challengeId);
    if (!challenge) return errorResponse(res, 404, 'Challenge not found');
    if (!challenge.isActive) return errorResponse(res, 400, 'Challenge is no longer active');

    // Check deadline
    if (challenge.deadline && new Date() > challenge.deadline) {
      return errorResponse(res, 400, 'Challenge deadline has passed');
    }

    // Check if already submitted
    const existing = challenge.submissions.find(s => s.team.toString() === req.team._id.toString());
    if (existing) return errorResponse(res, 400, 'You have already submitted to this challenge');

    challenge.submissions.push({
      team: req.team._id,
      teamId: req.team.teamId,
      teamName: req.team.teamName,
      proof,
    });
    await challenge.save();

    successResponse(res, 200, 'Proof submitted!', { challenge });
  } catch (error) { next(error); }
};

exports.getMyBadges = async (req, res, next) => {
  try {
    const team = await Team.findById(req.team._id).select('badges').lean();
    successResponse(res, 200, 'Your badges', { badges: team?.badges || [] });
  } catch (error) { next(error); }
};
