const express = require('express');

const {
    getVolunteers,
    approveVolunteer,
    deleteVolunteer,
    getHours,
    approveHours,
    rejectHours,
    getOverview
} = require('../controllers/adminController');

const { authenticateToken } = require('../middleware/authMiddleware');

const router = express.Router();


// Get all volunteers
router.get('/volunteers', authenticateToken, getVolunteers);
// Get all volunteer hours
router.get('/hours', authenticateToken, getHours);
// Get admin overview statistics
router.get('/overview', authenticateToken, getOverview);

// Approve volunteer hours
router.put(
    '/hours/:id/approve',
    authenticateToken,
    approveHours
);

// Reject volunteer hours
router.put(
    '/hours/:id/reject',
    authenticateToken,
    rejectHours
);

// Approve a volunteer
router.put(
    '/volunteers/:id/approve',
    authenticateToken,
    approveVolunteer
);


// Delete a volunteer
router.delete(
    '/volunteers/:id',
    authenticateToken,
    deleteVolunteer
);


module.exports = router;