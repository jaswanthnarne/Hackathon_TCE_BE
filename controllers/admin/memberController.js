const Team = require('../../models/Team');
const { successResponse, errorResponse } = require('../../utils/apiResponse');
const { auditLog } = require('../../middleware/auditLogger');

// Add member
exports.addMember = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return errorResponse(res, 404, 'Team not found');
    if (team.members.length >= 5) return errorResponse(res, 400, 'Maximum 5 members allowed');

    const member = { ...req.body, isLead: false, addedBy: req.admin._id, addedAt: new Date() };
    team.members.push(member);
    await team.save();

    await auditLog(req.admin._id, 'ADD_MEMBER', {
      targetId: team._id, targetModel: 'Team',
      description: `Added member ${member.name} to team ${team.teamId}`,
      newValue: member, ipAddress: req.ip, userAgent: req.headers['user-agent'],
    });

    successResponse(res, 201, 'Member added', { team });
  } catch (error) { next(error); }
};

// Edit member
exports.editMember = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return errorResponse(res, 404, 'Team not found');

    const member = team.members.id(req.params.memberId);
    if (!member) return errorResponse(res, 404, 'Member not found');

    if (req.body.usn) {
      const formattedUsn = req.body.usn.toUpperCase();
      if (formattedUsn !== member.usn) {
        const usnInTeam = team.members.some(m => m._id.toString() !== req.params.memberId && m.usn === formattedUsn);
        if (usnInTeam) return errorResponse(res, 400, 'This USN is already used by another member in the team');
        const otherTeamUsn = await Team.findOne({ 'members.usn': formattedUsn, _id: { $ne: team._id } });
        if (otherTeamUsn) return errorResponse(res, 400, 'This USN is already registered with another team.');
      }
      req.body.usn = formattedUsn;
    }

    const oldValue = member.toObject();
    Object.assign(member, req.body);
    
    // Update teamLead if this member is the lead
    if (member.isLead) {
      team.teamLead.name = member.name;
      team.teamLead.phone = member.phone;
      team.teamLead.college = member.college;
      team.teamLead.year = member.year;
      team.teamLead.branch = member.branch;
      team.teamLead.usn = member.usn;
    }
    await team.save();

    await auditLog(req.admin._id, 'UPDATE_MEMBER', {
      targetId: team._id, targetModel: 'Team',
      description: `Updated member ${member.name} in team ${team.teamId}`,
      oldValue, newValue: member.toObject(),
      ipAddress: req.ip, userAgent: req.headers['user-agent'],
    });

    successResponse(res, 200, 'Member updated', { team });
  } catch (error) { next(error); }
};

// Remove member
exports.removeMember = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return errorResponse(res, 404, 'Team not found');

    const member = team.members.id(req.params.memberId);
    if (!member) return errorResponse(res, 404, 'Member not found');
    if (member.isLead) return errorResponse(res, 400, 'Cannot remove team lead. Change lead first.');
    if (team.members.length <= 2) return errorResponse(res, 400, 'Team must have at least 2 members');

    const removedMember = member.toObject();
    team.members.pull(req.params.memberId);
    await team.save();

    await auditLog(req.admin._id, 'REMOVE_MEMBER', {
      targetId: team._id, targetModel: 'Team',
      description: `Removed member ${removedMember.name} from team ${team.teamId}`,
      oldValue: removedMember, ipAddress: req.ip, userAgent: req.headers['user-agent'],
    });

    successResponse(res, 200, 'Member removed', { team });
  } catch (error) { next(error); }
};

// Change team lead
exports.changeLead = async (req, res, next) => {
  try {
    const { newLeadMemberId } = req.body;
    const team = await Team.findById(req.params.id);
    if (!team) return errorResponse(res, 404, 'Team not found');

    const newLead = team.members.id(newLeadMemberId);
    if (!newLead) return errorResponse(res, 404, 'Member not found');

    const oldLead = team.members.find(m => m.isLead);
    if (oldLead) oldLead.isLead = false;
    newLead.isLead = true;

    team.teamLead = { name: newLead.name, email: newLead.email, phone: newLead.phone, college: newLead.college, year: newLead.year, branch: newLead.branch };
    await team.save();

    await auditLog(req.admin._id, 'CHANGE_LEAD', {
      targetId: team._id, targetModel: 'Team',
      description: `Changed lead of team ${team.teamId} from ${oldLead?.name} to ${newLead.name}`,
      oldValue: { leadName: oldLead?.name }, newValue: { leadName: newLead.name },
      ipAddress: req.ip, userAgent: req.headers['user-agent'],
    });

    successResponse(res, 200, 'Team lead changed', { team });
  } catch (error) { next(error); }
};
