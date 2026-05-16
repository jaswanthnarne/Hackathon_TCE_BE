const express = require('express');
const router = express.Router();
const HackathonConfig = require('../models/HackathonConfig');
const TeamInvite = require('../models/TeamInvite');
const Team = require('../models/Team');
const { successResponse, errorResponse } = require('../utils/apiResponse');

// Public hackathon info
router.get('/hackathon-info', async (req, res, next) => {
  try {
    let config = await HackathonConfig.findOne().select('-updatedBy').lean();
    if (!config) config = { name: 'TCE Hackathon', tagline: 'Code. Create. Conquer.' };
    successResponse(res, 200, 'Hackathon info', { config });
  } catch (error) { next(error); }
});

// Get invite details (for the accept/decline page)
router.get('/invite/:token', async (req, res, next) => {
  try {
    const invite = await TeamInvite.findOne({ token: req.params.token }).populate('teamId', 'teamId teamName teamLead').lean();
    if (!invite) return errorResponse(res, 404, 'Invitation not found or has expired.');
    if (invite.status !== 'pending') return errorResponse(res, 400, `This invitation has already been ${invite.status}.`);
    if (new Date() > new Date(invite.expiresAt)) return errorResponse(res, 400, 'This invitation has expired.');

    successResponse(res, 200, 'Invitation details', {
      invite: {
        name: invite.name,
        email: invite.email,
        usn: invite.usn,
        teamName: invite.teamId?.teamName,
        teamId: invite.teamId?.teamId,
        invitedBy: invite.invitedBy,
        expiresAt: invite.expiresAt,
      },
    });
  } catch (error) { next(error); }
});

// Accept invite
router.post('/invite/:token/accept', async (req, res, next) => {
  try {
    const invite = await TeamInvite.findOne({ token: req.params.token });
    if (!invite) return errorResponse(res, 404, 'Invitation not found or has expired.');
    if (invite.status !== 'pending') return errorResponse(res, 400, `This invitation has already been ${invite.status}.`);
    if (new Date() > new Date(invite.expiresAt)) {
      invite.status = 'expired';
      await invite.save();
      return errorResponse(res, 400, 'This invitation has expired.');
    }

    const team = await Team.findById(invite.teamId);
    if (!team) return errorResponse(res, 404, 'Team no longer exists.');

    const config = await HackathonConfig.findOne().lean();
    const maxSize = config?.teamSettings?.maxSize || 5;
    if (team.members.length >= maxSize) return errorResponse(res, 400, `Team is already full (${maxSize} members max).`);

    // Check if already on a team
    const existingTeam = await Team.findOne({ 'members.email': invite.email });
    if (existingTeam) return errorResponse(res, 400, 'You are already registered with a team.');

    // Add member
    team.members.push({
      name: invite.name,
      email: invite.email,
      usn: invite.usn,
      phone: invite.phone || '',
      college: invite.college || '',
      year: invite.year || '',
      branch: invite.branch || '',
      isLead: false,
    });
    await team.save();

    // Update invite status
    invite.status = 'accepted';
    await invite.save();

    successResponse(res, 200, `Welcome to team "${team.teamName}"! You have been added successfully.`, {
      team: { teamId: team.teamId, teamName: team.teamName },
    });
  } catch (error) { next(error); }
});

// Decline invite
router.post('/invite/:token/decline', async (req, res, next) => {
  try {
    const invite = await TeamInvite.findOne({ token: req.params.token });
    if (!invite) return errorResponse(res, 404, 'Invitation not found or has expired.');
    if (invite.status !== 'pending') return errorResponse(res, 400, `This invitation has already been ${invite.status}.`);

    invite.status = 'declined';
    await invite.save();

    successResponse(res, 200, 'Invitation declined.');
  } catch (error) { next(error); }
});

module.exports = router;
