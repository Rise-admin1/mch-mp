import express from 'express';
import { getMetaTags, getReports, getContributeMetaTags } from '../controller/meta-controller.js';
import { createTask, updateTask, deleteTask, getTasks } from '../controller/task-controller.js';
import {
  deleteVaultDocument,
  getVaultDocumentViewUrl,
  getVaultDocuments,
  uploadVaultDocument,
} from '../controller/vault-controller.js';
import { vaultLogin } from '../controller/vault-auth-controller.js';
import { schedulingUploadMiddleware } from '../middleware/schedulingUpload.js';

const router = express.Router();

router.get('/contribute', getContributeMetaTags);
router.get('/reports', getReports);
router.post('/create-task', createTask);
router.post('/update-task', updateTask);
router.delete('/delete-task', deleteTask);
router.get('/get-tasks', getTasks);
router.get('/news/:id', getMetaTags);

router.post('/vault/auth/login', vaultLogin);

router.get('/vault/documents', getVaultDocuments);
router.get('/vault/documents/:id/view-url', getVaultDocumentViewUrl);
router.post('/vault/documents', (req, res, next) => {
  schedulingUploadMiddleware(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File is too large. Maximum size is 10 MB.',
        });
      }
      return res.status(400).json({
        success: false,
        message: err.message || 'Upload failed',
      });
    }
    return uploadVaultDocument(req, res, next);
  });
});
router.delete('/vault/documents', deleteVaultDocument);

export default router;