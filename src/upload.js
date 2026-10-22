const multer = require('multer');
const { HttpError } = require('./http');

// Pictures are read into memory and then saved in the database (see db.saveFile), not on disk,
// because the host's disk is wiped on every restart.
function makeUploader() {
  const fileFilter = (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new HttpError(400, 'Only image files are allowed'));
    }
    cb(null, true);
  };
  return multer({ storage: multer.memoryStorage(), fileFilter, limits: { fileSize: 8 * 1024 * 1024 } });
}

module.exports = { makeUploader };
