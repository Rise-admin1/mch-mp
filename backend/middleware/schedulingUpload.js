import multer from 'multer';
import path from 'path';
import {
  ALLOWED_UPLOAD_MIME_TYPES,
  MAX_UPLOAD_BYTES,
} from '../utils/schedulingUploads.js';

function fileFilter(_req, file, cb) {
  if (!ALLOWED_UPLOAD_MIME_TYPES.has(file.mimetype)) {
    cb(new Error('Unsupported file type. Allowed: PDF, Word, text, and images.'));
    return;
  }
  cb(null, true);
}

export const schedulingUploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter,
}).single('file');
