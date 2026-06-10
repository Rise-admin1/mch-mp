import express from 'express';
import { getMetaTags, getReports, getContributeMetaTags } from '../controller/meta-controller.js';
import { createTask, updateTask, deleteTask, getTasks } from '../controller/task-controller.js';
import {
  deleteVaultDocument,
  getVaultDocumentViewUrl,
  getVaultDocuments,
  uploadVaultDocument,
} from '../controller/vault-controller.js';
import { vaultLogin, vaultLogout, vaultMe } from '../controller/vault-auth-controller.js';
import {
  createVaultGuestAccess,
  listVaultGuestAccess,
  revokeVaultGuestAccess,
} from '../controller/vault-guest-controller.js';
import { requireVaultAdmin, requireVaultAuth } from '../middleware/vaultAuth.js';
import { vaultUploadMiddleware } from '../middleware/vaultUpload.js';
import { getVaultMaxUploadLabel } from '../utils/vaultUploads.js';

const router = express.Router();

router.get('/contribute', getContributeMetaTags);
router.get('/reports', getReports);
router.post('/create-task', createTask);
router.post('/update-task', updateTask);
router.delete('/delete-task', deleteTask);
router.get('/get-tasks', getTasks);
router.get('/news/:id', getMetaTags);

router.post('/vault/auth/login', vaultLogin);
router.get('/vault/auth/me', requireVaultAuth, vaultMe);
router.post('/vault/auth/logout', requireVaultAuth, vaultLogout);

router.get('/vault/documents', requireVaultAuth, getVaultDocuments);
router.get('/vault/documents/:id/view-url', requireVaultAuth, getVaultDocumentViewUrl);
router.post('/vault/documents', requireVaultAuth, requireVaultAdmin, (req, res, next) => {
  vaultUploadMiddleware(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: `File is too large. Maximum size is ${getVaultMaxUploadLabel()}.`,
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
router.delete('/vault/documents', requireVaultAuth, requireVaultAdmin, deleteVaultDocument);

router.post('/vault/guest-access', requireVaultAuth, requireVaultAdmin, createVaultGuestAccess);
router.get('/vault/guest-access', requireVaultAuth, requireVaultAdmin, listVaultGuestAccess);
router.delete('/vault/guest-access/:id', requireVaultAuth, requireVaultAdmin, revokeVaultGuestAccess);

export default router;