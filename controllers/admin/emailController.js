const Team = require('../../models/Team');
const EmailLog = require('../../models/EmailLog');
const { sendEmail } = require('../../config/email');
const { customEmailTemplate } = require('../../utils/emailTemplates');
const { successResponse, errorResponse } = require('../../utils/apiResponse');
const { auditLog } = require('../../middleware/auditLogger');

exports.sendBulkEmail = async (req, res, next) => {
  try {
    const { recipients, subject, body, teamIds } = req.body;
    let teams = [];
    if (recipients === 'all') teams = await Team.find({}).lean();
    else if (recipients === 'approved') teams = await Team.find({ status: 'approved' }).lean();
    else if (teamIds?.length) teams = await Team.find({ _id: { $in: teamIds } }).lean();

    let sent = 0, failed = 0;
    for (const team of teams) {
      const pBody = body.replace(/\{\{teamName\}\}/g, team.teamName).replace(/\{\{teamId\}\}/g, team.teamId).replace(/\{\{leadName\}\}/g, team.teamLead?.name || 'Team');
      const emailData = customEmailTemplate({ subject, body: pBody, leadName: team.teamLead?.name });
      const result = await sendEmail({ to: team.teamLead?.email, subject: emailData.subject, html: emailData.html });
      await EmailLog.create({ to: [team.teamLead?.email], subject, body: pBody, type: 'custom', status: result.success ? 'sent' : 'failed', sentBy: req.admin._id.toString(), error: result.error || '' });
      result.success ? sent++ : failed++;
    }

    await auditLog(req.admin._id, 'SEND_EMAIL', { description: `Sent email to ${sent} teams (${failed} failed). Subject: ${subject}`, ipAddress: req.ip });
    successResponse(res, 200, `Email sent to ${sent} teams, ${failed} failed`, { sent, failed });
  } catch (error) { next(error); }
};

exports.getEmailLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, type, status } = req.query;
    const query = {};
    if (type) query.type = type;
    if (status) query.status = status;
    const total = await EmailLog.countDocuments(query);
    const logs = await EmailLog.find(query).sort({ sentAt: -1 }).skip((parseInt(page) - 1) * parseInt(limit)).limit(parseInt(limit)).lean();
    successResponse(res, 200, 'Email logs fetched', { logs, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (error) { next(error); }
};
