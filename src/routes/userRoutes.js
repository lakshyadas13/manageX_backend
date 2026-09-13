const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getUsers, changePassword } = require('../controllers/userController');

router.get('/', protect, getUsers);
router.patch('/change-password', protect, changePassword);

module.exports = router;
