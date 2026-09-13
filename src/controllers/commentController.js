const mongoose = require('mongoose');
const Comment = require('../models/Comment');
const Task = require('../models/Task');
const Activity = require('../models/Activity');

// Helper to check if a user has access to a task
const verifyTaskAccess = async (taskId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(taskId)) {
    return null;
  }

  const task = await Task.findById(taskId);
  if (!task) {
    return null;
  }

  const isCreator = task.userId.toString() === userId;
  const isAssigned = task.assignedTo && task.assignedTo.toString() === userId;
  const isCollaborator = Array.isArray(task.collaborators) &&
    task.collaborators.some((c) => c.toString() === userId);

  if (!isCreator && !isAssigned && !isCollaborator) {
    return false; // Found, but unauthorized
  }

  return task;
};

const getComments = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const task = await verifyTaskAccess(taskId, req.user.id);

    if (task === null) {
      return res.status(404).json({ message: 'Task not found' });
    }
    if (task === false) {
      return res.status(403).json({ message: 'Not authorized to view comments for this task' });
    }

    const comments = await Comment.find({ task: taskId })
      .sort({ createdAt: 1 })
      .populate('user', '_id name email')
      .lean();

    return res.status(200).json(comments);
  } catch (error) {
    return next(error);
  }
};

const createComment = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { message } = req.body;

    if (!message || !String(message).trim()) {
      return res.status(400).json({ message: 'Comment message cannot be empty' });
    }

    const task = await verifyTaskAccess(taskId, req.user.id);

    if (task === null) {
      return res.status(404).json({ message: 'Task not found' });
    }
    if (task === false) {
      return res.status(403).json({ message: 'Not authorized to comment on this task' });
    }

    const comment = await Comment.create({
      task: taskId,
      user: req.user.id,
      message: String(message).trim()
    });

    await comment.populate('user', '_id name email');

    // Record activity for comment
    await Activity.create({
      task: taskId,
      user: req.user.id,
      action: 'added a comment',
      details: { commentId: comment._id }
    });

    return res.status(201).json(comment);
  } catch (error) {
    return next(error);
  }
};

const updateComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const { message } = req.body;

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    if (!message || !String(message).trim()) {
      return res.status(400).json({ message: 'Comment message cannot be empty' });
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    if (comment.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the author can edit this comment' });
    }

    comment.message = String(message).trim();
    await comment.save();
    await comment.populate('user', '_id name email');

    return res.status(200).json(comment);
  } catch (error) {
    return next(error);
  }
};

const deleteComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    if (comment.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the author can delete this comment' });
    }

    await Comment.findByIdAndDelete(commentId);

    return res.status(200).json({ message: 'Comment deleted successfully' });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getComments,
  createComment,
  updateComment,
  deleteComment,
  verifyTaskAccess
};
