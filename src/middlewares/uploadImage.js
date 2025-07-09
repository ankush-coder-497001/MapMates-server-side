const Cloudinary = require('../config/cloudinary');
const multer = require('multer');
const { Readable } = require('stream');

const multerStorage = multer.memoryStorage();
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new Error('Not an image! Please upload only images.'), false);
  }
}
const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter

});

function bufferToStream(buffer) {
  const readable = new Readable();
  readable.push(buffer);
  readable.push(null);
  return readable;
}

const uploadImage = upload.single('image');
const uploadImageMiddleware = (req, res, next) => {
  uploadImage(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        message: err.message
      });
    }
    if (!req.file) {
      console.log('No file uploaded');
      next();
      return;
    }
    try {
      const result = await Cloudinary.uploader.upload_stream({
        resource_type: 'image',
        folder: 'citycycle'
      }, (error, result) => {
        if (error) {
          return res.status(500).json({
            message: 'Error uploading image',
            error: error.message
          });
        }
        req.imageUrl = result.secure_url;
        next();
      });
      bufferToStream(req.file.buffer).pipe(result);
    } catch (error) {
      return res.status(500).json({
        message: 'Error uploading image',
        error: error.message
      });
    }
  });
}
module.exports = uploadImageMiddleware;