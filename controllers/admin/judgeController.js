const JudgeScore = require('../../models/JudgeScore');
const Team = require('../../models/Team');
const Admin = require('../../models/Admin');
const { successResponse, errorResponse } = require('../../utils/apiResponse');

// Judge: get teams assigned to me (or all if admin)
exports.getAssignedTeams = async (req, res, next) => {
  try {
    const user = req.admin;
    let teams;

    if (user.role === 'judge' && user.assignedTeams && user.assignedTeams.length > 0) {
      teams = await Team.find({ _id: { $in: user.assignedTeams }, status: 'approved' })
        .select('teamId teamName teamLead.name zone tableNumber selectedProblem')
        .populate('selectedProblem', 'title')
        .lean();
    } else {
      // Admin or judge with no specific assignment sees all approved teams
      teams = await Team.find({ status: 'approved' })
        .select('teamId teamName teamLead.name zone tableNumber selectedProblem')
        .populate('selectedProblem', 'title')
        .lean();
    }

    // Attach existing scores by this judge
    const myScores = await JudgeScore.find({ judge: user._id }).lean();
    const scoreMap = {};
    myScores.forEach(s => { scoreMap[s.team.toString()] = s; });

    const result = teams.map(t => ({
      ...t,
      myScore: scoreMap[t._id.toString()] || null,
    }));

    successResponse(res, 200, 'Teams for judging', { teams: result });
  } catch (error) { next(error); }
};

// Judge: submit or update scores for a team
exports.submitScore = async (req, res, next) => {
  try {
    const { teamId, scores, feedback } = req.body;
    if (!teamId || !scores) return errorResponse(res, 400, 'Team ID and scores are required');

    const team = await Team.findById(teamId);
    if (!team) return errorResponse(res, 404, 'Team not found');

    // Validate score ranges
    for (const [key, val] of Object.entries(scores)) {
      if (val < 0 || val > 10) return errorResponse(res, 400, `${key} must be between 0 and 10`);
    }

    // Upsert: update if exists, create if not
    const score = await JudgeScore.findOneAndUpdate(
      { judge: req.admin._id, team: teamId },
      {
        judge: req.admin._id,
        team: teamId,
        scores,
        feedback: feedback || '',
        submittedAt: new Date(),
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );

    // Trigger pre-save for weighted total
    const freshScore = await JudgeScore.findById(score._id);
    await freshScore.save();

    successResponse(res, 200, 'Score submitted', { score: freshScore });
  } catch (error) { next(error); }
};

// Admin: get full scoreboard (aggregated across all judges)
exports.getScoreboard = async (req, res, next) => {
  try {
    const teams = await Team.find({ status: 'approved' })
      .select('teamId teamName teamLead.name zone tableNumber')
      .lean();

    const allScores = await JudgeScore.find()
      .populate('judge', 'name staffId')
      .lean();

    // Group scores by team
    const teamScoreMap = {};
    allScores.forEach(s => {
      const tid = s.team.toString();
      if (!teamScoreMap[tid]) teamScoreMap[tid] = [];
      teamScoreMap[tid].push(s);
    });

    const scoreboard = teams.map(team => {
      const scores = teamScoreMap[team._id.toString()] || [];
      const avgScores = { innovation: 0, technicalComplexity: 0, uiux: 0, businessViability: 0 };
      let avgTotal = 0;

      if (scores.length > 0) {
        scores.forEach(s => {
          avgScores.innovation += s.scores.innovation;
          avgScores.technicalComplexity += s.scores.technicalComplexity;
          avgScores.uiux += s.scores.uiux;
          avgScores.businessViability += s.scores.businessViability;
          avgTotal += s.totalWeighted;
        });
        Object.keys(avgScores).forEach(k => { avgScores[k] = Math.round((avgScores[k] / scores.length) * 100) / 100; });
        avgTotal = Math.round((avgTotal / scores.length) * 100) / 100;
      }

      return {
        ...team,
        judgeCount: scores.length,
        avgScores,
        avgTotal,
        individualScores: scores,
      };
    });

    // Sort by avgTotal descending
    scoreboard.sort((a, b) => b.avgTotal - a.avgTotal);

    // Add ranks
    scoreboard.forEach((s, i) => { s.rank = i + 1; });

    successResponse(res, 200, 'Scoreboard', { scoreboard });
  } catch (error) { next(error); }
};

// Admin: list all judges
exports.listJudges = async (req, res, next) => {
  try {
    const judges = await Admin.find({ role: 'judge' })
      .select('name email staffId assignedTeams specialization')
      .populate('assignedTeams', 'teamId teamName')
      .lean();

    // Count scores per judge
    for (const judge of judges) {
      judge.scoresSubmitted = await JudgeScore.countDocuments({ judge: judge._id });
    }

    successResponse(res, 200, 'Judges', { judges });
  } catch (error) { next(error); }
};
