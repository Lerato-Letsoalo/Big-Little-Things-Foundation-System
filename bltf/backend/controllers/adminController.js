const pool = require('../config/db');


// ─────────────────────────────────────────────
// GET ALL VOLUNTEERS
// ─────────────────────────────────────────────
const getVolunteers = async (req, res) => {
    try {
        const [volunteers] = await pool.query(`
            SELECT
                v.id AS volunteer_id,
                v.user_id,
                u.name,
                u.email,
                u.phone,
                u.city,
                u.status,
                v.age,
                v.skills,
                v.availability,
                v.joined_at
            FROM volunteers v
            INNER JOIN users u
                ON v.user_id = u.id
            ORDER BY v.joined_at DESC
        `);

        res.json({
            success: true,
            volunteers: volunteers
        });

    } catch (error) {
        console.error('Error loading volunteers:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to load volunteers'
        });
    }
};


// ─────────────────────────────────────────────
// APPROVE VOLUNTEER
// ─────────────────────────────────────────────
const approveVolunteer = async (req, res) => {
    let connection;

    try {
        const volunteerId = req.params.id;

        connection = await pool.getConnection();

        await connection.beginTransaction();

        // Find the user connected to this volunteer
        const [volunteers] = await connection.query(
            `
            SELECT user_id
            FROM volunteers
            WHERE id = ?
            `,
            [volunteerId]
        );

        if (volunteers.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                success: false,
                message: 'Volunteer not found'
            });
        }

        const userId = volunteers[0].user_id;

        // Approve the user account
        await connection.query(
            `
            UPDATE users
            SET status = 'approved'
            WHERE id = ?
            `,
            [userId]
        );

        await connection.commit();

        res.json({
            success: true,
            message: 'Volunteer approved successfully'
        });

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        console.error('Error approving volunteer:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to approve volunteer'
        });

    } finally {
        if (connection) {
            connection.release();
        }
    }
};


// ─────────────────────────────────────────────
// DELETE VOLUNTEER
// ─────────────────────────────────────────────
const deleteVolunteer = async (req, res) => {
    let connection;

    try {
        const volunteerId = req.params.id;

        connection = await pool.getConnection();

        await connection.beginTransaction();

        // Find the user connected to this volunteer
        const [volunteers] = await connection.query(
            `
            SELECT user_id
            FROM volunteers
            WHERE id = ?
            `,
            [volunteerId]
        );

        if (volunteers.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                success: false,
                message: 'Volunteer not found'
            });
        }

        const userId = volunteers[0].user_id;

        // Delete volunteer profile
        await connection.query(
            `
            DELETE FROM volunteers
            WHERE id = ?
            `,
            [volunteerId]
        );

        // Delete associated user account
        await connection.query(
            `
            DELETE FROM users
            WHERE id = ?
            `,
            [userId]
        );

        await connection.commit();

        res.json({
            success: true,
            message: 'Volunteer removed successfully'
        });

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        console.error('Error deleting volunteer:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to remove volunteer'
        });

    } finally {
        if (connection) {
            connection.release();
        }
    }
};

// ─────────────────────────────────────────────
// GET ALL VOLUNTEER HOURS
// ─────────────────────────────────────────────
const getHours = async (req, res) => {
    try {
        const [hours] = await pool.query(`
            SELECT
                vh.id,
                v.user_id,
                u.name AS volunteer_name,
                e.name AS event_name,
                vh.date_worked AS date,
                vh.hours,
                vh.status
            FROM volunteer_hours vh
            INNER JOIN volunteers v
                ON vh.volunteer_id = v.id
            INNER JOIN users u
                ON v.user_id = u.id
            LEFT JOIN events e
                ON vh.event_id = e.id
            ORDER BY vh.date_worked DESC, vh.id DESC
        `);

        res.json({
            success: true,
            hours: hours
        });

    } catch (error) {
        console.error('Error loading volunteer hours:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to load volunteer hours'
        });
    }
};

// ─────────────────────────────────────────────
// APPROVE VOLUNTEER HOURS
// ─────────────────────────────────────────────
const approveHours = async (req, res) => {
    try {
        const hourId = req.params.id;

        const [result] = await pool.query(
            `
            UPDATE volunteer_hours
            SET status = 'approved'
            WHERE id = ?
            `,
            [hourId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Volunteer hours not found'
            });
        }

        res.json({
            success: true,
            message: 'Volunteer hours approved successfully'
        });

    } catch (error) {
        console.error('Error approving volunteer hours:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to approve volunteer hours'
        });
    }
};


// ─────────────────────────────────────────────
// REJECT VOLUNTEER HOURS
// ─────────────────────────────────────────────
const rejectHours = async (req, res) => {
    try {
        const hourId = req.params.id;

        const [result] = await pool.query(
            `
            UPDATE volunteer_hours
            SET status = 'rejected'
            WHERE id = ?
            `,
            [hourId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Volunteer hours not found'
            });
        }

        res.json({
            success: true,
            message: 'Volunteer hours rejected successfully'
        });

    } catch (error) {
        console.error('Error rejecting volunteer hours:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to reject volunteer hours'
        });
    }
};

// ─────────────────────────────────────────────
// GET ADMIN OVERVIEW STATS
// ─────────────────────────────────────────────
const getOverview = async (req, res) => {
    try {
        const [volunteerResult] = await pool.query(`
            SELECT COUNT(*) AS total
            FROM volunteers
        `);

        const [donationResult] = await pool.query(`
            SELECT COALESCE(SUM(amount), 0) AS total
            FROM donations
            WHERE status = 'complete'
        `);

        const [projectResult] = await pool.query(`
            SELECT COUNT(*) AS total
            FROM projects
            WHERE status = 'active'
        `);

        const [eventResult] = await pool.query(`
            SELECT COUNT(*) AS total
            FROM events
        `);

        const [pendingHoursResult] = await pool.query(`
            SELECT COUNT(*) AS total
            FROM volunteer_hours
            WHERE status = 'pending'
        `);

        res.json({
            success: true,
            stats: {
                volunteers: volunteerResult[0].total,
                donations: donationResult[0].total,
                projects: projectResult[0].total,
                events: eventResult[0].total,
                pendingHours: pendingHoursResult[0].total
            }
        });

    } catch (error) {
        console.error('Error loading admin overview:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to load admin overview'
        });
    }
};

module.exports = {
    getVolunteers,
    approveVolunteer,
    deleteVolunteer,
    getHours,
    approveHours,
    rejectHours,
    getOverview
};
