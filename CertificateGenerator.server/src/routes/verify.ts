import { Router, Request, Response } from 'express';
import pool from '../db/pool';

const router = Router();

// GET /api/verify/:verificationCode
router.get('/:verificationCode', async (req: Request, res: Response): Promise<void> => {
    try {
        const { verificationCode } = req.params;

        const result = await pool.query(
            `SELECT c.*, u.name as issued_by 
       FROM certificates c 
       JOIN users u ON c.user_id = u.id 
       WHERE c.verification_code = $1`,
            [verificationCode]
        );

        if (result.rows.length === 0) {
            res.status(404).json({
                verified: false,
                error: 'Certificate not found. Invalid verification code.',
            });
            return;
        }

        const cert = result.rows[0];

        if (cert.status !== 'active') {
            res.status(200).json({
                verified: false,
                error: 'This certificate has been revoked or disabled.',
            });
            return;
        }

        res.json({
            verified: true,
            certificate: {
                student_name: cert.student_name,
                course_name: cert.course_name,
                completion_date: cert.completion_date,
                certificate_id: cert.id,
                issued_by: cert.issued_by,
                issue_date: cert.created_at,
            },
        });
    } catch (error) {
        console.error('Verification error:', error);
        res.status(500).json({ error: 'Verification failed.' });
    }
});

export default router;
