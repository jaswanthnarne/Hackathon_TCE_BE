const PDFDocument = require('pdfkit');

const generateReportPDF = (title, headers, rows) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
      const buffers = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      doc.fontSize(20).font('Helvetica-Bold').fillColor('#667eea').text(title, { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica').fillColor('#666').text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
      doc.moveDown(1);

      const pageWidth = doc.page.width - 80;
      const colWidth = pageWidth / headers.length;
      const startX = 40;
      let y = doc.y;

      doc.fillColor('#667eea').rect(startX, y, pageWidth, 25).fill();
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9);
      headers.forEach((header, i) => {
        doc.text(header, startX + i * colWidth + 5, y + 7, { width: colWidth - 10, ellipsis: true });
      });
      y += 25;

      doc.font('Helvetica').fontSize(8).fillColor('#333333');
      rows.forEach((row, rowIndex) => {
        if (y > doc.page.height - 60) { doc.addPage(); y = 40; }
        if (rowIndex % 2 === 0) { doc.fillColor('#f8f9ff').rect(startX, y, pageWidth, 20).fill(); }
        doc.fillColor('#333333');
        row.forEach((cell, i) => {
          doc.text(String(cell || ''), startX + i * colWidth + 5, y + 5, { width: colWidth - 10, ellipsis: true });
        });
        y += 20;
      });

      doc.end();
    } catch (error) { reject(error); }
  });
};

module.exports = { generateReportPDF };
