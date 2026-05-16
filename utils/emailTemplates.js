const getBaseTemplate = (content, eventName = 'TCE Hackathon') => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f4f7fa; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32px 24px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; }
    .header p { color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px; }
    .body { padding: 32px 24px; }
    .body h2 { color: #1a1a2e; font-size: 20px; margin: 0 0 16px; }
    .body p { color: #4a4a6a; font-size: 15px; line-height: 1.6; margin: 0 0 12px; }
    .credentials-box { background: #f8f9ff; border: 2px solid #667eea; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .credentials-box .label { color: #667eea; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 4px; font-weight: 600; }
    .credentials-box .value { color: #1a1a2e; font-size: 20px; font-weight: 700; margin: 0 0 16px; font-family: monospace; }
    .credentials-box .value:last-child { margin-bottom: 0; }
    .btn { display: inline-block; background: linear-gradient(135deg, #667eea, #764ba2); color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 16px 0; }
    .info-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px 16px; margin: 16px 0; border-radius: 0 8px 8px 0; }
    .info-box p { color: #856404; margin: 0; font-size: 13px; }
    .success-box { background: #d4edda; border-left: 4px solid #28a745; padding: 12px 16px; margin: 16px 0; border-radius: 0 8px 8px 0; }
    .success-box p { color: #155724; margin: 0; font-size: 13px; }
    .error-box { background: #f8d7da; border-left: 4px solid #dc3545; padding: 12px 16px; margin: 16px 0; border-radius: 0 8px 8px 0; }
    .error-box p { color: #721c24; margin: 0; font-size: 13px; }
    .footer { background: #f8f9fa; padding: 20px 24px; text-align: center; border-top: 1px solid #e9ecef; }
    .footer p { color: #6c757d; font-size: 12px; margin: 0; }
    .footer a { color: #667eea; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${eventName}</h1>
      <p>Hackathon Management Platform</p>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      <p>This is an automated email from ${eventName}.</p>
      <p>TCE College, Gadag | <a href="mailto:narnejaswanth73@gmail.com">Contact Support</a></p>
    </div>
  </div>
</body>
</html>`;
};

const teamCredentialsTemplate = ({ teamId, teamName, password, leadName, loginUrl }) => {
  const content = `
    <h2>Welcome to the Hackathon! 🎉</h2>
    <p>Hi <strong>${leadName}</strong>,</p>
    <p>Your team <strong>"${teamName}"</strong> has been registered for the hackathon. Here are your login credentials:</p>
    <div class="credentials-box">
      <p class="label">Team ID</p>
      <p class="value">${teamId}</p>
      <p class="label">Password</p>
      <p class="value">${password}</p>
    </div>
    <div class="info-box">
      <p>⚠️ You will be required to change your password on first login. Please share these credentials with all team members.</p>
    </div>
    <a href="${loginUrl || 'http://localhost:5173/team/login'}" class="btn">Login Now →</a>
    <p>If you have any issues, please contact the organizers.</p>
  `;
  return { subject: 'Welcome to TCE Hackathon — Your Login Details', html: getBaseTemplate(content) };
};

const teamApprovedTemplate = ({ teamName, teamId, leadName }) => {
  const content = `
    <h2>Team Approved ✅</h2>
    <p>Hi <strong>${leadName}</strong>,</p>
    <p>Great news! Your team <strong>"${teamName}"</strong> (${teamId}) has been approved for the hackathon.</p>
    <div class="success-box">
      <p>✅ You can now access all hackathon features including questions and project submission.</p>
    </div>
    <p>Good luck with the hackathon!</p>
  `;
  return { subject: `Team "${teamName}" Approved — TCE Hackathon`, html: getBaseTemplate(content) };
};

const teamRejectedTemplate = ({ teamName, teamId, leadName, reason }) => {
  const content = `
    <h2>Registration Update</h2>
    <p>Hi <strong>${leadName}</strong>,</p>
    <p>We regret to inform you that your team <strong>"${teamName}"</strong> (${teamId}) registration could not be approved.</p>
    ${reason ? `<div class="error-box"><p><strong>Reason:</strong> ${reason}</p></div>` : ''}
    <p>If you believe this is an error, please contact the organizers immediately.</p>
  `;
  return { subject: `Update on Team "${teamName}" Registration — TCE Hackathon`, html: getBaseTemplate(content) };
};

const passwordResetApprovedTemplate = ({ teamId, teamName, password, leadName }) => {
  const content = `
    <h2>Password Reset Approved 🔑</h2>
    <p>Hi <strong>${leadName}</strong>,</p>
    <p>Your password reset request for team <strong>"${teamName}"</strong> (${teamId}) has been approved. Here are your new credentials:</p>
    <div class="credentials-box">
      <p class="label">Team ID</p>
      <p class="value">${teamId}</p>
      <p class="label">New Password</p>
      <p class="value">${password}</p>
    </div>
    <div class="info-box">
      <p>⚠️ You will be required to change this password on your next login.</p>
    </div>
  `;
  return { subject: `Password Reset — Team ${teamId} — TCE Hackathon`, html: getBaseTemplate(content) };
};

const passwordResetDeniedTemplate = ({ teamId, teamName, leadName, reason }) => {
  const content = `
    <h2>Password Reset Request Denied</h2>
    <p>Hi <strong>${leadName}</strong>,</p>
    <p>Your password reset request for team <strong>"${teamName}"</strong> (${teamId}) has been denied.</p>
    ${reason ? `<div class="error-box"><p><strong>Reason:</strong> ${reason}</p></div>` : ''}
    <p>If you need further assistance, please contact the organizers directly.</p>
  `;
  return { subject: `Password Reset Denied — Team ${teamId} — TCE Hackathon`, html: getBaseTemplate(content) };
};

const submissionReceivedTemplate = ({ teamId, teamName, leadName, projectTitle, submittedAt }) => {
  const content = `
    <h2>Submission Received ✅</h2>
    <p>Hi <strong>${leadName}</strong>,</p>
    <p>Your project submission for team <strong>"${teamName}"</strong> (${teamId}) has been received successfully.</p>
    <div class="success-box">
      <p><strong>Project:</strong> ${projectTitle}</p>
      <p><strong>Submitted:</strong> ${new Date(submittedAt).toLocaleString()}</p>
    </div>
    <p>You can update your submission before the deadline.</p>
  `;
  return { subject: `Submission Received — Team ${teamId} — TCE Hackathon`, html: getBaseTemplate(content) };
};

const resultsPublishedTemplate = ({ teamName, teamId, leadName, rank, score }) => {
  const content = `
    <h2>Results Are Live! 🏆</h2>
    <p>Hi <strong>${leadName}</strong>,</p>
    <p>The results for the hackathon are now live!</p>
    <div class="credentials-box">
      <p class="label">Team</p>
      <p class="value">${teamName} (${teamId})</p>
      <p class="label">Rank</p>
      <p class="value">#${rank}</p>
      <p class="label">Score</p>
      <p class="value">${score}</p>
    </div>
    <p>Log in to your team dashboard to see the full breakdown.</p>
  `;
  return { subject: `Results Published — TCE Hackathon`, html: getBaseTemplate(content) };
};

const certificateReadyTemplate = ({ teamName, teamId, leadName, downloadUrl }) => {
  const content = `
    <h2>Your Certificate is Ready! 🎓</h2>
    <p>Hi <strong>${leadName}</strong>,</p>
    <p>The participation certificate for team <strong>"${teamName}"</strong> (${teamId}) is now ready for download.</p>
    <a href="${downloadUrl || 'http://localhost:5173/team/certificate'}" class="btn">Download Certificate →</a>
    <p>You can also download it from your team dashboard.</p>
  `;
  return { subject: `Certificate Ready — TCE Hackathon`, html: getBaseTemplate(content) };
};

const announcementEmailTemplate = ({ title, message, leadName }) => {
  const content = `
    <h2>📢 ${title}</h2>
    <p>Hi <strong>${leadName}</strong>,</p>
    <div style="background: #f8f9ff; padding: 16px; border-radius: 8px; margin: 16px 0;">
      ${message}
    </div>
    <p>Log in to your dashboard for more details.</p>
  `;
  return { subject: `${title} — TCE Hackathon`, html: getBaseTemplate(content) };
};

const customEmailTemplate = ({ subject, body, leadName }) => {
  const content = `
    <p>Hi <strong>${leadName || 'Team'}</strong>,</p>
    <div>${body}</div>
  `;
  return { subject, html: getBaseTemplate(content) };
};

const teamInviteTemplate = ({ inviteeName, teamName, teamId, invitedByName, acceptUrl, declineUrl }) => {
  const content = `
    <h2>You've Been Invited! 🎉</h2>
    <p>Hi <strong>${inviteeName}</strong>,</p>
    <p><strong>${invitedByName}</strong> has invited you to join their team <strong>"${teamName}"</strong> (${teamId}) for the TCE Hackathon!</p>
    <div class="info-box">
      <p>🏫 This is an exciting opportunity to participate in the TCE College Hackathon. Click the button below to accept or decline the invitation.</p>
    </div>
    <div style="text-align: center; margin: 24px 0;">
      <a href="${acceptUrl}" class="btn" style="margin-right: 12px;">✅ Accept Invitation</a>
    </div>
    <div style="text-align: center; margin: 12px 0;">
      <a href="${declineUrl}" style="color: #dc3545; text-decoration: none; font-size: 14px;">❌ Decline Invitation</a>
    </div>
    <p style="font-size: 13px; color: #888;">This invitation will expire in 7 days. If you did not expect this email, you can safely ignore it.</p>
  `;
  return { subject: `You're Invited to Join "${teamName}" — TCE Hackathon`, html: getBaseTemplate(content) };
};

module.exports = {
  teamCredentialsTemplate,
  teamApprovedTemplate,
  teamRejectedTemplate,
  passwordResetApprovedTemplate,
  passwordResetDeniedTemplate,
  submissionReceivedTemplate,
  resultsPublishedTemplate,
  certificateReadyTemplate,
  announcementEmailTemplate,
  customEmailTemplate,
  teamInviteTemplate,
};
