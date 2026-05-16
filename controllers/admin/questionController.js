const Question = require('../../models/Question');
const { successResponse, errorResponse } = require('../../utils/apiResponse');
const { auditLog } = require('../../middleware/auditLogger');
const { createQuestionExport, parseQuestionImport } = require('../../utils/excelExport');

exports.listQuestions = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, category, difficulty, round, questionType, isActive } = req.query;
    const query = {};
    if (category) query.category = category;
    if (difficulty) query.difficulty = difficulty;
    if (round) query.round = round;
    if (questionType) query.questionType = questionType;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (search) query.questionText = { $regex: search, $options: 'i' };

    const total = await Question.countDocuments(query);
    const questions = await Question.find(query)
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .lean();

    successResponse(res, 200, 'Questions fetched', {
      questions, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) { next(error); }
};

exports.createQuestion = async (req, res, next) => {
  try {
    const question = await Question.create({ ...req.body, createdBy: req.admin._id });
    await auditLog(req.admin._id, 'CREATE_QUESTION', {
      targetId: question._id, targetModel: 'Question',
      description: `Created question: ${question.questionText.substring(0, 50)}...`,
      ipAddress: req.ip, userAgent: req.headers['user-agent'],
    });
    successResponse(res, 201, 'Question created', { question });
  } catch (error) { next(error); }
};

exports.getQuestion = async (req, res, next) => {
  try {
    const question = await Question.findById(req.params.id).lean();
    if (!question) return errorResponse(res, 404, 'Question not found');
    successResponse(res, 200, 'Question fetched', { question });
  } catch (error) { next(error); }
};

exports.updateQuestion = async (req, res, next) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) return errorResponse(res, 404, 'Question not found');
    const oldValue = question.toObject();
    Object.assign(question, req.body);
    await question.save();

    await auditLog(req.admin._id, 'UPDATE_QUESTION', {
      targetId: question._id, targetModel: 'Question',
      description: `Updated question`, oldValue: { questionText: oldValue.questionText },
      ipAddress: req.ip, userAgent: req.headers['user-agent'],
    });
    successResponse(res, 200, 'Question updated', { question });
  } catch (error) { next(error); }
};

exports.deleteQuestion = async (req, res, next) => {
  try {
    const question = await Question.findByIdAndDelete(req.params.id);
    if (!question) return errorResponse(res, 404, 'Question not found');
    await auditLog(req.admin._id, 'DELETE_QUESTION', {
      targetId: question._id, targetModel: 'Question',
      description: `Deleted question: ${question.questionText.substring(0, 50)}`,
      ipAddress: req.ip, userAgent: req.headers['user-agent'],
    });
    successResponse(res, 200, 'Question deleted');
  } catch (error) { next(error); }
};

exports.duplicateQuestion = async (req, res, next) => {
  try {
    const original = await Question.findById(req.params.id).lean();
    if (!original) return errorResponse(res, 404, 'Question not found');
    delete original._id;
    delete original.createdAt;
    delete original.updatedAt;
    original.questionText = `[COPY] ${original.questionText}`;
    original.createdBy = req.admin._id;
    const duplicate = await Question.create(original);
    await auditLog(req.admin._id, 'DUPLICATE_QUESTION', {
      targetId: duplicate._id, targetModel: 'Question',
      description: `Duplicated question from ${req.params.id}`,
      ipAddress: req.ip, userAgent: req.headers['user-agent'],
    });
    successResponse(res, 201, 'Question duplicated', { question: duplicate });
  } catch (error) { next(error); }
};

exports.bulkImport = async (req, res, next) => {
  try {
    if (!req.file) return errorResponse(res, 400, 'No file uploaded');
    const questions = await parseQuestionImport(req.file.buffer);
    const created = await Question.insertMany(questions.map(q => ({ ...q, createdBy: req.admin._id })));
    await auditLog(req.admin._id, 'BULK_IMPORT_QUESTIONS', {
      description: `Imported ${created.length} questions from Excel`,
      ipAddress: req.ip, userAgent: req.headers['user-agent'],
    });
    successResponse(res, 201, `${created.length} questions imported`, { count: created.length });
  } catch (error) { next(error); }
};

exports.exportQuestions = async (req, res, next) => {
  try {
    const questions = await Question.find({}).lean();
    const workbook = await createQuestionExport(questions);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=questions_export.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) { next(error); }
};
