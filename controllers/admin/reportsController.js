const Team = require('../../models/Team');
const Result = require('../../models/Result');
const Submission = require('../../models/Submission');
const { successResponse } = require('../../utils/apiResponse');
const { createTeamExport, createParticipantExport, createScoreExport } = require('../../utils/excelExport');
const { generateReportPDF } = require('../../utils/pdfGenerator');

exports.teamsReport = async (req, res, next) => {
  try {
    const { format = 'xlsx' } = req.query;
    const teams = await Team.find({}).lean();
    if (format === 'pdf') {
      const headers = ['Team ID', 'Name', 'Lead', 'College', 'Members', 'Status'];
      const rows = teams.map(t => [t.teamId, t.teamName, t.teamLead?.name, t.teamLead?.college, t.members?.length, t.status]);
      const pdf = await generateReportPDF('Teams Report', headers, rows);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=teams_report.pdf');
      return res.send(pdf);
    }
    const workbook = await createTeamExport(teams);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=teams_report.xlsx');
    await workbook.xlsx.write(res); res.end();
  } catch (error) { next(error); }
};

exports.participantsReport = async (req, res, next) => {
  try {
    const teams = await Team.find({}).lean();
    const workbook = await createParticipantExport(teams);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=participants_report.xlsx');
    await workbook.xlsx.write(res); res.end();
  } catch (error) { next(error); }
};

exports.scoresReport = async (req, res, next) => {
  try {
    const results = await Result.find({}).populate('teamId', 'teamId teamName teamLead').sort({ rank: 1 }).lean();
    const workbook = await createScoreExport(results);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=scores_report.xlsx');
    await workbook.xlsx.write(res); res.end();
  } catch (error) { next(error); }
};

exports.submissionsReport = async (req, res, next) => {
  try {
    const submissions = await Submission.find({}).populate('teamId', 'teamId teamName teamLead').lean();
    successResponse(res, 200, 'Submissions report', { submissions });
  } catch (error) { next(error); }
};

exports.collegeReport = async (req, res, next) => {
  try {
    const data = await Team.aggregate([{ $group: { _id: '$teamLead.college', teams: { $sum: 1 }, participants: { $sum: { $size: '$members' } } } }, { $sort: { teams: -1 } }]);
    successResponse(res, 200, 'College-wise report', { data });
  } catch (error) { next(error); }
};
