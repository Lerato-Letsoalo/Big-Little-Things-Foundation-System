const pool = require('../config/db');

const getDashboard = async (req, res) => {
    try {
        const userId = req.user.id;

        const [hours] = await pool.query(
            `
            SELECT
                vh.id,
                vh.hours,
                vh.date_worked AS date,
                vh.status,
                e.name AS event_name,
                e.city AS location
            FROM volunteer_hours vh
            INNER JOIN volunteers v
                ON vh.volunteer_id = v.id
            LEFT JOIN events e
                ON vh.event_id = e.id
            WHERE v.user_id = ?
            ORDER BY vh.date_worked DESC
            `,
            [userId]
        );

        res.json({
            success: true,
            hours: hours
        });

    } catch (error) {
        console.error('Error loading volunteer dashboard:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to load volunteer dashboard'
        });
    }
};

const getEvents = async (req, res) => {
    try {
        const [events] = await pool.query(
            `
            SELECT
                id,
                name,
                description,
                event_date,
                start_time,
                city,
                location,
                capacity,
                status
            FROM events
            WHERE status = 'upcoming'
            ORDER BY event_date ASC, start_time ASC
            `
        );

        const formattedEvents = events.map(event => ({
            id: event.id,
            name: event.name,
            description: event.description,
            date: event.event_date,
            start_time: event.start_time,
            location: event.location || event.city,
            capacity: event.capacity,
            status: event.status
        }));

        res.json({
            success: true,
            events: formattedEvents
        });

    } catch (error) {
        console.error('Error loading events:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to load events'
        });
    }
};

const joinEvent = async (req, res) => {
    try {
        const userId = req.user.id;
        const eventId = req.params.id;

        // Find the volunteer belonging to the logged-in user
        const [volunteers] = await pool.query(
            `
            SELECT id
            FROM volunteers
            WHERE user_id = ?
            `,
            [userId]
        );

        if (volunteers.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Volunteer profile not found'
            });
        }

        const volunteerId = volunteers[0].id;

        // Check if the volunteer is already registered
        const [existingSignup] = await pool.query(
            `
            SELECT id
            FROM event_signups
            WHERE volunteer_id = ?
            AND event_id = ?
            `,
            [volunteerId, eventId]
        );

        if (existingSignup.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'You are already registered for this event'
            });
        }

        // Register the volunteer
        await pool.query(
            `
            INSERT INTO event_signups
            (volunteer_id, event_id)
            VALUES (?, ?)
            `,
            [volunteerId, eventId]
        );

        res.status(201).json({
            success: true,
            message: 'Successfully joined the event'
        });

    } catch (error) {
        console.error('Error joining event:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to join event'
        });
    }
};

const getRegisteredEvents = async (req, res) => {
    try {
        const userId = req.user.id;

        const [registrations] = await pool.query(
            `
            SELECT
                es.id,
                es.signed_up_at AS registered_at,
                e.id AS event_id,
                e.name,
                e.description,
                e.event_date,
                e.start_time,
                e.city,
                e.location
            FROM event_signups es
            INNER JOIN volunteers v
                ON es.volunteer_id = v.id
            INNER JOIN events e
                ON es.event_id = e.id
            WHERE v.user_id = ?
            ORDER BY es.signed_up_at DESC
            `,
            [userId]
        );

        const formattedRegistrations = registrations.map(reg => ({
            id: reg.id,
            status: 'registered',
            registered_at: reg.registered_at,
            event: {
                id: reg.event_id,
                name: reg.name,
                description: reg.description,
                date: reg.event_date,
                start_time: reg.start_time,
                location: reg.location || reg.city
            }
        }));

        res.json({
            success: true,
            registrations: formattedRegistrations
        });

    } catch (error) {
        console.error('Error loading registered events:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to load registered events'
        });
    }
};

const cancelEventRegistration = async (req, res) => {
    try {
        const userId = req.user.id;
        const eventId = req.params.id;

        // Find the volunteer belonging to the logged-in user
        const [volunteers] = await pool.query(
            `
            SELECT id
            FROM volunteers
            WHERE user_id = ?
            `,
            [userId]
        );

        if (volunteers.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Volunteer profile not found'
            });
        }

        const volunteerId = volunteers[0].id;

        // Remove the registration
        const [result] = await pool.query(
            `
            DELETE FROM event_signups
            WHERE volunteer_id = ?
            AND event_id = ?
            `,
            [volunteerId, eventId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Registration not found'
            });
        }

        res.json({
            success: true,
            message: 'Registration cancelled successfully'
        });

    } catch (error) {
        console.error('Error cancelling event registration:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to cancel registration'
        });
    }
};

const getHours = async (req, res) => {
    try {
        const userId = req.user.id;

        const [hours] = await pool.query(
            `
            SELECT
                vh.id,
                vh.hours,
                vh.date_worked AS date,
                vh.status,
                vh.rejection_reason,
                vh.submitted_at,
                vh.reviewed_at,
                e.id AS event_id,
                e.name AS event_name,
                e.city AS location
            FROM volunteer_hours vh
            INNER JOIN volunteers v
                ON vh.volunteer_id = v.id
            LEFT JOIN events e
                ON vh.event_id = e.id
            WHERE v.user_id = ?
            ORDER BY vh.date_worked DESC, vh.id DESC
            `,
            [userId]
        );

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

const submitHours = async (req, res) => {
    try {
        const userId = req.user.id;

        const {
            event,
            date,
            hours,
            location,
            notes
        } = req.body;

        if (!event || !date || !hours) {
            return res.status(400).json({
                success: false,
                message: 'Event, date and hours are required'
            });
        }

        if (hours <= 0 || hours > 24) {
            return res.status(400).json({
                success: false,
                message: 'Hours must be between 0 and 24'
            });
        }

        // Find the volunteer profile for the logged-in user
        const [volunteers] = await pool.query(
            `
            SELECT id
            FROM volunteers
            WHERE user_id = ?
            `,
            [userId]
        );

        if (volunteers.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Volunteer profile not found'
            });
        }

        const volunteerId = volunteers[0].id;

        // Try to find the event by name
        const [events] = await pool.query(
            `
            SELECT id
            FROM events
            WHERE name = ?
            LIMIT 1
            `,
            [event]
        );

        const eventId = events.length > 0
            ? events[0].id
            : null;

        // Save the volunteer hours
        const [result] = await pool.query(
            `
            INSERT INTO volunteer_hours
            (
                volunteer_id,
                event_id,
                hours,
                date_worked,
                status
            )
            VALUES (?, ?, ?, ?, 'pending')
            `,
            [
                volunteerId,
                eventId,
                hours,
                date
            ]
        );

        res.status(201).json({
            success: true,
            message: 'Volunteer hours submitted for approval',
            hourId: result.insertId
        });

    } catch (error) {
        console.error('Error submitting volunteer hours:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to submit volunteer hours'
        });
    }
};

module.exports = {
    getDashboard,
    getEvents,
    joinEvent,
    submitHours,
    getHours,
    getRegisteredEvents,
    cancelEventRegistration
};

