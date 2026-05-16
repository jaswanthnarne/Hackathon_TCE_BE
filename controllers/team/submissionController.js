const Submission = require('../../models/Submission');
const HackathonConfig = require('../../models/HackathonConfig');
const { sendEmail } = require('../../config/email');
const { submissionReceivedTemplate } = require('../../utils/emailTemplates');
const EmailLog = require('../../models/EmailLog');
const { successResponse, errorResponse } = require('../../utils/apiResponse');

exports.submit = async (req, res, next) => {
  try {
    const config = await HackathonConfig.findOne().lean();
    if (!config?.isSubmissionOpen) return errorResponse(res, 403, 'Submissions are closed');

    const existing = await Submission.findOne({ teamId: req.team._id });
    if (existing) return errorResponse(res, 400, 'Already submitted. Use PUT to resubmit.');

    const isLate = config.submissionDeadline && new Date() > new Date(config.submissionDeadline);
    const submission = await Submission.create({
      teamId: req.team._id,
      projectTitle: req.body.projectTitle,
      projectDescription: req.body.projectDescription || '',
      fileUrl: req.file?.path || '',
      filePublicId: req.file?.filename || '',
      githubUrl: req.body.githubUrl || '',
      videoUrl: req.body.videoUrl || '',
      liveDemoUrl: req.body.liveDemoUrl || '',
      additionalNotes: req.body.additionalNotes || '',
      isLate,
    });

    // Send confirmation email
    const emailData = submissionReceivedTemplate({
      teamId: req.team.teamId, teamName: req.team.teamName,
      leadName: req.team.teamLead.name, projectTitle: submission.projectTitle,
      submittedAt: submission.submittedAt,
    });
    const emailResult = await sendEmail({ to: req.team.teamLead.email, subject: emailData.subject, html: emailData.html });
    await EmailLog.create({ to: [req.team.teamLead.email], subject: emailData.subject, type: 'submission_confirm', status: emailResult.success ? 'sent' : 'failed', sentBy: 'system' });

    successResponse(res, 201, 'Project submitted successfully', { submission });
  } catch (error) { next(error); }
};

exports.getSubmission = async (req, res, next) => {
  try {
    const submission = await Submission.findOne({ teamId: req.team._id }).lean();
    if (!submission) return successResponse(res, 200, 'No submission yet', { submission: null });
    successResponse(res, 200, 'Submission fetched', { submission });
  } catch (error) { next(error); }
};

exports.resubmit = async (req, res, next) => {
  try {
    const config = await HackathonConfig.findOne().lean();
    if (!config?.isSubmissionOpen) return errorResponse(res, 403, 'Submissions are closed');

    const submission = await Submission.findOne({ teamId: req.team._id });
    if (!submission) return errorResponse(res, 404, 'No submission found. Submit first.');

    Object.assign(submission, {
      projectTitle: req.body.projectTitle || submission.projectTitle,
      projectDescription: req.body.projectDescription || submission.projectDescription,
      fileUrl: req.file?.path || submission.fileUrl,
      filePublicId: req.file?.filename || submission.filePublicId,
      githubUrl: req.body.githubUrl || submission.githubUrl,
      videoUrl: req.body.videoUrl || submission.videoUrl,
      liveDemoUrl: req.body.liveDemoUrl || submission.liveDemoUrl,
      additionalNotes: req.body.additionalNotes || submission.additionalNotes,
    });
    await submission.save();

    successResponse(res, 200, 'Submission updated', { submission });
  } catch (error) { next(error); }
};
