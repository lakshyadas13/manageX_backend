const Activity = require('../models/Activity');
const { verifyTaskAccess } = require('./commentController');

const getActivity = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const task = await verifyTaskAccess(taskId, req.user.id);

    if (task === null) {
      return res.status(404).json({ message: 'Task not found' });
    }
    if (task === false) {
      return res.status(403).json({ message: 'Not authorized to view activity for this task' });
    }

    const activities = await Activity.find({ task: taskId })
      .sort({ createdAt: -1 })
      .populate('user', '_id name email')
      .lean();

    return res.status(200).json(activities);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getActivity
};
