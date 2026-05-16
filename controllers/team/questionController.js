const Question = require('../../models/Question');
const TeamAnswer = require('../../models/TeamAnswer');
const HackathonConfig = require('../../models/HackathonConfig');
const Result = require('../../models/Result');
const { successResponse, errorResponse } = require('../../utils/apiResponse');

exports.getQuestions = async (req, res, next) => {
  try {
    const config = await HackathonConfig.findOne().lean();
    const questions = await Question.find({ isActive: true }).select('-correctAnswer -explanation -testCases').lean();
    let result = questions;
    if (config?.questionSettings?.randomizeOrder) result = result.sort(() => Math.random() - 0.5);
    if (config?.questionSettings?.shuffleOptions) {
      result = result.map(q => {
        if (q.options?.length) q.options = q.options.sort(() => Math.random() - 0.5);
        return q;
      });
    }
    const timeLimit = (config?.questionSettings?.timeLimit || 60) + (req.team.timeExtension?.extraMinutes || 0);
    successResponse(res, 200, 'Questions fetched', { questions: result, timeLimit, totalQuestions: result.length });
  } catch (error) { next(error); }
};

exports.getAnswerStatus = async (req, res, next) => {
  try {
    const answers = await TeamAnswer.find({ teamId: req.team._id }).select('questionId isMarkedForReview answer').lean();
    successResponse(res, 200, 'Answer status', { answers });
  } catch (error) { next(error); }
};

exports.saveAnswer = async (req, res, next) => {
  try {
    const { questionId, answer, isMarkedForReview, timeTakenSeconds } = req.body;
    const existing = await TeamAnswer.findOne({ teamId: req.team._id, questionId });
    if (existing) {
      existing.answer = answer;
      existing.isMarkedForReview = isMarkedForReview || false;
      existing.lastModifiedAt = new Date();
      if (timeTakenSeconds) existing.timeTakenSeconds = timeTakenSeconds;
      await existing.save();
      return successResponse(res, 200, 'Answer saved', { answer: existing });
    }
    const newAnswer = await TeamAnswer.create({ teamId: req.team._id, questionId, answer, isMarkedForReview: isMarkedForReview || false, timeTakenSeconds: timeTakenSeconds || 0 });
    successResponse(res, 201, 'Answer saved', { answer: newAnswer });
  } catch (error) { next(error); }
};

exports.submitAll = async (req, res, next) => {
  try {
    const answers = await TeamAnswer.find({ teamId: req.team._id }).lean();
    successResponse(res, 200, 'All answers submitted successfully', { totalAnswered: answers.length, submittedAt: new Date() });
  } catch (error) { next(error); }
};

exports.getResults = async (req, res, next) => {
  try {
    const config = await HackathonConfig.findOne().lean();
    if (!config?.isResultPublished) return errorResponse(res, 403, 'Results not published yet');

    const result = await Result.findOne({ teamId: req.team._id }).lean();
    const answers = await TeamAnswer.find({ teamId: req.team._id }).populate('questionId', 'questionText questionType correctAnswer marks').lean();

    successResponse(res, 200, 'Results', { result, answers });
  } catch (error) { next(error); }
};
