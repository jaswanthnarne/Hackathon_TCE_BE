const Result = require('../../models/Result');
const Team = require('../../models/Team');
const TeamAnswer = require('../../models/TeamAnswer');
const Question = require('../../models/Question');
const HackathonConfig = require('../../models/HackathonConfig');
const { successResponse, errorResponse } = require('../../utils/apiResponse');
const { auditLog } = require('../../middleware/auditLogger');
const { createScoreExport } = require('../../utils/excelExport');

exports.listResults = async (req, res, next) => {
  try {
    const results = await Result.find({}).populate('teamId', 'teamId teamName teamLead').sort({ rank: 1 }).lean();
    successResponse(res, 200, 'Results fetched', { results });
  } catch (error) { next(error); }
};

exports.calculateResults = async (req, res, next) => {
  try {
    const teams = await Team.find({ status: 'approved' }).lean();
    const questions = await Question.find({ isActive: true }).lean();
    const config = await HackathonConfig.findOne().lean();
    const Submission = require('../../models/Submission');

    const results = [];
    for (const team of teams) {
      // --- Quiz Scores ---
      const answers = await TeamAnswer.find({ teamId: team._id }).lean();
      let quizScore = 0;
      const answerDetails = [];

      for (const answer of answers) {
        const question = questions.find(q => q._id.toString() === answer.questionId.toString());
        if (!question) continue;

        let isCorrect = false;
        let marks = 0;

        if (['mcq-single', 'true-false', 'fill-blank', 'output-prediction'].includes(question.questionType)) {
          isCorrect = String(answer.answer).toLowerCase().trim() === String(question.correctAnswer).toLowerCase().trim();
          marks = isCorrect ? question.marks : (config?.questionSettings?.negativeMarking ? -question.negativeMarks : 0);
        } else if (question.questionType === 'mcq-multiple') {
          const correct = Array.isArray(question.correctAnswer) ? question.correctAnswer.sort() : [];
          const given = Array.isArray(answer.answer) ? answer.answer.sort() : [];
          isCorrect = JSON.stringify(correct) === JSON.stringify(given);
          marks = isCorrect ? question.marks : (config?.questionSettings?.negativeMarking ? -question.negativeMarks : 0);
        }

        quizScore += marks;
        answerDetails.push({ questionId: answer.questionId, answer: answer.answer, isCorrect, marksAwarded: marks });
        await TeamAnswer.findByIdAndUpdate(answer._id, { isCorrect, marksAwarded: marks });
      }

      // --- Submission Evaluation Score ---
      let submissionScore = 0;
      const submission = await Submission.findOne({ teamId: team._id }).lean();
      if (submission?.evaluation?.score != null) {
        submissionScore = submission.evaluation.score;
      }

      const totalScore = quizScore + submissionScore;

      await Result.findOneAndUpdate(
        { teamId: team._id },
        { totalScore, answers: answerDetails, calculatedAt: new Date(), calculatedBy: req.admin._id },
        { upsert: true, new: true }
      );
      results.push({ teamId: team._id, teamName: team.teamName, quizScore, submissionScore, totalScore });
    }

    // Calculate ranks
    results.sort((a, b) => b.totalScore - a.totalScore);
    for (let i = 0; i < results.length; i++) {
      await Result.findOneAndUpdate({ teamId: results[i].teamId }, { rank: i + 1 });
    }

    await auditLog(req.admin._id, 'CALCULATE_RESULTS', {
      description: `Calculated results for ${results.length} teams (quiz + submission scores)`,
      ipAddress: req.ip, userAgent: req.headers['user-agent'],
    });

    successResponse(res, 200, `Results calculated for ${results.length} teams`, { count: results.length, results });
  } catch (error) { next(error); }
};

exports.editResult = async (req, res, next) => {
  try {
    const result = await Result.findOne({ teamId: req.params.teamId });
    if (!result) return errorResponse(res, 404, 'Result not found');
    const oldValue = { totalScore: result.totalScore, rank: result.rank, awardTitle: result.awardTitle };
    Object.assign(result, req.body);
    await result.save();

    await auditLog(req.admin._id, 'EDIT_RESULT', {
      targetId: result._id, targetModel: 'Result',
      description: `Edited result for team ${req.params.teamId}`,
      oldValue, newValue: req.body,
      ipAddress: req.ip, userAgent: req.headers['user-agent'],
    });
    successResponse(res, 200, 'Result updated', { result });
  } catch (error) { next(error); }
};

exports.publishResults = async (req, res, next) => {
  try {
    await Result.updateMany({}, { isPublished: true });
    const config = await HackathonConfig.findOne();
    if (config) { config.isResultPublished = true; await config.save(); }

    await auditLog(req.admin._id, 'PUBLISH_RESULTS', {
      description: 'Published results',
      ipAddress: req.ip, userAgent: req.headers['user-agent'],
    });
    successResponse(res, 200, 'Results published');
  } catch (error) { next(error); }
};

exports.unpublishResults = async (req, res, next) => {
  try {
    await Result.updateMany({}, { isPublished: false });
    const config = await HackathonConfig.findOne();
    if (config) { config.isResultPublished = false; await config.save(); }

    await auditLog(req.admin._id, 'UNPUBLISH_RESULTS', {
      description: 'Unpublished results',
      ipAddress: req.ip, userAgent: req.headers['user-agent'],
    });
    successResponse(res, 200, 'Results unpublished');
  } catch (error) { next(error); }
};

exports.exportResults = async (req, res, next) => {
  try {
    const results = await Result.find({}).populate('teamId', 'teamId teamName teamLead').sort({ rank: 1 }).lean();
    const workbook = await createScoreExport(results);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=results_export.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) { next(error); }
};
