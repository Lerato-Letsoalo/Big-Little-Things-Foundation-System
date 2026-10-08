const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// REGISTER VOLUNTEER

const register = async (req, res) => {
    let connection;

    try {
        const {
            name,
            email,
            password,
            phone,
            city,
            age,
            skills
        } = req.body;

        // Check required fields
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Name, email and password are required'
            });
        }

        // Get a database connection for the transaction
        connection = await pool.getConnection();

        // Start transaction
        await connection.beginTransaction();

        // Check if email already exists
        const [existingUsers] = await connection.query(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (existingUsers.length > 0) {
            await connection.rollback();

            return res.status(409).json({
                success: false,
                message: 'A user with this email already exists'
            });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Create user
        const [userResult] = await connection.query(
            `INSERT INTO users
            (name, email, password_hash, role, status, phone, city)
            VALUES (?, ?, ?, 'volunteer', 'pending', ?, ?)`,
            [
                name,
                email,
                passwordHash,
                phone || null,
                city || null
            ]
        );

        const userId = userResult.insertId;

        // Create volunteer profile
        await connection.query(
            `INSERT INTO volunteers
            (user_id, age, skills, availability)
            VALUES (?, ?, ?, ?)`,
            [
                userId,
                age || null,
                skills || null,
                null
            ]
        );

        // Both inserts worked
        await connection.commit();

        res.status(201).json({
            success: true,
            message: 'Registration successful',
            userId: userId
        });

    } catch (error) {
        // Undo any database changes if something failed
        if (connection) {
            await connection.rollback();
        }

        console.error('Registration error:', error);

        res.status(500).json({
            success: false,
            message: 'Registration failed'
        });

    } finally {
        // Return connection to the pool
        if (connection) {
            connection.release();
        }
    }
};

// LOGIN

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check required fields
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        // Find user by email
        const [users] = await pool.query(
            `SELECT
                id,
                name,
                email,
                password_hash,
                role,
                status,
                phone,
                city
             FROM users
             WHERE email = ?`,
            [email]
        );

        // User does not exist
        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const user = users[0];

        // Check password
        const passwordMatch = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Only approved/active users can log in
        if (
            user.status !== 'approved' &&
            user.status !== 'active'
        ) {
            return res.status(403).json({
                success: false,
                message: 'Your account is not approved yet'
            });
        }

        // Create JWT token
        const token = jwt.sign(
            {
                id: user.id,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: '2h'
            }
        );

        // Send successful login response
        res.json({
            success: true,
            message: 'Login successful',
            token: token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                status: user.status,
                phone: user.phone,
                city: user.city
            }
        });

    } catch (error) {
        console.error('Login error:', error);

        res.status(500).json({
            success: false,
            message: 'Login failed'
        });
    }
};

// EXPORT CONTROLLERS

const getMe = async (req, res) => {
    try {
        const userId = req.user.id;

        const [users] = await pool.query(
            `SELECT
                id,
                name,
                email,
                role,
                status,
                phone,
                city
             FROM users
             WHERE id = ?`,
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const user = users[0];

        const [volunteers] = await pool.query(
            `SELECT
                id,
                age,
                skills,
                availability,
                joined_at
             FROM volunteers
             WHERE user_id = ?`,
            [userId]
        );

        const volunteer = volunteers.length > 0
            ? volunteers[0]
            : null;

        res.json({
            success: true,
            user: {
                ...user,
                volunteer: volunteer
            }
        });

    } catch (error) {
        console.error('Get profile error:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to load profile'
        });
    }
};

const updateProfile = async (req, res) => {
    let connection;

    try {
        const userId = req.user.id;

        const {
            name,
            phone,
            city,
            skills
        } = req.body;

        if (!name || !phone || !city) {
            return res.status(400).json({
                success: false,
                message: 'Name, phone and city are required'
            });
        }

        connection = await pool.getConnection();

        await connection.beginTransaction();

        // Update basic user information
        await connection.query(
            `
            UPDATE users
            SET
                name = ?,
                phone = ?,
                city = ?
            WHERE id = ?
            `,
            [
                name,
                phone,
                city,
                userId
            ]
        );

        // Update volunteer-specific information
        await connection.query(
            `
            UPDATE volunteers
            SET
                skills = ?
            WHERE user_id = ?
            `,
            [
                skills || null,
                userId
            ]
        );

        await connection.commit();

        res.json({
            success: true,
            message: 'Profile updated successfully'
        });

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        console.error('Profile update error:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to update profile'
        });

    } finally {
        if (connection) {
            connection.release();
        }
    }
};

module.exports = {
    register,
    login,
    getMe,
    updateProfile
};