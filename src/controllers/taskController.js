const Task = require('../models/Task');

const PRIORITY_ORDER = {
  high: 3,
  medium: 2,
  low: 1
};

const normalizeTags = (tags) => {
  if (Array.isArray(tags)) {
    return tags.map((tag) => String(tag).trim()).filter(Boolean);
  }

  if (typeof tags === 'string') {
    return tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  return [];
};

const buildTaskPayload = (body, isUpdate = false) => {
  const payload = {};

  if (!isUpdate || body.title !== undefined) {
    if (!body.title || !String(body.title).trim()) {
      throw new Error('Title is required');
    }
    payload.title = String(body.title).trim();
  }

  if (!isUpdate || body.completed !== undefined) {
    payload.completed = Boolean(body.completed);
  }

  if (!isUpdate || body.priority !== undefined) {
    payload.priority = body.priority || 'medium';
  }

  if (!isUpdate || body.dueDate !== undefined) {
    payload.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  }

  if (!isUpdate || body.dueTime !== undefined) {
    payload.dueTime = body.dueTime ? String(body.dueTime).trim() : '';
  }

  if (!isUpdate || body.notes !== undefined) {
    payload.notes = body.notes ? String(body.notes).trim() : '';
  }

  if (!isUpdate || body.tags !== undefined) {
    payload.tags = normalizeTags(body.tags);
  }

  return payload;
};

const createTask = async (req, res, next) => {
  try {
    const taskPayload = buildTaskPayload(req.body);
    const task = await Task.create({
      ...taskPayload,
      userId: req.user.id
    });
    return res.status(201).json(task);
  } catch (error) {
    if (error.message === 'Title is required') {
      return res.status(400).json({ message: error.message });
    }
    return next(error);
  }
};

const getTasks = async (req, res, next) => {
  try {
    const { priority, completed, tags, sort = 'dueDateAsc' } = req.query;

    const filter = {
      userId: req.user.id
    };

    if (priority) {
      filter.priority = priority;
    }

    if (completed === 'true' || completed === 'false') {
      filter.completed = completed === 'true';
    }

    if (tags) {
      const tagFilters = normalizeTags(tags);
      if (tagFilters.length) {
        filter.tags = { $in: tagFilters };
      }
    }

    const tasks = await Task.find(filter).lean();

    tasks.sort((a, b) => {
      const aDueDate = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      const bDueDate = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      const aPriority = PRIORITY_ORDER[a.priority] || 0;
      const bPriority = PRIORITY_ORDER[b.priority] || 0;

      switch (sort) {
        case 'dueDateDesc':
          return bDueDate - aDueDate || bPriority - aPriority;
        case 'priorityHigh':
          return bPriority - aPriority || aDueDate - bDueDate;
        case 'priorityLow':
          return aPriority - bPriority || aDueDate - bDueDate;
        case 'createdAtAsc':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'createdAtDesc':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'dueDateAsc':
        default:
          return aDueDate - bDueDate || bPriority - aPriority;
      }
    });

    return res.status(200).json(tasks);
  } catch (error) {
    return next(error);
  }
};

const updateTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updatePayload = buildTaskPayload(req.body, true);

    const task = await Task.findOneAndUpdate({ _id: id, userId: req.user.id }, updatePayload, {
      new: true,
      runValidators: true
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    return res.status(200).json(task);
  } catch (error) {
    if (error.message === 'Title is required') {
      return res.status(400).json({ message: 'Title is required' });
    }
    return next(error);
  }
};

const deleteTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const task = await Task.findOneAndDelete({ _id: id, userId: req.user.id });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    return res.status(200).json({ message: 'Task deleted successfully' });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createTask,
  getTasks,
  updateTask,
  deleteTask
};
