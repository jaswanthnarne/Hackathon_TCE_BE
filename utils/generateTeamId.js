const Team = require('../models/Team');

const generateTeamId = async () => {
  const lastTeam = await Team.findOne({}, { teamId: 1 })
    .sort({ createdAt: -1 })
    .lean();

  if (!lastTeam || !lastTeam.teamId) {
    return 'TCE001';
  }

  const lastNumber = parseInt(lastTeam.teamId.replace('TCE', ''), 10);
  const nextNumber = lastNumber + 1;
  return `TCE${String(nextNumber).padStart(3, '0')}`;
};

module.exports = generateTeamId;
