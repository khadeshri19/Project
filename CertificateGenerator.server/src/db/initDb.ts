import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import pool from './pool';

export async function initDb(): Promise<void> {
    try {
        const sqlPath = path.join(__dirname, 'init.sql');
        const sql = fs.readFileSync(sqlPath, 'utf-8');
        await pool.query(sql);

        // Ensure verification_code is VARCHAR to support short custom codes
        await pool.query(`
            DO $$ 
            BEGIN 
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'certificates' 
                    AND column_name = 'verification_code' 
                    AND data_type = 'uuid'
                ) THEN
                    ALTER TABLE certificates ALTER COLUMN verification_code TYPE VARCHAR(50);
                END IF;
            END $$;
        `);

        // Add canvas_width and canvas_height to templates if missing
        await pool.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'templates' 
                    AND column_name = 'canvas_width'
                ) THEN
                    ALTER TABLE templates ADD COLUMN canvas_width INT DEFAULT 0;
                    ALTER TABLE templates ADD COLUMN canvas_height INT DEFAULT 0;
                END IF;
            END $$;
        `);

        // Alter position columns to REAL for precise draggable positions
        await pool.query(`
            DO $$ 
            BEGIN 
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'template_fields' 
                    AND column_name = 'position_x' 
                    AND data_type = 'integer'
                ) THEN
                    ALTER TABLE template_fields ALTER COLUMN position_x TYPE REAL;
                    ALTER TABLE template_fields ALTER COLUMN position_y TYPE REAL;
                END IF;
            END $$;
        `);

        // Add preview ID columns to templates if missing
        await pool.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'templates' 
                    AND column_name = 'preview_certificate_id'
                ) THEN
                    ALTER TABLE templates ADD COLUMN preview_certificate_id VARCHAR(20);
                    ALTER TABLE templates ADD COLUMN preview_verification_code VARCHAR(50);
                END IF;
            END $$;
        `);

        console.log('Database tables initialized and verified');

        // Seed admin user if not exists
        const adminCheck = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            ['admin@sarvarth.com']
        );

        if (adminCheck.rows.length === 0) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await pool.query(
                `INSERT INTO users (name, email, password_hash, role) 
         VALUES ($1, $2, $3, $4)`,
                ['Admin', 'admin@sarvarth.com', hashedPassword, 'admin']
            );
            console.log('Admin user seeded (admin@sarvarth.com / admin123)');
        }

        // Ensure upload and generated directories exist
        const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
        const generatedDir = path.join(__dirname, '..', '..', 'generated');
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
        if (!fs.existsSync(generatedDir)) fs.mkdirSync(generatedDir, { recursive: true });

    } catch (error) {
        console.error('Database initialization failed:', error);
        throw error;
    }
}
