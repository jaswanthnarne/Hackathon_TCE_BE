const ExcelJS = require('exceljs');

const createTeamExport = async (teams) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'TCE Hackathon';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Teams');
  
  sheet.columns = [
    { header: 'Team ID', key: 'teamId', width: 12 },
    { header: 'Team Name', key: 'teamName', width: 25 },
    { header: 'Lead Name', key: 'leadName', width: 20 },
    { header: 'Lead Email', key: 'leadEmail', width: 30 },
    { header: 'Lead Phone', key: 'leadPhone', width: 15 },
    { header: 'College', key: 'college', width: 25 },
    { header: 'Members Count', key: 'membersCount', width: 15 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Created At', key: 'createdAt', width: 20 },
    { header: 'Last Login', key: 'lastLogin', width: 20 },
  ];

  // Style header row
  sheet.getRow(1).font = { bold: true, size: 12 };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF667EEA' },
  };
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  teams.forEach((team) => {
    sheet.addRow({
      teamId: team.teamId,
      teamName: team.teamName,
      leadName: team.teamLead?.name || '',
      leadEmail: team.teamLead?.email || '',
      leadPhone: team.teamLead?.phone || '',
      college: team.teamLead?.college || '',
      membersCount: team.members?.length || 0,
      status: team.status,
      createdAt: team.createdAt ? new Date(team.createdAt).toLocaleDateString() : '',
      lastLogin: team.lastLogin ? new Date(team.lastLogin).toLocaleDateString() : 'Never',
    });
  });

  return workbook;
};

const createParticipantExport = async (teams) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Participants');

  sheet.columns = [
    { header: 'Team ID', key: 'teamId', width: 12 },
    { header: 'Team Name', key: 'teamName', width: 25 },
    { header: 'Name', key: 'name', width: 20 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Phone', key: 'phone', width: 15 },
    { header: 'College', key: 'college', width: 25 },
    { header: 'Year', key: 'year', width: 10 },
    { header: 'Branch', key: 'branch', width: 15 },
    { header: 'Is Lead', key: 'isLead', width: 10 },
  ];

  sheet.getRow(1).font = { bold: true, size: 12 };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF667EEA' } };
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  teams.forEach((team) => {
    (team.members || []).forEach((member) => {
      sheet.addRow({
        teamId: team.teamId,
        teamName: team.teamName,
        name: member.name,
        email: member.email,
        phone: member.phone || '',
        college: member.college || '',
        year: member.year || '',
        branch: member.branch || '',
        isLead: member.isLead ? 'Yes' : 'No',
      });
    });
  });

  return workbook;
};

const createScoreExport = async (results) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Scores');

  sheet.columns = [
    { header: 'Rank', key: 'rank', width: 8 },
    { header: 'Team ID', key: 'teamId', width: 12 },
    { header: 'Team Name', key: 'teamName', width: 25 },
    { header: 'College', key: 'college', width: 25 },
    { header: 'Total Score', key: 'totalScore', width: 12 },
    { header: 'Award', key: 'awardTitle', width: 20 },
    { header: 'Is Winner', key: 'isWinner', width: 10 },
  ];

  sheet.getRow(1).font = { bold: true, size: 12 };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF667EEA' } };
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  results.forEach((result) => {
    sheet.addRow({
      rank: result.rank || '-',
      teamId: result.teamId?.teamId || '',
      teamName: result.teamId?.teamName || '',
      college: result.teamId?.teamLead?.college || '',
      totalScore: result.totalScore,
      awardTitle: result.awardTitle || '',
      isWinner: result.isWinner ? 'Yes' : 'No',
    });
  });

  return workbook;
};

const createQuestionExport = async (questions) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Questions');

  sheet.columns = [
    { header: '#', key: 'index', width: 5 },
    { header: 'Question', key: 'questionText', width: 50 },
    { header: 'Type', key: 'questionType', width: 15 },
    { header: 'Category', key: 'category', width: 15 },
    { header: 'Difficulty', key: 'difficulty', width: 12 },
    { header: 'Round', key: 'round', width: 10 },
    { header: 'Marks', key: 'marks', width: 8 },
    { header: 'Negative Marks', key: 'negativeMarks', width: 15 },
    { header: 'Correct Answer', key: 'correctAnswer', width: 20 },
    { header: 'Active', key: 'isActive', width: 8 },
  ];

  sheet.getRow(1).font = { bold: true, size: 12 };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF667EEA' } };
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  questions.forEach((q, i) => {
    sheet.addRow({
      index: i + 1,
      questionText: q.questionText,
      questionType: q.questionType,
      category: q.category,
      difficulty: q.difficulty,
      round: q.round,
      marks: q.marks,
      negativeMarks: q.negativeMarks,
      correctAnswer: typeof q.correctAnswer === 'object' ? JSON.stringify(q.correctAnswer) : q.correctAnswer || '',
      isActive: q.isActive ? 'Yes' : 'No',
    });
  });

  return workbook;
};

const parseQuestionImport = async (buffer) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.getWorksheet(1);
  const questions = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header
    const q = {
      questionText: row.getCell(1).value?.toString() || '',
      questionType: row.getCell(2).value?.toString() || 'mcq-single',
      category: row.getCell(3).value?.toString() || 'General',
      difficulty: row.getCell(4).value?.toString() || 'Medium',
      round: row.getCell(5).value?.toString() || 'Both',
      marks: parseInt(row.getCell(6).value) || 1,
      negativeMarks: parseInt(row.getCell(7).value) || 0,
      correctAnswer: row.getCell(8).value?.toString() || '',
    };
    if (q.questionText) questions.push(q);
  });

  return questions;
};

module.exports = {
  createTeamExport,
  createParticipantExport,
  createScoreExport,
  createQuestionExport,
  parseQuestionImport,
};
