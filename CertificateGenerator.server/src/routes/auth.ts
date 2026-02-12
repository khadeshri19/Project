import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../db/pool';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { roleMiddleware } from '../middleware/role';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400).json({ error: 'Email and password are required.' });
            return;
        }

        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

        if (result.rows.length === 0) {
            res.status(401).json({ error: 'Invalid email or password.' });
            return;
        }

        const user = result.rows[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword) {
            res.status(401).json({ error: 'Invalid email or password.' });
            return;
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, name: user.name },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// POST /api/auth/register (admin only)
router.post(
    '/register',
    authMiddleware,
    roleMiddleware('admin'),
    async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const { name, email, password, role } = req.body;

            if (!name || !email || !password || !role) {
                res.status(400).json({ error: 'Name, email, password, and role are required.' });
                return;
            }

            if (!['admin', 'user'].includes(role)) {
                res.status(400).json({ error: 'Role must be admin or user.' });
                return;
            }

            // Check if email already exists
            const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
            if (existing.rows.length > 0) {
                res.status(409).json({ error: 'Email already exists.' });
                return;
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            const result = await pool.query(
                `INSERT INTO users (name, email, password_hash, role) 
         VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at`,
                [name, email, hashedPassword, role]
            );

            res.status(201).json({ user: result.rows[0] });
        } catch (error) {
            console.error('Register error:', error);
            res.status(500).json({ error: 'Internal server error.' });
        }
    }
);

export default router;
