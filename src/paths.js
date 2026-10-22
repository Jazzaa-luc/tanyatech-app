const path = require('path');

// Where the local (development) database lives, and where an old db.json / uploads folder
// would be found so they can be imported into the database on the first start.
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const UPLOADS_DIR = process.env.DATA_DIR
  ? path.join(process.env.DATA_DIR, 'uploads')
  : path.join(__dirname, '..', 'uploads');

module.exports = { DATA_DIR, UPLOADS_DIR };
