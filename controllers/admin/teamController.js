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

// Bulk import teams from JSON
exports.bulkImportTeamsJson = async (req, res, next) => {
  try {
    const { teams, sendEmail: shouldSendEmail } = req.body;
    if (!Array.isArray(teams) || teams.length === 0) {
      return errorResponse(res, 400, 'No teams provided for import');
    }

    const results = {
      importedCount: 0,
      skippedCount: 0,
      errors: []
    };

    for (let i = 0; i < teams.length; i++) {
      const teamData = teams[i];
      try {
        if (!teamData.teamName || !teamData.teamLead || !teamData.teamLead.email) {
          results.skippedCount++;
          results.errors.push({ row: i + 1, team: teamData.teamName || 'Unknown', reason: 'Missing required fields (teamName, lead email)' });
          continue;
        }

        const allEmails = [teamData.teamLead.email];
        const allUsns = [teamData.teamLead.usn];
        
        if (teamData.members && Array.isArray(teamData.members)) {
          teamData.members.forEach((m, idx) => {
            const fallbackEmail = m.email || `${m.usn ? m.usn.toLowerCase() : 'member' + idx + '_' + Math.random().toString(36).substring(2,6)}@${teamData.teamName?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'team'}.com`;
            m.email = fallbackEmail;
            if (m.email) allEmails.push(m.email);
            if (m.usn) allUsns.push(m.usn);
          });
        }

        const cleanEmails = allEmails.map(e => e?.toLowerCase().trim()).filter(Boolean);
        const cleanUsns = allUsns.map(u => u?.toUpperCase().trim()).filter(Boolean);

        let usnExists = false;
        let emailExists = false;

        if (cleanUsns.length > 0) {
           const existingUsn = await Team.findOne({ $or: [ { 'teamLead.usn': { $in: cleanUsns } }, { 'members.usn': { $in: cleanUsns } } ] });
           if (existingUsn) usnExists = true;
        }

        if (cleanEmails.length > 0) {
           const existingEmail = await Team.findOne({ $or: [ { 'teamLead.email': { $in: cleanEmails } }, { 'members.email': { $in: cleanEmails } } ] });
           if (existingEmail) emailExists = true;
        }

        if (usnExists || emailExists) {
          results.skippedCount++;
          results.errors.push({ row: i + 1, team: teamData.teamName, reason: 'Duplicate email or USN already registered in another team' });
          continue;
        }

        const existingTeamName = await Team.findOne({ teamName: teamData.teamName });
        if (existingTeamName) {
           results.skippedCount++;
           results.errors.push({ row: i + 1, team: teamData.teamName, reason: 'Team name already exists' });
           continue;
        }

        const teamId = await generateTeamId();
        const plainPassword = generatePassword();

        const leadMember = {
          name: teamData.teamLead.name,
          email: teamData.teamLead.email,
          usn: teamData.teamLead.usn ? teamData.teamLead.usn.toUpperCase() : '',
          phone: teamData.teamLead.phone || '',
          college: teamData.teamLead.college || '',
          year: teamData.teamLead.year || '',
          branch: teamData.teamLead.branch || '',
          isLead: true,
          addedBy: req.admin._id,
        };

        const otherMembers = (teamData.members || []).map((m, index) => ({
          name: m.name || `Member ${index + 2}`,
          email: m.email,
          usn: m.usn ? m.usn.toUpperCase() : '',
          phone: m.phone || '',
          college: m.college || teamData.teamLead.college || '',
          isLead: false,
          addedBy: req.admin._id
        }));

        const allMembers = [leadMember, ...otherMembers];

        const team = await Team.create({
          teamId, 
          teamName: teamData.teamName, 
          password: plainPassword,
          teamLead: leadMember,
          members: allMembers,
          createdBy: req.admin._id,
        });

        if (shouldSendEmail) {
          const emailData = teamCredentialsTemplate({ teamId, teamName: teamData.teamName, password: plainPassword, leadName: teamData.teamLead.name, loginUrl: `${process.env.FRONTEND_URL}/team/login` });
          const emailResult = await sendEmail({ to: teamData.teamLead.email, subject: emailData.subject, html: emailData.html });

          await EmailLog.create({
            to: [teamData.teamLead.email], subject: emailData.subject, body: emailData.html,
            type: 'credentials', status: emailResult.success ? 'sent' : 'failed',
            sentBy: req.admin._id.toString(), error: emailResult.error || '',
          });
        }

        results.importedCount++;
      } catch (err) {
        results.skippedCount++;
        results.errors.push({ row: i + 1, team: teamData?.teamName || 'Unknown', reason: err.message });
      }
    }

    await auditLog(req.admin._id, 'BULK_IMPORT_TEAMS', {
      description: `Bulk imported ${results.importedCount} teams`,
      newValue: { importedCount: results.importedCount, skippedCount: results.skippedCount },
      ipAddress: req.ip, userAgent: req.headers['user-agent'],
    });

    successResponse(res, 200, 'Bulk import completed', results);
  } catch (error) { next(error); }
};

// Unlock team account (reset login attempts and lock status)
exports.unlockTeam = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return errorResponse(res, 404, 'Team not found');

    const oldStatus = team.status;
    const oldLockUntil = team.lockUntil;

    team.loginAttempts = 0;
    team.lockUntil = undefined;
    team.isLocked = false;
    team.lockReason = '';
    
    if (team.status === 'locked') {
      team.status = 'approved';
    }
    await team.save();

    await auditLog(req.admin._id, 'UNLOCK_TEAM', {
      targetId: team._id, targetModel: 'Team',
      description: `Unlocked team ${team.teamId} (reset login attempts and lock status)`,
      oldValue: { status: oldStatus, lockUntil: oldLockUntil }, newValue: { status: team.status, isLocked: false },
      ipAddress: req.ip, userAgent: req.headers['user-agent'],
    });

    successResponse(res, 200, 'Team account unlocked successfully', { team });
  } catch (error) { next(error); }
};
