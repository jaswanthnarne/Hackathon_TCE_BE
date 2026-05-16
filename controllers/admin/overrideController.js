const TeamAnswer = require('../../models/TeamAnswer');
const Team = require('../../models/Team');
const Submission = require('../../models/Submission');
const { successResponse, errorResponse } = require('../../utils/apiResponse');
const { auditLog } = require('../../middleware/auditLogger');

exports.overrideAnswer = async (req, res, next) => {
  try {
    const { teamId, questionId, newAnswer, reason } = req.body;
    let answer = await TeamAnswer.findOne({ teamId, questionId });
    const oldValue = answer ? answer.toObject() : null;

    if (!answer) {
      answer = await TeamAnswer.create({ teamId, questionId, answer: newAnswer, isOverridden: true, overriddenBy: req.admin._id, overrideReason: reason, overriddenAt: new Date() });
    } else {
      answer.answer = newAnswer;
      answer.isOverridden = true;
      answer.overriddenBy = req.admin._id;
      answer.overrideReason = reason;
      answer.overriddenAt = new Date();
      await answer.save();
    }

    await auditLog(req.admin._id, 'OVERRIDE_ANSWER', {
      targetId: answer._id, targetModel: 'TeamAnswer',
      description: `Overrode answer for team ${teamId}, question ${questionId}`,
      oldValue, newValue: { answer: newAnswer }, reason,
      ipAddress: req.ip, userAgent: req.headers['user-agent'],
    });
    successResponse(res, 200, 'Answer overridden', { answer });
  } catch (error) { next(error); }
};

exports.overrideScore = async (req, res, next) => {
  try {
    const { teamId, newScore, reason } = req.body;
    const Result = require('../../models/Result');
    let result = await Result.findOne({ teamId });
    const oldScore = result?.totalScore;

    if (!result) {
      result = await Result.create({ teamId, totalScore: newScore, calculatedBy: req.admin._id });
    } else {
      result.totalScore = newScore;
      await result.save();
    }

    await auditLog(req.admin._id, 'OVERRIDE_SCORE', {
      targetId: result._id, targetModel: 'Result',
      description: `Overrode score for team ${teamId}: ${oldScore} → ${newScore}`,
      oldValue: { totalScore: oldScore }, newValue: { totalScore: newScore }, reason,
      ipAddress: req.ip, userAgent: req.headers['user-agent'],
    });
    successResponse(res, 200, 'Score overridden', { result });
  } catch (error) { next(error); }
};

exports.overrideSubmission = async (req, res, next) => {
  try {
    const { teamId, ...updates } = req.body;
    const submission = await Submission.findOne({ teamId });
    if (!submission) return errorResponse(res, 404, 'Submission not found');
    const oldValue = submission.toObject();
    Object.assign(submission, updates, { isOverridden: true, overriddenBy: req.admin._id });
    await submission.save();

    await auditLog(req.admin._id, 'OVERRIDE_SUBMISSION', {
      targetId: submission._id, targetModel: 'Submission',
      description: `Overrode submission for team ${teamId}`,
      oldValue, newValue: updates,
      ipAddress: req.ip, userAgent: req.headers['user-agent'],
    });
    successResponse(res, 200, 'Submission overridden', { submission });
  } catch (error) { next(error); }
};

exports.timeExtension = async (req, res, next) => {
  try {
    const { teamId, extraMinutes, reason } = req.body;
    const team = await Team.findById(teamId);
    if (!team) return errorResponse(res, 404, 'Team not found');
    team.timeExtension = { extraMinutes, grantedAt: new Date(), grantedBy: req.admin._id, reason };
    await team.save();

    await auditLog(req.admin._id, 'TIME_EXTENSION', {
      targetId: team._id, targetModel: 'Team',
      description: `Extended time by ${extraMinutes} minutes for team ${team.teamId}`,
      newValue: { extraMinutes }, reason,
      ipAddress: req.ip, userAgent: req.headers['user-agent'],
    });
    successResponse(res, 200, `Time extended by ${extraMinutes} minutes`);
  } catch (error) { next(error); }
};

exports.resetAnswers = async (req, res, next) => {
  try {
    const { teamId } = req.body;
    const deleted = await TeamAnswer.deleteMany({ teamId });

    await auditLog(req.admin._id, 'RESET_ANSWERS', {
      targetId: teamId, targetModel: 'Team',
      description: `Reset all answers for team ${teamId}. Deleted ${deleted.deletedCount} answers.`,
      ipAddress: req.ip, userAgent: req.headers['user-agent'],
    });
    successResponse(res, 200, `${deleted.deletedCount} answers reset`);
  } catch (error) { next(error); }
};
