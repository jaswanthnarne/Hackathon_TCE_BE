const Team = require('../../models/Team');
const { successResponse, errorResponse } = require('../../utils/apiResponse');
const { auditLog } = require('../../middleware/auditLogger');
const { sendEmail } = require('../../config/email');
const { teamCredentialsTemplate, teamApprovedTemplate, teamRejectedTemplate } = require('../../utils/emailTemplates');
const generateTeamId = require('../../utils/generateTeamId');
const generatePassword = require('../../utils/generatePassword');
const { createTeamExport } = require('../../utils/excelExport');
const EmailLog = require('../../models/EmailLog');

// List teams with pagination, search, filters
exports.listTeams = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, status, college, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const query = {};
    if (status) query.status = status;
    if (college) query['teamLead.college'] = { $regex: college, $options: 'i' };
    if (search) {
      query.$or = [
        { teamId: { $regex: search, $options: 'i' } },
        { teamName: { $regex: search, $options: 'i' } },
        { 'teamLead.name': { $regex: search, $options: 'i' } },
        { 'teamLead.email': { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Team.countDocuments(query);
    const teams = await Team.find(query)
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .lean();

    successResponse(res, 200, 'Teams fetched', {
      teams, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) { next(error); }
};

// Create team
exports.createTeam = async (req, res, next) => {
  try {
    const { teamName, teamLead, members = [] } = req.body;
    
    // Check uniqueness of lead USN if provided
    if (teamLead.usn) {
      const existingUsn = await Team.findOne({ 'members.usn': teamLead.usn.toUpperCase() });
      if (existingUsn) return res.status(400).json({ success: false, message: 'USN is already registered with another team.' });
    }

    const teamId = await generateTeamId();
    const plainPassword = generatePassword();

    const leadMember = {
      name: teamLead.name,
      email: teamLead.email,
      usn: teamLead.usn ? teamLead.usn.toUpperCase() : '',
      phone: teamLead.phone || '',
      college: teamLead.college || '',
      year: teamLead.year || '',
      branch: teamLead.branch || '',
      isLead: true,
      addedBy: req.admin._id,
    };

    const allMembers = [leadMember, ...members.map(m => ({ ...m, isLead: false, addedBy: req.admin._id }))];

    const team = await Team.create({
      teamId, teamName, password: plainPassword,
      teamLead: { name: teamLead.name, email: teamLead.email, phone: teamLead.phone || '', college: teamLead.college || '', year: teamLead.year || '', branch: teamLead.branch || '' },
      members: allMembers,
      createdBy: req.admin._id,
    });

    // Send credentials email
    const emailData = teamCredentialsTemplate({ teamId, teamName, password: plainPassword, leadName: teamLead.name, loginUrl: `${process.env.FRONTEND_URL}/team/login` });
    const emailResult = await sendEmail({ to: teamLead.email, subject: emailData.subject, html: emailData.html });

    await EmailLog.create({
      to: [teamLead.email], subject: emailData.subject, body: emailData.html,
      type: 'credentials', status: emailResult.success ? 'sent' : 'failed',
      sentBy: req.admin._id.toString(), error: emailResult.error || '',
    });

    await auditLog(req.admin._id, 'CREATE_TEAM', {
      targetId: team._id, targetModel: 'Team',
      description: `Created team ${teamId} "${teamName}"`,
      newValue: { teamId, teamName, leadEmail: teamLead.email },
      ipAddress: req.ip, userAgent: req.headers['user-agent'],
    });

    const teamObj = team.toObject();
    delete teamObj.password;
    successResponse(res, 201, 'Team created successfully', { team: teamObj, generatedPassword: plainPassword });
  } catch (error) { next(error); }
};

// Get single team
exports.getTeam = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id).lean();
    if (!team) return errorResponse(res, 404, 'Team not found');
    successResponse(res, 200, 'Team fetched', { team });
  } catch (error) { next(error); }
};

// Update team
exports.updateTeam = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return errorResponse(res, 404, 'Team not found');
    const oldValues = { teamName: team.teamName, status: team.status };

    const allowedFields = ['teamName', 'teamLead'];
    allowedFields.forEach(field => { if (req.body[field] !== undefined) team[field] = req.body[field]; });
    await team.save();

    await auditLog(req.admin._id, 'UPDATE_TEAM', {
      targetId: team._id, targetModel: 'Team',
      description: `Updated team ${team.teamId}`,
      oldValue: oldValues, newValue: { teamName: team.teamName },
      ipAddress: req.ip, userAgent: req.headers['user-agent'],
    });

    successResponse(res, 200, 'Team updated', { team });
  } catch (error) { next(error); }
};

