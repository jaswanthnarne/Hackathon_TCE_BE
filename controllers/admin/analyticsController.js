const Team = require('../../models/Team');
const Submission = require('../../models/Submission');
const Question = require('../../models/Question');
const TeamAnswer = require('../../models/TeamAnswer');
const EmailLog = require('../../models/EmailLog');
const AdminActionLog = require('../../models/AdminActionLog');
const { successResponse } = require('../../utils/apiResponse');

exports.dashboard = async (req, res, next) => {
  try {
    const [totalTeams, approvedTeams, pendingTeams, totalParticipants, totalSubmissions, totalQuestions, totalEmails, recentActions] = await Promise.all([
      Team.countDocuments(),
      Team.countDocuments({ status: 'approved' }),
      Team.countDocuments({ status: 'pending' }),
      Team.aggregate([{ $project: { count: { $size: '$members' } } }, { $group: { _id: null, total: { $sum: '$count' } } }]),
      Submission.countDocuments(),
      Question.countDocuments({ isActive: true }),
      EmailLog.countDocuments({ status: 'sent' }),
      AdminActionLog.find({}).sort({ createdAt: -1 }).limit(20).populate('adminId', 'name').lean(),
    ]);

    successResponse(res, 200, 'Dashboard data', {
      stats: { totalTeams, approvedTeams, pendingTeams, totalParticipants: totalParticipants[0]?.total || 0, totalSubmissions, totalQuestions, totalEmails },
      recentActions,
    });
  } catch (error) { next(error); }
};

exports.registrationTrend = async (req, res, next) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date(); startDate.setDate(startDate.getDate() - parseInt(days));
    const trend = await Team.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    successResponse(res, 200, 'Registration trend', { trend });
  } catch (error) { next(error); }
};

exports.collegeWise = async (req, res, next) => {
  try {
    const data = await Team.aggregate([
      { $group: { _id: '$teamLead.college', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    successResponse(res, 200, 'College-wise data', { data });
  } catch (error) { next(error); }
};

exports.scoreDistribution = async (req, res, next) => {
  try {
    const Result = require('../../models/Result');
    const results = await Result.find({}).lean();
    const ranges = { '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0 };
    results.forEach(r => {
      const s = r.totalScore;
      if (s <= 20) ranges['0-20']++;
      else if (s <= 40) ranges['21-40']++;
      else if (s <= 60) ranges['41-60']++;
      else if (s <= 80) ranges['61-80']++;
      else ranges['81-100']++;
    });
    successResponse(res, 200, 'Score distribution', { distribution: Object.entries(ranges).map(([range, count]) => ({ range, count })) });
  } catch (error) { next(error); }
};

exports.questionAnalysis = async (req, res, next) => {
  try {
    const questions = await Question.find({ isActive: true }).lean();
    const analysis = [];
    for (const q of questions) {
      const answers = await TeamAnswer.find({ questionId: q._id }).lean();
      const totalAttempts = answers.length;
      const correctCount = answers.filter(a => a.isCorrect).length;
      const avgMarks = totalAttempts ? answers.reduce((sum, a) => sum + (a.marksAwarded || 0), 0) / totalAttempts : 0;
      analysis.push({ questionId: q._id, questionText: q.questionText.substring(0, 80), category: q.category, difficulty: q.difficulty, totalAttempts, correctCount, correctPercentage: totalAttempts ? ((correctCount / totalAttempts) * 100).toFixed(1) : 0, avgMarks: avgMarks.toFixed(2) });
    }
    successResponse(res, 200, 'Question analysis', { analysis });
  } catch (error) { next(error); }
};
