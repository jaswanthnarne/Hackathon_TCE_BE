const Result = require('../../models/Result');
const Team = require('../../models/Team');
const HackathonConfig = require('../../models/HackathonConfig');
const { generateCertificate } = require('../../utils/certificateGenerator');
const { sendEmail } = require('../../config/email');
const { certificateReadyTemplate } = require('../../utils/emailTemplates');
const EmailLog = require('../../models/EmailLog');
const cloudinary = require('../../config/cloudinary');
const { successResponse, errorResponse } = require('../../utils/apiResponse');
const { auditLog } = require('../../middleware/auditLogger');
const archiver = require('archiver');

exports.generateAllCerts = async (req, res, next) => {
  try {
    const teams = await Team.find({ status: 'approved' }).lean();
    const config = await HackathonConfig.findOne().lean();
    let generated = 0;

    for (const team of teams) {
      for (const member of team.members) {
        const result = await Result.findOne({ teamId: team._id });
        const pdfBuffer = await generateCertificate({
          participantName: member.name, teamName: team.teamName,
          eventName: config?.name || 'TCE Hackathon',
          eventDate: config?.startDate, venue: config?.venue?.collegeName,
          awardTitle: result?.awardTitle || '',
        });

        const uploadResult = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: 'tce-hackathon/certificates', resource_type: 'raw', public_id: `cert_${team.teamId}_${member.name.replace(/\s+/g, '_')}` },
            (err, result) => err ? reject(err) : resolve(result)
          );
          stream.end(pdfBuffer);
        });

        if (result) { result.certificateUrl = uploadResult.secure_url; result.certificateGeneratedAt = new Date(); await result.save(); }
        generated++;
      }
    }

    await auditLog(req.admin._id, 'GENERATE_CERTIFICATES', {
      description: `Generated ${generated} certificates`,
      ipAddress: req.ip, userAgent: req.headers['user-agent'],
    });
    successResponse(res, 200, `${generated} certificates generated`);
  } catch (error) { next(error); }
};

exports.generateWinnerCerts = async (req, res, next) => {
  try {
    const results = await Result.find({ isWinner: true }).populate('teamId').lean();
    const config = await HackathonConfig.findOne().lean();
    let generated = 0;

    for (const result of results) {
      if (!result.teamId) continue;
      for (const member of result.teamId.members) {
        const pdfBuffer = await generateCertificate({
          participantName: member.name, teamName: result.teamId.teamName,
          eventName: config?.name, eventDate: config?.startDate,
          venue: config?.venue?.collegeName, awardTitle: result.awardTitle,
        });

        const uploadResult = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: 'tce-hackathon/certificates', resource_type: 'raw', public_id: `winner_${result.teamId.teamId}_${member.name.replace(/\s+/g, '_')}` },
            (err, res) => err ? reject(err) : resolve(res)
          );
          stream.end(pdfBuffer);
        });
        generated++;
      }
    }

    successResponse(res, 200, `${generated} winner certificates generated`);
  } catch (error) { next(error); }
};

exports.emailAllCerts = async (req, res, next) => {
  try {
    const results = await Result.find({ certificateUrl: { $ne: '' } }).populate('teamId').lean();
    let sent = 0;
    for (const result of results) {
      if (!result.teamId?.teamLead?.email) continue;
      const emailData = certificateReadyTemplate({
        teamName: result.teamId.teamName, teamId: result.teamId.teamId,
        leadName: result.teamId.teamLead.name, downloadUrl: result.certificateUrl,
      });
      const emailResult = await sendEmail({ to: result.teamId.teamLead.email, subject: emailData.subject, html: emailData.html });
      await EmailLog.create({ to: [result.teamId.teamLead.email], subject: emailData.subject, type: 'certificate', status: emailResult.success ? 'sent' : 'failed', sentBy: req.admin._id.toString() });
      if (emailResult.success) sent++;
    }
    await auditLog(req.admin._id, 'EMAIL_CERTIFICATES', { description: `Emailed ${sent} certificates`, ipAddress: req.ip });
    successResponse(res, 200, `${sent} certificate emails sent`);
  } catch (error) { next(error); }
};

exports.downloadCert = async (req, res, next) => {
  try {
    const result = await Result.findOne({ teamId: req.params.teamId }).lean();
    if (!result?.certificateUrl) return errorResponse(res, 404, 'Certificate not found');
    successResponse(res, 200, 'Certificate URL', { url: result.certificateUrl });
  } catch (error) { next(error); }
};

exports.downloadBulkCerts = async (req, res, next) => {
  try {
    const results = await Result.find({ certificateUrl: { $ne: '' } }).populate('teamId', 'teamId teamName').lean();
    successResponse(res, 200, 'Certificate URLs', { certificates: results.map(r => ({ teamId: r.teamId?.teamId, teamName: r.teamId?.teamName, url: r.certificateUrl })) });
  } catch (error) { next(error); }
};
