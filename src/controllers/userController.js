const bcrypt = require('bcryptjs');
const User = require('../models/User');

const getUsers = async (req, res, next) => {
  try {
    const users = await User.find({}, '_id name email').lean();
    return res.status(200).json(users);
  } catch (error) {
    return next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword) {
      return res.status(400).json({ message: 'Current password is required' });
    }

    if (!newPassword || String(newPassword).length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(String(currentPassword), user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(String(newPassword), 10);
    user.password = hashedPassword;
    await user.save();

    return res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getUsers,
  changePassword
};
