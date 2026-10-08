const express = require('express');

const {
    getDashboard,
    getHours,
    submitHours,
    getEvents,
    joinEvent,
    getRegisteredEvents,
    cancelEventRegistration
} = require('../controllers/volunteerController');

const { authenticateToken } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/dashboard', authenticateToken, getDashboard);
router.get('/hours', authenticateToken, getHours);
router.post('/hours', authenticateToken, submitHours);
router.get('/events', authenticateToken, getEvents);
router.post('/events/:id/signup', authenticateToken, joinEvent);
router.get('/events/my-registrations', authenticateToken, getRegisteredEvents);
router.delete('/events/:id/signup', authenticateToken, cancelEventRegistration);

module.exports = router;