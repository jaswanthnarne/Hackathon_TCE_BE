const Submission = require('../../models/Submission');
const { auditLog } = require('../../middleware/auditLogger');
const { successResponse, errorResponse } = require('../../utils/apiResponse');

exports.listSubmissions = async (req, res, next) => {
  try {
    const submissions = await Submission.find({}).populate('teamId', 'teamId teamName teamLead status').sort({ submittedAt: -1 }).lean();
    // Map teamId to team for cleaner frontend usage
    const mapped = submissions.map(s => ({ ...s, team: s.teamId, teamId: s.teamId?._id }));
    successResponse(res, 200, 'Submissions fetched', { submissions: mapped });
  } catch (error) { next(error); }
};

exports.getSubmission = async (req, res, next) => {
  try {
    const submission = await Submission.findOne({ teamId: req.params.teamId }).populate('teamId', 'teamId teamName teamLead').lean();
    if (!submission) return errorResponse(res, 404, 'Submission not found');
    successResponse(res, 200, 'Submission fetched', { submission: { ...submission, team: submission.teamId } });
  } catch (error) { next(error); }
};

exports.evaluateSubmission = async (req, res, next) => {
  try {
    const { score, maxScore, feedback, criteria } = req.body;
    const submission = await Submission.findById(req.params.id);
    if (!submission) return errorResponse(res, 404, 'Submission not found');

    submission.evaluation = {
      score,
      maxScore: maxScore || 100,
      feedback: feedback || '',
      criteria: criteria || [],
      evaluatedBy: req.admin._id,
      evaluatedAt: new Date(),
      status: 'evaluated',
    };
    await submission.save();

    await auditLog(req.admin._id, 'EVALUATE_SUBMISSION', {
      targetId: submission._id, targetModel: 'Submission',
      description: `Evaluated submission for team (score: ${score}/${maxScore})`,
      ipAddress: req.ip, userAgent: req.headers['user-agent'],
    });

    successResponse(res, 200, 'Evaluation saved', { submission });
  } catch (error) { next(error); }
};
