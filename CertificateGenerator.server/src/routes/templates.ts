import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db/pool';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// Configure multer for template uploads
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, path.join(__dirname, '..', '..', 'uploads'));
    },
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `template_${uuidv4()}${ext}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (_req, file, cb) => {
        const allowed = ['.png', '.jpg', '.jpeg'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Only PNG and JPG files are allowed.'));
        }
    },
});

// POST /api/templates/upload
router.post(
    '/upload',
    authMiddleware,
    upload.single('template'),
    async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            if (!req.file) {
                res.status(400).json({ error: 'Template image file is required.' });
                return;
            }

            const name = req.body.name || 'Untitled Template';
            const imagePath = `/uploads/${req.file.filename}`;

            const result = await pool.query(
                `INSERT INTO templates (user_id, name, template_image_path) 
         VALUES ($1, $2, $3) RETURNING *`,
                [req.user!.id, name, imagePath]
            );

            res.status(201).json({ template: result.rows[0] });
        } catch (error) {
            console.error('Template upload error:', error);
            res.status(500).json({ error: 'Failed to upload template.' });
        }
    }
);

// GET /api/templates
router.get('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const result = await pool.query(
            'SELECT * FROM templates WHERE user_id = $1 ORDER BY created_at DESC',
            [req.user!.id]
        );
        res.json({ templates: result.rows });
    } catch (error) {
        console.error('Fetch templates error:', error);
        res.status(500).json({ error: 'Failed to fetch templates.' });
    }
});

// GET /api/templates/:id
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const templateResult = await pool.query(
            'SELECT * FROM templates WHERE id = $1 AND user_id = $2',
            [id, req.user!.id]
        );

        if (templateResult.rows.length === 0) {
            res.status(404).json({ error: 'Template not found.' });
            return;
        }

        const fieldsResult = await pool.query(
            'SELECT * FROM template_fields WHERE template_id = $1',
            [id]
        );

        res.json({
            template: templateResult.rows[0],
            fields: fieldsResult.rows,
        });
    } catch (error) {
        console.error('Fetch template error:', error);
        res.status(500).json({ error: 'Failed to fetch template.' });
    }
});

// POST /api/templates/:id/fields
router.post('/:id/fields', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { fields } = req.body; // Array of field objects

        if (!Array.isArray(fields) || fields.length === 0) {
            res.status(400).json({ error: 'Fields array is required.' });
            return;
        }

        // Verify template ownership
        const templateCheck = await pool.query(
            'SELECT id FROM templates WHERE id = $1 AND user_id = $2',
            [id, req.user!.id]
        );

        if (templateCheck.rows.length === 0) {
            res.status(404).json({ error: 'Template not found.' });
            return;
        }

        const insertedFields = [];
        for (const field of fields) {
            const result = await pool.query(
                `INSERT INTO template_fields 
         (template_id, field_type, label, position_x, position_y, font_size, font_color, font_family, is_bold, is_italic, text_align)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
                [
                    id,
                    field.field_type,
                    field.label || field.field_type,
                    field.position_x ?? 0,
                    field.position_y ?? 0,
                    field.font_size || 16,
                    field.font_color || '#000000',
                    field.font_family || 'Helvetica',
                    field.is_bold || false,
                    field.is_italic || false,
                    field.text_align || 'left',
                ]
            );
            insertedFields.push(result.rows[0]);
        }

        res.status(201).json({ fields: insertedFields });
    } catch (error) {
        console.error('Save fields error:', error);
        res.status(500).json({ error: 'Failed to save fields.' });
    }
});

