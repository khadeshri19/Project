import { Router, Response } from 'express';
import bcrypt from 'bcrypt';
import pool from '../db/pool';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { roleMiddleware } from '../middleware/role';

const router = Router();

// All admin routes require auth + admin role
router.use(authMiddleware);
router.use(roleMiddleware('admin'));

// POST /api/admin/create-user
router.post('/create-user', async (req: AuthRequest, res: Response): Promise<void> => {
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
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Failed to create user.' });
    }
});

// DELETE /api/admin/delete-user/:id
router.delete('/delete-user/:id', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        // Prevent self-deletion
        if (id === req.user!.id) {
            res.status(400).json({ error: 'Cannot delete your own account.' });
            return;
        }

        const result = await pool.query(
            'DELETE FROM users WHERE id = $1 RETURNING id, name, email',
            [id]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ error: 'User not found.' });
            return;
        }

        res.json({ message: 'User deleted successfully.', user: result.rows[0] });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Failed to delete user.' });
    }
});

// GET /api/admin/users
router.get('/users', async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
        const result = await pool.query(
            'SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC'
        );
        res.json({ users: result.rows });
    } catch (error) {
        console.error('Fetch users error:', error);
        res.status(500).json({ error: 'Failed to fetch users.' });
    }
});

// GET /api/admin/certificates — all certificates in the system
router.get('/certificates', async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
        const result = await pool.query(
            `SELECT c.*, u.name as issued_by 
       FROM certificates c 
       JOIN users u ON c.user_id = u.id 
       ORDER BY c.created_at DESC`
        );
        res.json({ certificates: result.rows });
    } catch (error) {
        console.error('Fetch all certificates error:', error);
        res.status(500).json({ error: 'Failed to fetch certificates.' });
    }
});

// PATCH /api/admin/certificates/:id/status
router.patch('/certificates/:id/status', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['active', 'disabled'].includes(status)) {
            res.status(400).json({ error: 'Status must be active or disabled.' });
            return;
        }

        const result = await pool.query(
            'UPDATE certificates SET status = $1 WHERE id = $2 RETURNING *',
            [status, id]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Certificate not found.' });
            return;
        }

        res.json({ certificate: result.rows[0] });
    } catch (error) {
        console.error('Update certificate status error:', error);
        res.status(500).json({ error: 'Failed to update certificate status.' });
    }
});

// PUT /api/admin/reset-password/:id
router.put('/reset-password/:id', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { password } = req.body;

        if (!password || password.length < 6) {
            res.status(400).json({ error: 'Password must be at least 6 characters.' });
            return;
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await pool.query(
            'UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING id, name, email',
            [hashedPassword, id]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ error: 'User not found.' });
            return;
        }

        res.json({ message: 'Password reset successfully.', user: result.rows[0] });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Failed to reset password.' });
    }
});

export default router;
