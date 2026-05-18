const jwt = require('jsonwebtoken');
const Admin = require('../../models/Admin');
const { successResponse, errorResponse } = require('../../utils/apiResponse');

// Staff login (volunteer, mentor, judge) - by staffId + password
exports.staffLogin = async (req, res, next) => {
  try {
    const { staffId, password, role } = req.body;
    if (!staffId || !password || !role) {
      return errorResponse(res, 400, 'Staff ID, password, and role are required');
    }

    const validRoles = ['volunteer', 'mentor', 'judge'];
    if (!validRoles.includes(role)) {
      return errorResponse(res, 400, 'Invalid role. Must be volunteer, mentor, or judge');
    }

    const staff = await Admin.findOne({ staffId, role }).select('+password');
    if (!staff) return errorResponse(res, 401, 'Invalid staff ID or role');
    if (!staff.isActive) return errorResponse(res, 403, 'Account is inactive');

    const isMatch = await staff.comparePassword(password);
    if (!isMatch) return errorResponse(res, 401, 'Invalid credentials');

    staff.lastLogin = new Date();
    await staff.save();

    const token = jwt.sign(
      { id: staff._id, role: staff.role, staffId: staff.staffId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    successResponse(res, 200, 'Login successful', {
      token,
      staff: {
        id: staff._id,
        name: staff.name,
        email: staff.email,
        staffId: staff.staffId,
        role: staff.role,
        specialization: staff.specialization,
        dutyArea: staff.dutyArea,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get current staff profile
exports.getMe = async (req, res, next) => {
  try {
    const staff = await Admin.findById(req.admin._id);
    if (!staff) return errorResponse(res, 404, 'Staff not found');

    successResponse(res, 200, 'Staff profile', {
      staff: {
        id: staff._id,
        name: staff.name,
        email: staff.email,
        staffId: staff.staffId,
        role: staff.role,
        specialization: staff.specialization,
        dutyArea: staff.dutyArea,
        phone: staff.phone,
        assignedTeams: staff.assignedTeams,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Admin: create staff account (volunteer/mentor/judge)
exports.createStaffAccount = async (req, res, next) => {
  try {
    const { name, email, staffId, password, role, specialization, dutyArea, phone } = req.body;

    const validRoles = ['volunteer', 'mentor', 'judge'];
    if (!validRoles.includes(role)) {
      return errorResponse(res, 400, 'Role must be volunteer, mentor, or judge');
    }

    // Check for existing staffId
    const existingStaff = await Admin.findOne({ staffId });
    if (existingStaff) return errorResponse(res, 400, 'Staff ID already in use');

    // Check for existing email only if email is provided
    if (email) {
      const existingEmail = await Admin.findOne({ email });
      if (existingEmail) return errorResponse(res, 400, 'Email already in use');
    }

    const staffData = {
      name,
      staffId,
      password: password || 'hackathon2026',
      role,
      specialization: specialization || '',
      dutyArea: dutyArea || '',
      phone: phone || '',
    };
    if (email) staffData.email = email;

    const staff = await Admin.create(staffData);

    successResponse(res, 201, `${role} account created successfully`, {
      staff: { id: staff._id, name: staff.name, staffId: staff.staffId, role: staff.role },
    });
  } catch (error) {
    next(error);
  }
};

// Admin: list all staff by role
exports.listStaff = async (req, res, next) => {
  try {
    const { role } = req.query;
    const filter = {};
    if (role) filter.role = role;
    else filter.role = { $in: ['volunteer', 'mentor', 'judge'] };

    const staff = await Admin.find(filter).select('-passwordResetToken -passwordResetExpires').sort({ role: 1, name: 1 }).lean();
    successResponse(res, 200, 'Staff list', { staff });
  } catch (error) {
    next(error);
  }
};

// Admin: delete staff account
exports.deleteStaff = async (req, res, next) => {
  try {
    const staff = await Admin.findById(req.params.id);
    if (!staff) return errorResponse(res, 404, 'Staff not found');
    if (['superadmin', 'admin'].includes(staff.role)) {
      return errorResponse(res, 403, 'Cannot delete admin accounts from this endpoint');
    }
    await Admin.findByIdAndDelete(req.params.id);
    successResponse(res, 200, 'Staff account deleted');
  } catch (error) {
    next(error);
  }
};

// Admin: assign teams to judge
exports.assignTeamsToJudge = async (req, res, next) => {
  try {
    const { judgeId, teamIds } = req.body;
    const judge = await Admin.findById(judgeId);
    if (!judge || judge.role !== 'judge') return errorResponse(res, 404, 'Judge not found');

    judge.assignedTeams = teamIds;
    await judge.save();

    successResponse(res, 200, 'Teams assigned to judge', { assignedTeams: judge.assignedTeams });
  } catch (error) {
    next(error);
  }
};
