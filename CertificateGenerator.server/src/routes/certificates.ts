import { v4 as uuidv4 } from 'uuid';
import archiver from 'archiver';
import path from 'path';
import fs from 'fs';
import csvParser from 'csv-parser';
import multer from 'multer';
import { generateCertificatePdf } from '../services/pdfService';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import pool from '../db/pool';
import { Router, Response } from 'express';

const router = Router();
const upload = multer({ dest: path.join(__dirname, '..', '..', 'uploads', 'csv') });

// POST /api/certificates/generate (single)
router.post('/generate', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { template_id, student_name, course_name, completion_date } = req.body;

        // Restriction: Admin cannot generate certificates
        if (req.user!.role === 'admin') {
            res.status(403).json({ error: 'Admins are restricted from generating certificates. Only Users can generate certificates.' });
            return;
        }

        if (!template_id || !student_name || !course_name || !completion_date) {
            res.status(400).json({ error: 'template_id, student_name, course_name, and completion_date are required.' });
            return;
        }

        // Fetch template and fields
        const templateResult = await pool.query('SELECT * FROM templates WHERE id = $1', [template_id]);
        if (templateResult.rows.length === 0) {
            res.status(404).json({ error: 'Template not found.' });
            return;
        }

        const fieldsResult = await pool.query('SELECT * FROM template_fields WHERE template_id = $1', [template_id]);

        console.log(`\n[CERT] ===== Certificate Generation =====`);
        console.log(`[CERT] Template: ${templateResult.rows[0].name}`);
        console.log(`[CERT] Template canvas: ${templateResult.rows[0].canvas_width}x${templateResult.rows[0].canvas_height}`);
        console.log(`[CERT] Fields found: ${fieldsResult.rows.length}`);
        if (fieldsResult.rows.length > 0) {
            fieldsResult.rows.forEach((f: any) => {
                console.log(`  -> Field: ${f.field_type} at (${f.position_x}, ${f.position_y}) size=${f.font_size} color=${f.font_color} font=${f.font_family}`);
            });
        } else {
            console.warn('[CERT] WARNING: No fields found for this template! Did you save the field layout?');
        }

        // Generate short verification code (segment 1 of UUID)
        const verificationCode = uuidv4().split('-')[0].toUpperCase();

        // Insert certificate record
        const certResult = await pool.query(
            `INSERT INTO certificates (template_id, user_id, student_name, course_name, completion_date, verification_code)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [template_id, req.user!.id, student_name, course_name, completion_date, verificationCode]
        );

        const certificate = certResult.rows[0];
        const template = templateResult.rows[0];
        const fields = fieldsResult.rows;

        // Generate PDF
        const pdfPath = await generateCertificatePdf({
            certificate,
            template,
            fields,
        });

        // Update certificate with PDF path
        await pool.query('UPDATE certificates SET pdf_path = $1 WHERE id = $2', [pdfPath, certificate.id]);

        res.status(201).json({
            certificate: { ...certificate, pdf_path: pdfPath },
            download_url: pdfPath,
        });
    } catch (error) {
        console.error('Certificate generation error:', error);
        res.status(500).json({ error: 'Failed to generate certificate.' });
    }
});

// POST /api/certificates/bulk
router.post(
    '/bulk',
    authMiddleware,
    upload.single('csv'),
    async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const { template_id } = req.body;

            // Restriction: Admin cannot generate certificates
            if (req.user!.role === 'admin') {
                res.status(403).json({ error: 'Admins are restricted from generating certificates. Only Users can generate certificates.' });
                return;
            }

            if (!template_id || !req.file) {
                res.status(400).json({ error: 'template_id and CSV file are required.' });
                return;
            }

            const templateResult = await pool.query('SELECT * FROM templates WHERE id = $1', [template_id]);
            if (templateResult.rows.length === 0) {
                res.status(404).json({ error: 'Template not found.' });
                return;
            }

            const fieldsResult = await pool.query('SELECT * FROM template_fields WHERE template_id = $1', [template_id]);
            const template = templateResult.rows[0];
            const fields = fieldsResult.rows;

            // Parse CSV
            const students: Array<{ name: string; course: string; completion_date: string; email?: string }> = [];
            await new Promise<void>((resolve, reject) => {
                fs.createReadStream(req.file!.path)
                    .pipe(csvParser())
                    .on('data', (row: any) => {
                        students.push({
                            name: row.Name || row.name || row.student_name,
                            course: row.Course || row.course || row.course_name,
                            completion_date: row['Completion Date'] || row.completion_date || row.date,
                            email: row.Email || row.email,
                        });
                    })
                    .on('end', resolve)
                    .on('error', reject);
            });

            if (students.length === 0) {
                res.status(400).json({ error: 'CSV file is empty or has invalid format.' });
                return;
            }

            const generatedCerts = [];
            const pdfPaths: string[] = [];

            for (const student of students) {
                // Generate short verification code (segment 1 of UUID)
                const verificationCode = uuidv4().split('-')[0].toUpperCase();

                // Insert certificate record
                const certResult = await pool.query(
                    `INSERT INTO certificates (template_id, user_id, student_name, course_name, completion_date, verification_code)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
                    [template_id, req.user!.id, student.name, student.course, student.completion_date, verificationCode]
                );

                const certificate = certResult.rows[0];

                // Generate PDF
                const pdfPath = await generateCertificatePdf({ certificate, template, fields });

                // Update certificate with PDF path
                await pool.query('UPDATE certificates SET pdf_path = $1 WHERE id = $2', [pdfPath, certificate.id]);

                generatedCerts.push({ ...certificate, pdf_path: pdfPath });
                pdfPaths.push(path.join(__dirname, '..', '..', pdfPath.replace(/^\//, '')));
            }

            // Create ZIP file
            const zipFilename = `certificates_bulk_${Date.now()}.zip`;
            const zipPath = `/generated/${zipFilename}`;
            const zipFullPath = path.join(__dirname, '..', '..', 'generated', zipFilename);

            const output = fs.createWriteStream(zipFullPath);
            const archive = archiver('zip', { zlib: { level: 9 } });

            archive.pipe(output);

            for (const pdfFullPath of pdfPaths) {
                if (fs.existsSync(pdfFullPath)) {
                    archive.file(pdfFullPath, { name: path.basename(pdfFullPath) });
                }
            }

            await archive.finalize();

            // Clean up CSV file
            fs.unlinkSync(req.file!.path);

            res.status(201).json({
                message: `${generatedCerts.length} certificates generated.`,
                certificates: generatedCerts,
                zip_download_url: zipPath,
            });
        } catch (error) {
            console.error('Bulk generation error:', error);
            res.status(500).json({ error: 'Failed to generate bulk certificates.' });
        }
    }
);