// PUT /api/templates/:id/fields
router.put('/:id/fields', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { fields, canvas_width, canvas_height } = req.body;

        if (!Array.isArray(fields)) {
            res.status(400).json({ error: 'Fields array is required.' });
            return;
        }

        // Verify template ownership
        const templateCheck = await pool.query(
            'SELECT id FROM templates WHERE id = $1 AND user_id = $2',
            [id, req.user!.id]
        );

        if (templateCheck.rows.length === 0) {
            res.status(404).json({ error: 'Template not found.' });
            return;
        }

        // Generate new preview certificate ID and verification code on every save
        const previewCertificateId = `CERT-${uuidv4().split('-')[0].toUpperCase()}`;
        const previewVerificationCode = uuidv4().split('-')[0].toUpperCase();

        // Save the canvas display dimensions and preview IDs on the template
        const updateParts = [
            'preview_certificate_id = $1',
            'preview_verification_code = $2',
        ];
        const updateValues: any[] = [previewCertificateId, previewVerificationCode];
        let paramIndex = 3;

        if (canvas_width && canvas_height) {
            updateParts.push(`canvas_width = $${paramIndex}`);
            paramIndex++;
            updateParts.push(`canvas_height = $${paramIndex}`);
            paramIndex++;
            updateValues.push(canvas_width, canvas_height);
            console.log(`[TEMPLATE] Saved canvas size: ${canvas_width}x${canvas_height}`);
        }

        updateValues.push(id);
        await pool.query(
            `UPDATE templates SET ${updateParts.join(', ')} WHERE id = $${paramIndex}`,
            updateValues
        );

        console.log(`[TEMPLATE] New preview IDs — Certificate: ${previewCertificateId}, Verification: ${previewVerificationCode}`);

        // Delete existing fields and re-insert
        await pool.query('DELETE FROM template_fields WHERE template_id = $1', [id]);

        const insertedFields = [];
        for (const field of fields) {
            console.log(`[TEMPLATE] Saving field: ${field.field_type} at (${field.position_x}, ${field.position_y}) size=${field.font_size}`);
            const result = await pool.query(
                `INSERT INTO template_fields 
         (template_id, field_type, label, position_x, position_y, font_size, font_color, font_family, is_bold, is_italic, text_align)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
                [
                    id,
                    field.field_type,
                    field.label || field.field_type,
                    field.position_x ?? 0,
                    field.position_y ?? 0,
                    field.font_size || 16,
                    field.font_color || '#000000',
                    field.font_family || 'Helvetica',
                    field.is_bold || false,
                    field.is_italic || false,
                    field.text_align || 'left',
                ]
            );
            insertedFields.push(result.rows[0]);
        }

        res.json({
            fields: insertedFields,
            preview_certificate_id: previewCertificateId,
            preview_verification_code: previewVerificationCode,
        });
    } catch (error) {
        console.error('Update fields error:', error);
        res.status(500).json({ error: 'Failed to update fields.' });
    }
});

// DELETE /api/templates/:id
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        // Verify template ownership and get image path
        const templateResult = await pool.query(
            'SELECT * FROM templates WHERE id = $1 AND user_id = $2',
            [id, req.user!.id]
        );

        if (templateResult.rows.length === 0) {
            res.status(404).json({ error: 'Template not found.' });
            return;
        }

        const template = templateResult.rows[0];

        // Delete associated certificate PDFs from disk
        const certsResult = await pool.query(
            'SELECT pdf_path FROM certificates WHERE template_id = $1',
            [id]
        );
        for (const cert of certsResult.rows) {
            if (cert.pdf_path) {
                const pdfFullPath = path.join(__dirname, '..', '..', cert.pdf_path.replace(/^\//, ''));
                if (fs.existsSync(pdfFullPath)) {
                    fs.unlinkSync(pdfFullPath);
                    console.log(`[TEMPLATE] Deleted certificate PDF: ${pdfFullPath}`);
                }
            }
        }

        // Delete associated certificates from DB
        await pool.query('DELETE FROM certificates WHERE template_id = $1', [id]);

        // Delete the template (cascade will remove template_fields)
        await pool.query('DELETE FROM templates WHERE id = $1', [id]);

        // Delete the template image file from disk
        if (template.template_image_path) {
            const imagePath = path.join(__dirname, '..', '..', template.template_image_path.replace(/^\//, ''));
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
                console.log(`[TEMPLATE] Deleted template image: ${imagePath}`);
            }
        }

        console.log(`[TEMPLATE] Deleted template: ${template.name} (${id})`);
        res.json({ message: 'Template deleted successfully.' });
    } catch (error) {
        console.error('Delete template error:', error);
        res.status(500).json({ error: 'Failed to delete template.' });
    }
});

export default router;
