const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Admin = require('../../models/Admin');
const { successResponse, errorResponse, AppError } = require('../../utils/apiResponse');
const { auditLog } = require('../../middleware/auditLogger');
const { sendEmail } = require('../../config/email');

// Admin Login
exports.login = async (req, res, next) => {
  try {
    const { email, password, rememberMe } = req.body;
    const admin = await Admin.findOne({ email }).select('+password');
    if (!admin) return errorResponse(res, 401, 'Invalid email or password');
    if (!admin.isActive) return errorResponse(res, 403, 'Account is deactivated');

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) return errorResponse(res, 401, 'Invalid email or password');

    const lastLogin = admin.lastLogin;
    admin.lastLogin = new Date();
    await admin.save();

    const expiresIn = rememberMe ? process.env.JWT_EXPIRE : process.env.ADMIN_JWT_EXPIRE;
    const token = jwt.sign({ id: admin._id, role: admin.role }, process.env.JWT_SECRET, { expiresIn });

    await auditLog(admin._id, 'ADMIN_LOGIN', {
      description: `Admin ${admin.email} logged in`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    successResponse(res, 200, 'Login successful', {
      token,
      admin: { id: admin._id, name: admin.name, email: admin.email, role: admin.role, lastLogin },
    });
  } catch (error) { next(error); }
};

// Admin Logout
exports.logout = async (req, res, next) => {
  try {
    await auditLog(req.admin._id, 'ADMIN_LOGOUT', {
      description: `Admin ${req.admin.email} logged out`,
      ipAddress: req.ip, userAgent: req.headers['user-agent'],
    });
    successResponse(res, 200, 'Logged out successfully');
  } catch (error) { next(error); }
};

// Forgot Password
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const admin = await Admin.findOne({ email });
    if (!admin) return successResponse(res, 200, 'If that email exists, a reset link has been sent.');

    const resetToken = crypto.randomBytes(32).toString('hex');
    admin.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    admin.passwordResetExpires = Date.now() + 30 * 60 * 1000;
    await admin.save();

    const resetUrl = `${process.env.FRONTEND_URL}/console/admin/reset-password/${resetToken}`;
    await sendEmail({
      to: admin.email,
      subject: 'Password Reset — TCE Hackathon Admin',
      html: `<p>Reset your password: <a href="${resetUrl}">${resetUrl}</a></p><p>Valid for 30 minutes.</p>`,
    });

    successResponse(res, 200, 'If that email exists, a reset link has been sent.');
  } catch (error) { next(error); }
};

// Reset Password
exports.resetPassword = async (req, res, next) => {
  try {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const admin = await Admin.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    }).select('+password');

    if (!admin) return errorResponse(res, 400, 'Invalid or expired reset token');

    admin.password = req.body.password;
    admin.passwordResetToken = undefined;
    admin.passwordResetExpires = undefined;
    await admin.save();

    successResponse(res, 200, 'Password reset successful. Please login with your new password.');
  } catch (error) { next(error); }
};

// Get Current Admin
exports.getMe = async (req, res, next) => {
  try {
    successResponse(res, 200, 'Admin profile', {
      admin: { id: req.admin._id, name: req.admin.name, email: req.admin.email, role: req.admin.role },
    });
  } catch (error) { next(error); }
};
