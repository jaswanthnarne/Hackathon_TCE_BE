const Team = require('../../models/Team');
const TeamInvite = require('../../models/TeamInvite');
const HackathonConfig = require('../../models/HackathonConfig');
const { sendEmail } = require('../../config/email');
const { teamInviteTemplate } = require('../../utils/emailTemplates');
const EmailLog = require('../../models/EmailLog');
const { successResponse, errorResponse } = require('../../utils/apiResponse');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

exports.inviteMember = async (req, res, next) => {
  try {
    const { name, email, usn, phone, college, year, branch } = req.body;
    const team = await Team.findById(req.team._id);

    // Get limits from config
    const config = await HackathonConfig.findOne().lean();
    const maxSize = config?.teamSettings?.maxSize || 5;

    if (team.members.length >= maxSize) {
      return errorResponse(res, 400, `Team is full. Maximum ${maxSize} members allowed.`);
    }

    // Check if email already exists in this team
    const emailInTeam = team.members.some(m => m.email === email);
    if (emailInTeam) return errorResponse(res, 400, 'This person is already on your team!');

    // Check if email exists in any other team
    const otherTeam = await Team.findOne({ 'members.email': email, _id: { $ne: team._id } });
    if (otherTeam) return errorResponse(res, 400, 'This email is already registered with another team.');

    // Check if there's already a pending invite for this email on this team
    const existingInvite = await TeamInvite.findOne({ teamId: team._id, email, status: 'pending' });
    if (existingInvite) return errorResponse(res, 400, 'An invitation has already been sent to this email. Wait for them to respond.');

    // Check if USN already exists in this team or any other team
    if (usn) {
      const usnInTeam = team.members.some(m => m.usn && m.usn.toUpperCase() === usn.toUpperCase());
      if (usnInTeam) return errorResponse(res, 400, 'This USN is already in your team!');
      const otherTeamUsn = await Team.findOne({ 'members.usn': usn.toUpperCase(), _id: { $ne: team._id } });
      if (otherTeamUsn) return errorResponse(res, 400, 'This USN is already registered with another team.');
    }

    // Create invite
    const invite = await TeamInvite.create({
      teamId: team._id,
      invitedBy: req.team.teamLead?.name || req.team.teamName,
      name,
      email,
      usn: usn ? usn.toUpperCase() : '',
      phone: phone || '',
      college: college || '',
      year: year || '',
      branch: branch || '',
    });

    // Send invitation email
    const acceptUrl = `${FRONTEND_URL}/invite/accept/${invite.token}`;
    const declineUrl = `${FRONTEND_URL}/invite/decline/${invite.token}`;

    const emailData = teamInviteTemplate({
      inviteeName: name,
      teamName: team.teamName,
      teamId: team.teamId,
      invitedByName: req.team.teamLead?.name || req.team.teamName,
      acceptUrl,
      declineUrl,
    });

    const emailResult = await sendEmail({ to: email, subject: emailData.subject, html: emailData.html });
    await EmailLog.create({
      to: [email],
      subject: emailData.subject,
      type: 'team_invite',
      status: emailResult.success ? 'sent' : 'failed',
      sentBy: 'team',
    });

    successResponse(res, 201, `Invitation sent to ${name} at ${email}!`, { invite: { id: invite._id, name, email, status: 'pending' } });
  } catch (error) { next(error); }
};

exports.removeMember = async (req, res, next) => {
  try {
    const { memberId } = req.params;
    const team = await Team.findById(req.team._id);

    const config = await HackathonConfig.findOne().lean();
    const minSize = config?.teamSettings?.minSize || 2;

    const member = team.members.id(memberId);
    if (!member) return errorResponse(res, 404, 'Member not found');
    if (member.isLead) return errorResponse(res, 400, 'Cannot remove the team lead');

    if (team.members.length <= minSize) {
      return errorResponse(res, 400, `Cannot remove. Minimum ${minSize} members required.`);
    }

    team.members.pull(memberId);
    await team.save();

    successResponse(res, 200, 'Member removed', { members: team.members });
  } catch (error) { next(error); }
};

exports.getPendingInvites = async (req, res, next) => {
  try {
    const invites = await TeamInvite.find({ teamId: req.team._id, status: 'pending' }).sort({ createdAt: -1 }).lean();
    successResponse(res, 200, 'Pending invites', { invites });
  } catch (error) { next(error); }
};

exports.cancelInvite = async (req, res, next) => {
  try {
    const invite = await TeamInvite.findOne({ _id: req.params.inviteId, teamId: req.team._id, status: 'pending' });
    if (!invite) return errorResponse(res, 404, 'Invite not found or already resolved');
    invite.status = 'expired';
    await invite.save();
    successResponse(res, 200, 'Invite cancelled');
  } catch (error) { next(error); }
};

exports.updateMember = async (req, res, next) => {
  try {
    const { memberId } = req.params;
    const { name, phone, college, year, branch, usn } = req.body;
    
    const team = await Team.findById(req.team._id);
    const member = team.members.id(memberId);
    if (!member) return errorResponse(res, 404, 'Member not found');

    if (usn) {
      const formattedUsn = usn.toUpperCase();
      if (formattedUsn !== member.usn) {
        const usnInTeam = team.members.some(m => m._id.toString() !== memberId && m.usn === formattedUsn);
        if (usnInTeam) return errorResponse(res, 400, 'This USN is already used by another member in your team');
        const otherTeamUsn = await Team.findOne({ 'members.usn': formattedUsn, _id: { $ne: team._id } });
        if (otherTeamUsn) return errorResponse(res, 400, 'This USN is already registered with another team.');
        member.usn = formattedUsn;
      }
    }

    if (name) member.name = name;
    if (phone !== undefined) member.phone = phone;
    if (college !== undefined) member.college = college;
    if (year !== undefined) member.year = year;
    if (branch !== undefined) member.branch = branch;

    if (member.isLead) {
      team.teamLead.name = member.name;
      team.teamLead.phone = member.phone;
      team.teamLead.college = member.college;
      team.teamLead.year = member.year;
      team.teamLead.branch = member.branch;
      team.teamLead.usn = member.usn;
    }

    await team.save();
    successResponse(res, 200, 'Member details updated successfully', { member });
  } catch (error) { next(error); }
};
