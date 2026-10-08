const pool = require('../config/db');

const getProjects = async (req, res) => {
    try {
        const [projects] = await pool.query(`
            SELECT
                id,
                title,
                description,
                category,
                city,
                target_amount,
                status,
                created_by
            FROM projects
            ORDER BY id DESC
        `);

        res.json({
            success: true,
            projects: projects
        });

    } catch (error) {
        console.error('Error fetching projects:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to fetch projects'
        });
    }
};

module.exports = {
    getProjects
};