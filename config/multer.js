const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('./cloudinary');

const createCloudinaryStorage = (folder, allowedFormats) => {
  return new CloudinaryStorage({
    cloudinary,
    params: {
      folder: `tce-hackathon/${folder}`,
      allowed_formats: allowedFormats,
      resource_type: 'auto',
    },
  });
};

// For project submissions (zip, pdf, ppt, doc)
const submissionUpload = multer({
  storage: createCloudinaryStorage('submissions', ['pdf', 'zip', 'ppt', 'pptx', 'doc', 'docx']),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/zip',
      'application/x-zip-compressed',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: PDF, ZIP, PPT, PPTX, DOC, DOCX'), false);
    }
  },
});

// For images (logo, banner)
const imageUpload = multer({
  storage: createCloudinaryStorage('images', ['jpg', 'jpeg', 'png', 'svg', 'webp']),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: JPG, PNG, SVG, WEBP'), false);
    }
  },
});

// For Excel imports
const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: XLS, XLSX, CSV'), false);
    }
  },
});

module.exports = { submissionUpload, imageUpload, excelUpload };
