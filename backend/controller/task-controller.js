import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ALLOWED_ASSETS = ['Coachacadem', 'PhD Success', 'Corpink', 'Funyula', 'Velo', 'Safari Books'];
const ALLOWED_ASSIGNEES = ['Michael', 'Mark', 'Enock', 'Xylem'];
const ALLOWED_STATUSES = ['Todo', 'In Progress', 'Done'];

function normalizeTask(task) {
  return {
    ...task,
    // Frontend `Task` type uses `description?: string` (undefined, not null)
    description: task.description ?? undefined,
  };
}

export const getTasks = async (req, res, next) => {
  try {
    const {
      page = '1',
      limit = '10',
      asset,
      assignedTo,
      status,
    } = req.query || {};

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const MAX_LIMIT = 50;
    const limitNum = Math.min(MAX_LIMIT, Math.max(1, parseInt(String(limit), 10) || 10));

    const where = {};
    if (typeof asset === 'string' && asset.trim()) where.asset = asset;
    if (typeof assignedTo === 'string' && assignedTo.trim()) where.assignedTo = assignedTo;
    if (typeof status === 'string' && status.trim()) where.status = status;

    const skip = (pageNum - 1) * limitNum;

    const [totalCount, tasks] = await Promise.all([
      prisma.task.count({ where }),
      prisma.task.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
    ]);

    const totalPages = Math.ceil(totalCount / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPreviousPage = pageNum > 1;

    res.status(200).json({
      success: true,
      data: {
        tasks: tasks.map(normalizeTask),
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalCount,
          limit: limitNum,
          hasNextPage,
          hasPreviousPage,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching tasks',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

export const createTask = async (req, res, next) => {
  try {
    const { title, description, asset, assignedTo, status } = req.body || {};

    if (typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ success: false, message: 'title is required' });
    }
    if (typeof asset !== 'string' || !asset.trim() || !ALLOWED_ASSETS.includes(asset)) {
      return res.status(400).json({ success: false, message: 'Invalid asset' });
    }
    if (typeof assignedTo !== 'string' || !assignedTo.trim() || !ALLOWED_ASSIGNEES.includes(assignedTo)) {
      return res.status(400).json({ success: false, message: 'Invalid assignedTo' });
    }
    if (typeof status !== 'string' || !status.trim() || !ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const descriptionValue =
      typeof description === 'string' && description.trim() ? description.trim() : null;

    const task = await prisma.task.create({
      data: {
        title: title.trim(),
        description: descriptionValue,
        asset,
        assignedTo,
        status,
      },
    });

    res.status(200).json({
      success: true,
      data: { task: normalizeTask(task) },
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating task',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

export const updateTask = async (req, res, next) => {
  try {
    const { id, title, description, asset, assignedTo, status } = req.body || {};

    if (typeof id !== 'string' || !id.trim()) {
      return res.status(400).json({ success: false, message: 'id is required' });
    }
    if (typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ success: false, message: 'title is required' });
    }
    if (typeof asset !== 'string' || !asset.trim() || !ALLOWED_ASSETS.includes(asset)) {
      return res.status(400).json({ success: false, message: 'Invalid asset' });
    }
    if (typeof assignedTo !== 'string' || !assignedTo.trim() || !ALLOWED_ASSIGNEES.includes(assignedTo)) {
      return res.status(400).json({ success: false, message: 'Invalid assignedTo' });
    }
    if (typeof status !== 'string' || !status.trim() || !ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const descriptionValue =
      typeof description === 'string' && description.trim() ? description.trim() : null;

    const task = await prisma.task.update({
      where: { id },
      data: {
        title: title.trim(),
        description: descriptionValue,
        asset,
        assignedTo,
        status,
      },
    });

    res.status(200).json({
      success: true,
      data: { task: normalizeTask(task) },
    });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating task',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

export const deleteTask = async (req, res, next) => {
  try {
    const { id } = req.body || {};

    if (typeof id !== 'string' || !id.trim()) {
      return res.status(400).json({ success: false, message: 'id is required' });
    }

    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    await prisma.task.delete({ where: { id } });

    res.status(200).json({
      success: true,
      data: { id },
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting task',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

