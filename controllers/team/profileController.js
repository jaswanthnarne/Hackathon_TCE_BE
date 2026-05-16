const Team = require('../../models/Team');
const { successResponse } = require('../../utils/apiResponse');

exports.getProfile = async (req, res, next) => {
  try {
    const team = await Team.findById(req.team._id).lean();
    successResponse(res, 200, 'Profile fetched', { team });
  } catch (error) { next(error); }
};

exports.getMembers = async (req, res, next) => {
  try {
    const team = await Team.findById(req.team._id).select('members').lean();
    successResponse(res, 200, 'Members fetched', { members: team.members });
  } catch (error) { next(error); }
};
