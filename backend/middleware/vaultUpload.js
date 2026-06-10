import multer from 'multer';
import { isAllowedUploadMimeType } from '../utils/schedulingUploads.js';
import { VAULT_MAX_UPLOAD_BYTES } from '../utils/vaultUploads.js';

function fileFilter(_req, file, cb) {
  if (!isAllowedUploadMimeType(file.mimetype)) {
    cb(new Error('Unsupported file type. Allowed: PDF, Word, text, and images.'));
    return;
  }
  cb(null, true);
}

export const vaultUploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: VAULT_MAX_UPLOAD_BYTES },
  fileFilter,
}).single('file');
