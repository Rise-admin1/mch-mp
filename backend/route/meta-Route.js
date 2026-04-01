import express from 'express';
import { getMetaTags, getReports, getContributeMetaTags } from '../controller/meta-controller.js';
import { createTask, updateTask, deleteTask, getTasks } from '../controller/task-controller.js';

const router = express.Router();

router.get('/contribute', getContributeMetaTags);
router.get('/reports', getReports);
router.post('/create-task', createTask);
router.post('/update-task', updateTask);
router.delete('/delete-task', deleteTask);
router.get('/get-tasks', getTasks);
router.get('/news/:id', getMetaTags);

export default router;