// GET /api/certificates
router.get('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const result = await pool.query(
            'SELECT * FROM certificates WHERE user_id = $1 ORDER BY created_at DESC',
            [req.user!.id]
        );
        res.json({ certificates: result.rows });
    } catch (error) {
        console.error('Fetch certificates error:', error);
        res.status(500).json({ error: 'Failed to fetch certificates.' });
    }
});

// GET /api/certificates/:id
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM certificates WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Certificate not found.' });
            return;
        }

        res.json({ certificate: result.rows[0] });
    } catch (error) {
        console.error('Fetch certificate error:', error);
        res.status(500).json({ error: 'Failed to fetch certificate.' });
    }
});

// GET /api/certificates/download/:id
router.get('/download/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM certificates WHERE id = $1', [id]);

        if (result.rows.length === 0 || !result.rows[0].pdf_path) {
            res.status(404).json({ error: 'Certificate PDF not found.' });
            return;
        }

        const pdfFullPath = path.join(__dirname, '..', '..', result.rows[0].pdf_path.replace(/^\//, ''));

        if (!fs.existsSync(pdfFullPath)) {
            res.status(404).json({ error: 'PDF file not found on server.' });
            return;
        }

        res.download(pdfFullPath, `certificate_${result.rows[0].student_name}.pdf`);
    } catch (error) {
        console.error('Download certificate error:', error);
        res.status(500).json({ error: 'Failed to download certificate.' });
    }
});

export default router;
