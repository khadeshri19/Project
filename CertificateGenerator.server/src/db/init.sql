-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) CHECK (role IN ('admin', 'user')) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Templates table
CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL DEFAULT 'Untitled Template',
    template_image_path TEXT NOT NULL,
    canvas_width INT DEFAULT 0,
    canvas_height INT DEFAULT 0,
    preview_certificate_id VARCHAR(20),
    preview_verification_code VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Template fields table
CREATE TABLE IF NOT EXISTS template_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES templates(id) ON DELETE CASCADE,
    field_type VARCHAR(50) NOT NULL,
    label VARCHAR(100),
    position_x REAL NOT NULL DEFAULT 0,
    position_y REAL NOT NULL DEFAULT 0,
    font_size INT NOT NULL DEFAULT 16,
    font_color VARCHAR(20) NOT NULL DEFAULT '#000000',
    font_family VARCHAR(50) NOT NULL DEFAULT 'Helvetica',
    is_bold BOOLEAN DEFAULT FALSE,
    is_italic BOOLEAN DEFAULT FALSE,
    text_align VARCHAR(20) DEFAULT 'left'
);

-- Certificates table
CREATE TABLE IF NOT EXISTS certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES templates(id),
    user_id UUID REFERENCES users(id),
    student_name VARCHAR(150) NOT NULL,
    course_name VARCHAR(150) NOT NULL,
    completion_date DATE NOT NULL,
    verification_code VARCHAR(50) UNIQUE NOT NULL,
    pdf_path TEXT,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast verification lookups
CREATE INDEX IF NOT EXISTS idx_verification_code ON certificates(verification_code);
