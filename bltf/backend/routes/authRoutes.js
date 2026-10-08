const express = require('express');

const {
    register,
    login,
    getMe,
    updateProfile
} = require('../controllers/authController');

const { authenticateToken } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticateToken, getMe);
router.put('/me/profile', authenticateToken, updateProfile);

module.exports = router;