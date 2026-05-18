const Team = require('../../models/Team');
const { successResponse, errorResponse } = require('../../utils/apiResponse');

// Admin: assign table to a team
exports.assignTable = async (req, res, next) => {
  try {
    const { zone, tableNumber } = req.body;
    const team = await Team.findByIdAndUpdate(
      req.params.id,
      { zone: zone || '', tableNumber: tableNumber || '' },
      { new: true }
    ).select('teamId teamName zone tableNumber');

    if (!team) return errorResponse(res, 404, 'Team not found');
    successResponse(res, 200, 'Table assigned', { team });
  } catch (error) { next(error); }
};

// Admin: bulk assign tables
exports.bulkAssignTables = async (req, res, next) => {
  try {
    const { assignments } = req.body; // [{ teamId, zone, tableNumber }]
    if (!Array.isArray(assignments)) return errorResponse(res, 400, 'Assignments must be an array');

    const results = [];
    for (const a of assignments) {
      const team = await Team.findByIdAndUpdate(
        a.teamId,
        { zone: a.zone || '', tableNumber: a.tableNumber || '' },
        { new: true }
      ).select('teamId teamName zone tableNumber');
      if (team) results.push(team);
    }

    successResponse(res, 200, `${results.length} tables assigned`, { teams: results });
  } catch (error) { next(error); }
};

// Get venue map (all teams with table assignments)
exports.getVenueMap = async (req, res, next) => {
  try {
    const teams = await Team.find({ status: 'approved' })
      .select('teamId teamName zone tableNumber teamLead.name selectedProblem')
      .populate('selectedProblem', 'title')
      .sort({ zone: 1, tableNumber: 1 })
      .lean();

    // Group by zone
    const zones = {};
    teams.forEach(t => {
      const z = t.zone || 'Unassigned';
      if (!zones[z]) zones[z] = [];
      zones[z].push(t);
    });

    successResponse(res, 200, 'Venue map', { zones, teams });
  } catch (error) { next(error); }
};
