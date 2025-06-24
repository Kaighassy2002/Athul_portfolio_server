const multer = require('multer');
const path = require('path');

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, './uploads/logos'); // Ensure this folder exists
  },
  filename: (req, file, callback) => {
    const ext = path.extname(file.originalname); // Get file extension
    const baseName = path.basename(file.originalname, ext);
    const uniqueName = `image-${Date.now()}-${baseName}${ext}`;
    callback(null, uniqueName);
  }
});

// Multer configuration
const upload = multer({ storage });

module.exports = upload; 
