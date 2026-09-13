const express = require('express');
const {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  updateCollaborators,
  deleteTask
} = require('../controllers/taskController');
const {
  getComments,
  createComment,
  updateComment,
  deleteComment
} = require('../controllers/commentController');
const {
  getActivity
} = require('../controllers/activityController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

// Tasks
router.post('/tasks', createTask);
router.get('/tasks', getTasks);
router.get('/tasks/:id', getTaskById);
router.put('/tasks/:id', updateTask);
router.patch('/tasks/:id', updateTask);
router.patch('/tasks/:id/collaborators', updateCollaborators);
router.delete('/tasks/:id', deleteTask);

// Comments
router.get('/tasks/:taskId/comments', getComments);
router.post('/tasks/:taskId/comments', createComment);
router.patch('/comments/:commentId', updateComment);
router.delete('/comments/:commentId', deleteComment);

// Activity History
router.get('/tasks/:taskId/activity', getActivity);

module.exports = router;