// Delete team
exports.deleteTeam = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return errorResponse(res, 404, 'Team not found');

    await auditLog(req.admin._id, 'DELETE_TEAM', {
      targetId: team._id, targetModel: 'Team',
      description: `Deleted team ${team.teamId} "${team.teamName}"`,
      oldValue: { teamId: team.teamId, teamName: team.teamName },
      ipAddress: req.ip, userAgent: req.headers['user-agent'],
    });

    await Team.findByIdAndDelete(req.params.id);
    successResponse(res, 200, 'Team deleted');
  } catch (error) { next(error); }
};

// Bulk delete
exports.bulkDeleteTeams = async (req, res, next) => {
  try {
    const { teamIds } = req.body;
    if (!teamIds || !teamIds.length) return errorResponse(res, 400, 'No team IDs provided');

    const teams = await Team.find({ _id: { $in: teamIds } }).lean();
    await Team.deleteMany({ _id: { $in: teamIds } });

    await auditLog(req.admin._id, 'BULK_DELETE_TEAMS', {
      description: `Bulk deleted ${teams.length} teams`,
      oldValue: teams.map(t => ({ teamId: t.teamId, teamName: t.teamName })),
      ipAddress: req.ip, userAgent: req.headers['user-agent'],
    });

    successResponse(res, 200, `${teams.length} teams deleted`);
  } catch (error) { next(error); }
};

// Change team status (approve/reject/lock/unlock)
exports.changeStatus = async (req, res, next) => {
  try {
    const { status, reason } = req.body;
    const team = await Team.findById(req.params.id);
    if (!team) return errorResponse(res, 404, 'Team not found');

    const oldStatus = team.status;
    team.status = status;
    if (status === 'locked') { team.isLocked = true; team.lockReason = reason || ''; }
    if (status === 'approved' || status === 'pending') { team.isLocked = false; team.lockReason = ''; }
    await team.save();

    // Send email notification
    if (status === 'approved') {
      const emailData = teamApprovedTemplate({ teamName: team.teamName, teamId: team.teamId, leadName: team.teamLead.name });
      await sendEmail({ to: team.teamLead.email, subject: emailData.subject, html: emailData.html });
    } else if (status === 'rejected') {
      const emailData = teamRejectedTemplate({ teamName: team.teamName, teamId: team.teamId, leadName: team.teamLead.name, reason });
      await sendEmail({ to: team.teamLead.email, subject: emailData.subject, html: emailData.html });
    }

    const actionMap = { approved: 'APPROVE_TEAM', rejected: 'REJECT_TEAM', locked: 'LOCK_TEAM', pending: 'UNLOCK_TEAM' };
    await auditLog(req.admin._id, actionMap[status] || 'UPDATE_TEAM', {
      targetId: team._id, targetModel: 'Team',
      description: `Changed team ${team.teamId} status from ${oldStatus} to ${status}`,
      oldValue: { status: oldStatus }, newValue: { status }, reason,
      ipAddress: req.ip, userAgent: req.headers['user-agent'],
    });

    successResponse(res, 200, `Team ${status}`);
  } catch (error) { next(error); }
};

// Reset password
exports.resetPassword = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id).select('+password');
    if (!team) return errorResponse(res, 404, 'Team not found');

    const newPassword = generatePassword();
    team.passwordHistory = [...(team.passwordHistory || []).slice(-2), { hash: team.password, changedAt: new Date() }];
    team.password = newPassword;
    team.forcePasswordChange = true;
    await team.save();

    const emailData = require('../../utils/emailTemplates').passwordResetApprovedTemplate({
      teamId: team.teamId, teamName: team.teamName, password: newPassword, leadName: team.teamLead.name,
    });
    await sendEmail({ to: team.teamLead.email, subject: emailData.subject, html: emailData.html });

    await auditLog(req.admin._id, 'RESET_PASSWORD', {
      targetId: team._id, targetModel: 'Team',
      description: `Reset password for team ${team.teamId}`,
      ipAddress: req.ip, userAgent: req.headers['user-agent'],
    });

    successResponse(res, 200, 'Password reset and emailed to team lead', { newPassword });
  } catch (error) { next(error); }
};

// Force password change toggle
exports.forcePasswordChange = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return errorResponse(res, 404, 'Team not found');
    team.forcePasswordChange = req.body.force !== undefined ? req.body.force : !team.forcePasswordChange;
    await team.save();

    await auditLog(req.admin._id, 'FORCE_PASSWORD_CHANGE', {
      targetId: team._id, targetModel: 'Team',
      description: `Set forcePasswordChange=${team.forcePasswordChange} for team ${team.teamId}`,
      ipAddress: req.ip, userAgent: req.headers['user-agent'],
    });

    successResponse(res, 200, `Force password change: ${team.forcePasswordChange}`);
  } catch (error) { next(error); }
};

// Export teams
exports.exportTeams = async (req, res, next) => {
  try {
    const teams = await Team.find({}).lean();
    const workbook = await createTeamExport(teams);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=teams_export.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) { next(error); }
};
