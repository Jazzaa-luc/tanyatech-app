const multer = require('multer');
const path = require('path');
const { v4: uuid } = require('uuid');

function makeUploader(subfolder) {
  const storage = multer.diskStorage({
    destination: path.join(__dirname, '..', 'uploads', subfolder),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
      cb(null, uuid() + ext);
    }
  });

  const fileFilter = (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  };

  return multer({ storage, fileFilter, limits: { fileSize: 8 * 1024 * 1024 } });
}

module.exports = { makeUploader };
