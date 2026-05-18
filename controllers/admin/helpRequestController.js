const HelpRequest = require('../../models/HelpRequest');
const { successResponse, errorResponse } = require('../../utils/apiResponse');

// === TEAM: Create & view help requests ===

exports.createRequest = async (req, res, next) => {
  try {
    const { category, description } = req.body;
    if (!category || !description) return errorResponse(res, 400, 'Category and description are required');

    // Prevent duplicate open requests
    const existing = await HelpRequest.findOne({ team: req.team._id, status: { $in: ['open', 'claimed'] } });
    if (existing) return errorResponse(res, 400, 'You already have an active help request. Please wait for it to be resolved.');

    const request = await HelpRequest.create({
      team: req.team._id,
      teamId: req.team.teamId,
      teamName: req.team.teamName,
      tableNumber: req.team.tableNumber || '',
      category,
      description,
    });

    successResponse(res, 201, 'Help request submitted! A volunteer or mentor will come to you.', { request });
  } catch (error) { next(error); }
};

exports.getMyRequests = async (req, res, next) => {
  try {
    const requests = await HelpRequest.find({ team: req.team._id }).sort({ createdAt: -1 }).limit(10).lean();
    successResponse(res, 200, 'Your help requests', { requests });
  } catch (error) { next(error); }
};

// === VOLUNTEER/MENTOR: Queue management ===

exports.listRequests = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const requests = await HelpRequest.find(filter).sort({ status: 1, createdAt: 1 }).lean();
    successResponse(res, 200, 'Help requests', { requests });
  } catch (error) { next(error); }
};

exports.claimRequest = async (req, res, next) => {
  try {
    const request = await HelpRequest.findById(req.params.id);
    if (!request) return errorResponse(res, 404, 'Request not found');
    if (request.status !== 'open') return errorResponse(res, 400, 'Request is no longer open');

    request.status = 'claimed';
    request.claimedBy = req.admin._id;
    request.claimedByName = req.admin.name;
    request.claimedAt = new Date();
    await request.save();

    successResponse(res, 200, `Claimed! Head to ${request.tableNumber || 'the team'}.`, { request });
  } catch (error) { next(error); }
};

exports.resolveRequest = async (req, res, next) => {
  try {
    const request = await HelpRequest.findById(req.params.id);
    if (!request) return errorResponse(res, 404, 'Request not found');

    request.status = 'resolved';
    request.resolvedAt = new Date();
    request.resolutionNote = req.body.note || '';
    await request.save();

    successResponse(res, 200, 'Request resolved', { request });
  } catch (error) { next(error); }
};

exports.getMyClaimedRequests = async (req, res, next) => {
  try {
    const requests = await HelpRequest.find({ claimedBy: req.admin._id, status: 'claimed' }).sort({ claimedAt: -1 }).lean();
    successResponse(res, 200, 'My claimed requests', { requests });
  } catch (error) { next(error); }
};
