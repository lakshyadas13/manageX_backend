const mongoose = require('mongoose');
const Task = require('../models/Task');
const User = require('../models/User');
const Comment = require('../models/Comment');
const Activity = require('../models/Activity');

const PRIORITY_ORDER = {
  high: 3,
  medium: 2,
  low: 1
};

const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
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

const normalizeCollaborators = (collaborators) => {
  if (!Array.isArray(collaborators)) {
    return [];
  }

  const validIds = collaborators
    .map((c) => (c && typeof c === 'object' && c._id ? String(c._id) : String(c)))
    .filter((id) => mongoose.Types.ObjectId.isValid(id));

  return Array.from(new Set(validIds));
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
    payload.completedAt = payload.completed
      ? (body.completedAt ? new Date(body.completedAt) : new Date())
      : null;
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

  // Handle collaborators and backwards compatibility with assignedTo
  if (!isUpdate || body.collaborators !== undefined || body.assignedTo !== undefined) {
    let collabs = [];

    if (body.collaborators !== undefined) {
      collabs = normalizeCollaborators(body.collaborators);
    }

    if (body.assignedTo !== undefined && body.assignedTo) {
      const assignedId = String(
        typeof body.assignedTo === 'object' && body.assignedTo._id
          ? body.assignedTo._id
          : body.assignedTo
      );
      if (mongoose.Types.ObjectId.isValid(assignedId)) {
        if (!collabs.includes(assignedId)) {
          collabs.push(assignedId);
        }
        payload.assignedTo = assignedId;
      } else {
        payload.assignedTo = null;
      }
    } else if (body.collaborators !== undefined) {
      payload.assignedTo = collabs.length > 0 ? collabs[0] : null;
    }

    if (body.collaborators !== undefined || body.assignedTo !== undefined) {
      payload.collaborators = collabs;
    }
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

    // Activity: Task created
    await Activity.create({
      task: task._id,
      user: req.user.id,
      action: 'created this task'
    });

    // Activity: Collaborators added initially
    if (task.collaborators && task.collaborators.length > 0) {
      const collabsToAdd = task.collaborators.filter(
        (cid) => cid.toString() !== req.user.id
      );

      if (collabsToAdd.length > 0) {
        const collabUsers = await User.find({ _id: { $in: collabsToAdd } }, '_id name').lean();
        for (const user of collabUsers) {
          await Activity.create({
            task: task._id,
            user: req.user.id,
            action: `added ${user.name} as a collaborator`,
            details: { collaboratorId: user._id, collaboratorName: user.name }
          });
        }
      }
    }

    await task.populate([
      { path: 'assignedTo', select: '_id name email' },
      { path: 'collaborators', select: '_id name email' },
      { path: 'userId', select: '_id name email' }
    ]);

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
      $or: [
        { userId: req.user.id },
        { assignedTo: req.user.id },
        { collaborators: req.user.id }
      ]
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

    const tasks = await Task.find(filter)
      .populate('assignedTo', '_id name email')
      .populate('collaborators', '_id name email')
      .populate('userId', '_id name email')
      .lean();

    // Fetch comment counts for these tasks in parallel
    const taskIds = tasks.map((t) => t._id);
    const commentCounts = await Comment.aggregate([
      { $match: { task: { $in: taskIds } } },
      { $group: { _id: '$task', count: { $sum: 1 } } }
    ]);

    const countMap = new Map();
    commentCounts.forEach((c) => countMap.set(c._id.toString(), c.count));

    tasks.forEach((t) => {
      t.commentCount = countMap.get(t._id.toString()) || 0;
    });

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

const getTaskById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const task = await Task.findOne({
      _id: id,
      $or: [
        { userId: req.user.id },
        { assignedTo: req.user.id },
        { collaborators: req.user.id }
      ]
    })
      .populate('assignedTo', '_id name email')
      .populate('collaborators', '_id name email')
      .populate('userId', '_id name email')
      .lean();

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const commentCount = await Comment.countDocuments({ task: id });
    task.commentCount = commentCount;

    return res.status(200).json(task);
  } catch (error) {
    return next(error);
  }
};

