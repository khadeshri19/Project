Here is your complete **Technical Documentation (Tech Docs)** in proper Markdown format.

You can save this as:

```
certificate-system-technical-documentation.md
```

---

```md
# Technical Documentation
# Digital Certificate Generation & Verification System

---

# 1. System Overview

## 1.1 Purpose

This system enables a coaching institute to:

- Design certificate templates using custom images
- Add dynamic placeholders (Name, Course, Date, etc.)
- Drag and position text fields visually
- Generate single or bulk certificates
- Embed unique verification links
- Provide public certificate verification
- Allow admin user management

---

# 2. Technology Stack

## 2.1 Frontend

- React.js
- TypeScript
- Plain CSS
- react-draggable (for drag-and-drop fields)

## 2.2 Backend

- Express.js
- TypeScript
- Raw SQL queries (No ORM)
- JWT Authentication
- bcrypt (password hashing)
- uuid (verification code generation)
- pdf-lib or node-canvas (PDF generation)

## 2.3 Database

- PostgreSQL

---

# 3. System Architecture

## 3.1 High-Level Architecture

```

React Frontend (TypeScript)
|
|
Express API Server (TypeScript)
|
|
PostgreSQL Database
|
|
File Storage (Templates + Generated PDFs)

````

---

# 4. Core Modules

---

# 4.1 Authentication & Authorization Module

## Responsibilities

- User login
- Role-based access control
- Admin user management

## Roles

- admin
- instructor

## Security Mechanisms

- JWT access token
- bcrypt password hashing
- Middleware-based role validation

---

# 4.2 Template Management Module

## Upload Template

- Accepts PNG/JPG image
- Stores image in server storage
- Saves template metadata in database

## Template Designer

User can:

- Add placeholder fields:
  - student_name
  - course_name
  - completion_date
  - verification_link
  - custom fields

Each field supports:

- Drag positioning (X, Y)
- Font size
- Font family
- Font color
- Bold / Italic
- Alignment

Coordinates and style are saved in database.

---

# 4.3 Certificate Generation Module

---

## 4.3.1 Single Certificate Flow

1. User selects template
2. Enters student details:
   - Name
   - Course
   - Completion Date
3. Backend:
   - Generates UUID verification code
   - Fetches template + field layout
   - Renders dynamic text on template
   - Adds verification link:
     ```
     mywebsite.com/verify/{verificationCode}
     ```
   - Generates PDF
   - Saves certificate record in database
4. Returns downloadable PDF URL

---

## 4.3.2 Bulk Certificate Flow

1. Upload CSV file
2. Parse rows
3. For each row:
   - Generate UUID
   - Render PDF
   - Save record
4. Return ZIP file of certificates

---

# 4.4 Verification Module

## Public Route

````

GET /api/verify/:verificationCode

```

## Flow

1. User clicks link in certificate:
```

mywebsite.com/verify/{verificationCode}

````
2. Frontend calls backend API
3. Backend queries database
4. If found:
- Return certificate details
- status: verified
5. If not found:
- Return error

---

# 4.5 Admin Module

Admin can:

- Create users
- Delete users
- View all certificates
- Disable certificate

Admin-only endpoints protected by role middleware.

---

# 5. Database Design

---

## 5.1 Users Table

```sql
CREATE TABLE users (
 id UUID PRIMARY KEY,
 name VARCHAR(100),
 email VARCHAR(100) UNIQUE NOT NULL,
 password_hash TEXT NOT NULL,
 role VARCHAR(20) CHECK (role IN ('admin', 'instructor')),
 created_at TIMESTAMP DEFAULT NOW()
);
````

---

## 5.2 Templates Table

```sql
CREATE TABLE templates (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    template_image_path TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 5.3 Template Fields Table

```sql
CREATE TABLE template_fields (
    id UUID PRIMARY KEY,
    template_id UUID REFERENCES templates(id) ON DELETE CASCADE,
    field_type VARCHAR(50),
    position_x INT,
    position_y INT,
    font_size INT,
    font_color VARCHAR(20),
    font_family VARCHAR(50),
    is_bold BOOLEAN DEFAULT FALSE,
    is_italic BOOLEAN DEFAULT FALSE
);
```

---

## 5.4 Certificates Table

```sql
CREATE TABLE certificates (
    id UUID PRIMARY KEY,
    template_id UUID REFERENCES templates(id),
    user_id UUID REFERENCES users(id),
    student_name VARCHAR(150),
    course_name VARCHAR(150),
    completion_date DATE,
    verification_code UUID UNIQUE,
    pdf_path TEXT,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_verification_code ON certificates(verification_code);
```

---

# 6. API Specifications

---

## Authentication

POST /api/auth/login
POST /api/auth/register (admin only)

---

## Templates

POST /api/templates/upload
GET /api/templates
POST /api/templates/:id/fields
PUT /api/templates/:id/fields

---

## Certificates

POST /api/certificates/generate
POST /api/certificates/bulk
GET /api/certificates/:id
GET /api/certificates/download/:id

---

## Verification

GET /api/verify/:verificationCode

---

## Admin

POST /api/admin/create-user
DELETE /api/admin/delete-user/:id
GET /api/admin/users

---

# 7. Frontend Architecture

---

## Pages

* Login Page
* Dashboard
* Template Designer
* Certificate Generator
* Bulk Upload
* Verification Page
* Admin Panel

---

## Template Designer Implementation

* Render template image inside container
* Overlay draggable text components
* Use react-draggable
* Save position to backend

---

# 8. PDF Rendering Logic

Backend Steps:

1. Load template image
2. Initialize PDF document
3. Fetch template field configuration
4. Loop through fields:

   * Replace placeholders with actual values
   * Draw text at saved X/Y position
5. Embed verification URL
6. Save PDF file
7. Store path in database
8. Return download link

---

# 9. Security Considerations

* JWT expiration
* Password hashing (bcrypt)
* UUID v4 for verification
* HTTPS required
* Input validation
* Role-based middleware
* SQL parameterized queries (prevent SQL injection)

---

# 10. Performance Considerations

* Index verification_code column
* Use streaming for large bulk ZIP files
* Optimize PDF generation logic
* Limit file upload size

---

# 11. Deployment Architecture

* Node.js server (PM2)
* PostgreSQL hosted on server
* Nginx reverse proxy
* SSL (Let's Encrypt)
* File storage directory for:

  * Templates
  * Generated certificates

---

# 12. Future Enhancements

* QR Code embedded on certificate
* Email auto-delivery
* Digital signature support
* Certificate expiration control
* Analytics dashboard
* Blockchain-based verification

---

# 13. Conclusion

This system provides:

* Automated certificate generation
* Drag-and-drop certificate design
* Secure public verification
* Admin user control
* Scalable and secure architecture

The solution eliminates fake certificates and modernizes certificate management for the coaching institute.

