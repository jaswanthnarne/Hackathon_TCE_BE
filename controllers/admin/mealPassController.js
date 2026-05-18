const MealPass = require('../../models/MealPass');
const Redemption = require('../../models/Redemption');
const Team = require('../../models/Team');
const jwt = require('jsonwebtoken');
const { successResponse, errorResponse } = require('../../utils/apiResponse');

// === ADMIN: CRUD for meal passes ===

exports.createPass = async (req, res, next) => {
  try {
    const { name, description, category, activeFrom, activeUntil } = req.body;
    const pass = await MealPass.create({
      name, description, category, activeFrom, activeUntil, createdBy: req.admin._id,
    });
    successResponse(res, 201, 'Meal pass created', { pass });
  } catch (error) { next(error); }
};

exports.listPasses = async (req, res, next) => {
  try {
    const passes = await MealPass.find().sort({ activeFrom: 1 }).lean();
    // Attach redemption counts
    for (const pass of passes) {
      pass.redemptionCount = await Redemption.countDocuments({ mealPass: pass._id });
    }
    successResponse(res, 200, 'Meal passes', { passes });
  } catch (error) { next(error); }
};

exports.updatePass = async (req, res, next) => {
  try {
    const pass = await MealPass.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!pass) return errorResponse(res, 404, 'Pass not found');
    successResponse(res, 200, 'Pass updated', { pass });
  } catch (error) { next(error); }
};

exports.deletePass = async (req, res, next) => {
  try {
    await MealPass.findByIdAndDelete(req.params.id);
    await Redemption.deleteMany({ mealPass: req.params.id });
    successResponse(res, 200, 'Pass deleted');
  } catch (error) { next(error); }
};

exports.getRedemptionStats = async (req, res, next) => {
  try {
    const passes = await MealPass.find().lean();
    const totalTeams = await Team.countDocuments({ status: 'approved' });
    const stats = [];
    for (const pass of passes) {
      const redeemed = await Redemption.countDocuments({ mealPass: pass._id });
      stats.push({
        passId: pass._id, name: pass.name, category: pass.category,
        activeFrom: pass.activeFrom, activeUntil: pass.activeUntil,
        totalTeams, redeemed, pending: totalTeams - redeemed,
      });
    }
    successResponse(res, 200, 'Redemption stats', { stats });
  } catch (error) { next(error); }
};

// === VOLUNTEER: Redeem coupons ===

exports.redeemByQR = async (req, res, next) => {
  try {
    const { qrData } = req.body;
    // Decode the JWT from QR
    let decoded;
    try {
      decoded = jwt.verify(qrData, process.env.JWT_SECRET);
    } catch {
      return errorResponse(res, 400, 'Invalid or expired QR code');
    }

    const { teamId, passId } = decoded;
    if (!teamId || !passId) return errorResponse(res, 400, 'Invalid QR data');

    const team = await Team.findOne({ teamId });
    if (!team) return errorResponse(res, 404, 'Team not found');

    const pass = await MealPass.findById(passId);
    if (!pass) return errorResponse(res, 404, 'Meal pass not found');

    // Check if within active window
    const now = new Date();
    if (now < pass.activeFrom || now > pass.activeUntil) {
      return errorResponse(res, 400, 'This meal pass is not currently active');
    }

    // Try to create redemption (compound unique index prevents duplicates)
    try {
      const redemption = await Redemption.create({
        mealPass: pass._id, team: team._id,
        redeemedBy: req.admin._id, redeemedByModel: 'Admin', method: 'qr_scan',
      });
      successResponse(res, 200, `✅ ${pass.name} redeemed for ${team.teamName}`, {
        redemption, teamName: team.teamName, teamId: team.teamId, passName: pass.name,
      });
    } catch (err) {
      if (err.code === 11000) {
        return errorResponse(res, 409, `⚠️ Already redeemed! ${team.teamName} has already used ${pass.name}`);
      }
      throw err;
    }
  } catch (error) { next(error); }
};

exports.redeemByTeamId = async (req, res, next) => {
  try {
    const { teamId, passId } = req.body;
    const team = await Team.findOne({ teamId });
    if (!team) return errorResponse(res, 404, 'Team not found');

    const pass = await MealPass.findById(passId);
    if (!pass) return errorResponse(res, 404, 'Meal pass not found');

    const now = new Date();
    if (now < pass.activeFrom || now > pass.activeUntil) {
      return errorResponse(res, 400, 'This meal pass is not currently active');
    }

    try {
      const redemption = await Redemption.create({
        mealPass: pass._id, team: team._id,
        redeemedBy: req.admin._id, redeemedByModel: 'Admin', method: 'manual_entry',
      });
      successResponse(res, 200, `✅ ${pass.name} redeemed for ${team.teamName}`, {
        redemption, teamName: team.teamName, teamId: team.teamId, passName: pass.name,
      });
    } catch (err) {
      if (err.code === 11000) {
        return errorResponse(res, 409, `⚠️ Already redeemed! ${team.teamName} has already used ${pass.name}`);
      }
      throw err;
    }
  } catch (error) { next(error); }
};

// === TEAM: Get wallet (active passes + redemption status) ===

exports.getTeamWallet = async (req, res, next) => {
  try {
    const now = new Date();
    const passes = await MealPass.find({ isActive: true }).lean();
    const redemptions = await Redemption.find({ team: req.team._id }).lean();
    const redeemedPassIds = new Set(redemptions.map(r => r.mealPass.toString()));

    const wallet = passes.map(pass => ({
      ...pass,
      isCurrentlyActive: now >= pass.activeFrom && now <= pass.activeUntil,
      isRedeemed: redeemedPassIds.has(pass._id.toString()),
      // Generate secure QR token for this team+pass combo
      qrToken: jwt.sign(
        { teamId: req.team.teamId, passId: pass._id.toString() },
        process.env.JWT_SECRET,
        { expiresIn: '12h' }
      ),
    }));

    successResponse(res, 200, 'Wallet', { wallet });
  } catch (error) { next(error); }
};

// Team: self-redeem via tap
exports.tapRedeem = async (req, res, next) => {
  try {
    const { passId } = req.body;
    const pass = await MealPass.findById(passId);
    if (!pass) return errorResponse(res, 404, 'Meal pass not found');

    const now = new Date();
    if (now < pass.activeFrom || now > pass.activeUntil) {
      return errorResponse(res, 400, 'This meal pass is not currently active');
    }

    try {
      await Redemption.create({
        mealPass: pass._id, team: req.team._id,
        redeemedBy: req.team._id, redeemedByModel: 'Team', method: 'tap_redeem',
      });
      successResponse(res, 200, `${pass.name} redeemed!`);
    } catch (err) {
      if (err.code === 11000) return errorResponse(res, 409, 'Already redeemed');
      throw err;
    }
  } catch (error) { next(error); }
};