const updateTask = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const existingTask = await Task.findOne({
      _id: id,
      $or: [
        { userId: req.user.id },
        { assignedTo: req.user.id },
        { collaborators: req.user.id }
      ]
    });

    if (!existingTask) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const isCreator = existingTask.userId.toString() === req.user.id;
    const updatePayload = buildTaskPayload(req.body, true);

    // If not creator, only allow updating completion status
    if (!isCreator) {
      const allowedKeys = ['completed', 'completedAt'];
      const payloadKeys = Object.keys(updatePayload);
      const hasRestrictedKeys = payloadKeys.some((k) => !allowedKeys.includes(k));

      if (hasRestrictedKeys) {
        return res.status(403).json({
          message: 'Collaborators can only update task completion status'
        });
      }
    }

    // Track activity diffs
    const activitiesToCreate = [];

    if (updatePayload.completed !== undefined && updatePayload.completed !== existingTask.completed) {
      activitiesToCreate.push({
        task: id,
        user: req.user.id,
        action: updatePayload.completed ? 'marked the task as completed' : 'marked the task as incomplete'
      });
    }

    if (isCreator) {
      if (updatePayload.priority && updatePayload.priority !== existingTask.priority) {
        activitiesToCreate.push({
          task: id,
          user: req.user.id,
          action: `changed priority from ${capitalize(existingTask.priority)} to ${capitalize(updatePayload.priority)}`
        });
      }

      if (updatePayload.title && updatePayload.title !== existingTask.title) {
        activitiesToCreate.push({
          task: id,
          user: req.user.id,
          action: `updated task title to "${updatePayload.title}"`
        });
      }

      if (updatePayload.notes !== undefined && updatePayload.notes !== existingTask.notes) {
        activitiesToCreate.push({
          task: id,
          user: req.user.id,
          action: 'updated task notes'
        });
      }

      if (updatePayload.dueDate !== undefined) {
        const oldTime = existingTask.dueDate ? new Date(existingTask.dueDate).getTime() : null;
        const newTime = updatePayload.dueDate ? new Date(updatePayload.dueDate).getTime() : null;
        if (oldTime !== newTime) {
          activitiesToCreate.push({
            task: id,
            user: req.user.id,
            action: updatePayload.dueDate
              ? `changed due date to ${new Date(updatePayload.dueDate).toLocaleDateString()}`
              : 'removed the due date'
          });
        }
      }

      // Collaborator changes
      if (updatePayload.collaborators !== undefined) {
        const oldCollabIds = (existingTask.collaborators || []).map((c) => c.toString());
        const newCollabIds = updatePayload.collaborators.map((c) => c.toString());

        const addedCollabs = newCollabIds.filter((cid) => !oldCollabIds.includes(cid));
        const removedCollabs = oldCollabIds.filter((cid) => !newCollabIds.includes(cid));

        if (addedCollabs.length > 0) {
          const addedUsers = await User.find({ _id: { $in: addedCollabs } }, '_id name').lean();
          for (const u of addedUsers) {
            activitiesToCreate.push({
              task: id,
              user: req.user.id,
              action: `added ${u.name} as a collaborator`,
              details: { collaboratorId: u._id, collaboratorName: u.name }
            });
          }
        }

        if (removedCollabs.length > 0) {
          const removedUsers = await User.find({ _id: { $in: removedCollabs } }, '_id name').lean();
          for (const u of removedUsers) {
            activitiesToCreate.push({
              task: id,
              user: req.user.id,
              action: `removed ${u.name} as a collaborator`,
              details: { collaboratorId: u._id, collaboratorName: u.name }
            });
          }
        }
      }
    }

    Object.assign(existingTask, updatePayload);
    await existingTask.save();

    if (activitiesToCreate.length > 0) {
      await Activity.insertMany(activitiesToCreate);
    }

    await existingTask.populate([
      { path: 'assignedTo', select: '_id name email' },
      { path: 'collaborators', select: '_id name email' },
      { path: 'userId', select: '_id name email' }
    ]);

    return res.status(200).json(existingTask);
  } catch (error) {
    if (error.message === 'Title is required') {
      return res.status(400).json({ message: 'Title is required' });
    }
    return next(error);
  }
};

const updateCollaborators = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { collaborators } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (task.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the task creator can manage collaborators' });
    }

    const newCollabIds = normalizeCollaborators(collaborators);
    const oldCollabIds = (task.collaborators || []).map((c) => c.toString());

    const addedCollabs = newCollabIds.filter((cid) => !oldCollabIds.includes(cid));
    const removedCollabs = oldCollabIds.filter((cid) => !newCollabIds.includes(cid));

    task.collaborators = newCollabIds;
    task.assignedTo = newCollabIds.length > 0 ? newCollabIds[0] : null;
    await task.save();

    const activitiesToCreate = [];
    if (addedCollabs.length > 0) {
      const addedUsers = await User.find({ _id: { $in: addedCollabs } }, '_id name').lean();
      for (const u of addedUsers) {
        activitiesToCreate.push({
          task: id,
          user: req.user.id,
          action: `added ${u.name} as a collaborator`,
          details: { collaboratorId: u._id, collaboratorName: u.name }
        });
      }
    }

    if (removedCollabs.length > 0) {
      const removedUsers = await User.find({ _id: { $in: removedCollabs } }, '_id name').lean();
      for (const u of removedUsers) {
        activitiesToCreate.push({
          task: id,
          user: req.user.id,
          action: `removed ${u.name} as a collaborator`,
          details: { collaboratorId: u._id, collaboratorName: u.name }
        });
      }
    }

    if (activitiesToCreate.length > 0) {
      await Activity.insertMany(activitiesToCreate);
    }

    await task.populate([
      { path: 'assignedTo', select: '_id name email' },
      { path: 'collaborators', select: '_id name email' },
      { path: 'userId', select: '_id name email' }
    ]);

    return res.status(200).json(task);
  } catch (error) {
    return next(error);
  }
};

const deleteTask = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (task.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the task creator can delete this task' });
    }

    await Task.findByIdAndDelete(id);
    await Comment.deleteMany({ task: id });
    await Activity.deleteMany({ task: id });

    return res.status(200).json({ message: 'Task deleted successfully' });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  updateCollaborators,
  deleteTask
};
