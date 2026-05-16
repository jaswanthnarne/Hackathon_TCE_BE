const PDFDocument = require('pdfkit');

const generateCertificate = (data) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0 });
      const buffers = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      const w = doc.page.width;
      const h = doc.page.height;

      // Background gradient
      doc.rect(0, 0, w, h).fill('#fefefe');
      
      // Border
      doc.lineWidth(3).strokeColor('#667eea').rect(20, 20, w - 40, h - 40).stroke();
      doc.lineWidth(1).strokeColor('#764ba2').rect(30, 30, w - 60, h - 60).stroke();

      // Corner decorations
      const cornerSize = 40;
      ['#667eea', '#764ba2'].forEach((color, idx) => {
        const offset = idx * 5;
        doc.fillColor(color).opacity(0.3);
        doc.circle(40 + offset, 40 + offset, cornerSize).fill();
        doc.circle(w - 40 - offset, 40 + offset, cornerSize).fill();
        doc.circle(40 + offset, h - 40 - offset, cornerSize).fill();
        doc.circle(w - 40 - offset, h - 40 - offset, cornerSize).fill();
      });
      doc.opacity(1);

      let y = 60;

      // Event name
      doc.fontSize(14).font('Helvetica').fillColor('#667eea').text(data.eventName || 'TCE Hackathon', 0, y, { align: 'center' });
      y += 30;

      // Certificate title
      doc.fontSize(36).font('Helvetica-Bold').fillColor('#1a1a2e').text('CERTIFICATE', 0, y, { align: 'center' });
      y += 45;
      doc.fontSize(16).font('Helvetica').fillColor('#667eea').text('OF PARTICIPATION', 0, y, { align: 'center' });
      y += 40;

      // Decorative line
      doc.moveTo(w / 2 - 100, y).lineTo(w / 2 + 100, y).lineWidth(2).strokeColor('#667eea').stroke();
      y += 25;

      // Body text
      doc.fontSize(14).font('Helvetica').fillColor('#4a4a6a').text('This is to certify that', 0, y, { align: 'center' });
      y += 30;

      // Participant name
      doc.fontSize(28).font('Helvetica-Bold').fillColor('#1a1a2e').text(data.participantName || 'Participant', 0, y, { align: 'center' });
      y += 40;

      // Team info
      doc.fontSize(14).font('Helvetica').fillColor('#4a4a6a')
        .text(`from Team "${data.teamName}" participated in`, 0, y, { align: 'center' });
      y += 25;

      doc.fontSize(14).font('Helvetica-Bold').fillColor('#667eea')
        .text(`${data.eventName || 'TCE Hackathon'}`, 0, y, { align: 'center' });
      y += 25;

      const dateStr = data.eventDate ? new Date(data.eventDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
      doc.fontSize(12).font('Helvetica').fillColor('#4a4a6a')
        .text(`held on ${dateStr} at ${data.venue || 'TCE College, Gadag'}`, 0, y, { align: 'center' });
      y += 30;

      // Award (if winner)
      if (data.awardTitle) {
        doc.fontSize(16).font('Helvetica-Bold').fillColor('#764ba2')
          .text(`and was awarded "${data.awardTitle}"`, 0, y, { align: 'center' });
        y += 35;
      }

      // Bottom section
      y = h - 100;
      doc.moveTo(100, y).lineTo(280, y).lineWidth(1).strokeColor('#999').stroke();
      doc.moveTo(w - 280, y).lineTo(w - 100, y).stroke();
      
      doc.fontSize(10).font('Helvetica').fillColor('#666');
      doc.text('Organizer', 100, y + 5, { width: 180, align: 'center' });
      doc.text('Date: ' + (dateStr || new Date().toLocaleDateString()), w - 280, y + 5, { width: 180, align: 'center' });

      doc.end();
    } catch (error) { reject(error); }
  });
};

module.exports = { generateCertificate };
