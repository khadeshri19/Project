# Product Requirements Document (PRD)

---

# 1. Product Title

## Digital Certificate Generation & Verification System

---

# 2. Problem Statement

You run a coaching class teaching Full Stack Development.  
At course completion, you issue certificates.

## Current Problems

- Certificates cannot be verified.
- Manual certificate creation is time-consuming.
- No centralized record of issued certificates.
- No anti-fraud verification mechanism.

## You Need

- Dynamic certificate generation from custom templates.
- Drag-and-drop placeholder positioning.
- Unique verification link per certificate.
- Public verification page.
- Admin-controlled user system.

---

# 3. Product Vision

Build a web-based platform that allows:

- Uploading certificate template images
- Designing dynamic fields (Name, Course, Date, etc.)
- Generating single or bulk certificates
- Adding auto-generated verification links
- Public certificate verification via URL
- Admin-based user management

---

# 4. Target Users

## 4.1 Admin

- Full control
- Create/delete users
- View all certificates
- Manage system

## 4.2 Instructor/User

- Upload template
- Generate certificates
- Manage students
- Download certificates

## 4.3 Public Verifier

- Verify certificate using link
- View student details

---

# 5. Functional Requirements

---

## 5.1 Authentication & Authorization

### Roles

- Admin
- Instructor/User

### Features

- Login (JWT-based authentication)
- Role-based access control

### Admin Capabilities

- Create new users
- Delete users
- Reset passwords

---

## 5.2 Certificate Template Management

### Feature: Upload Template

- User uploads image (PNG/JPG)
- Image stored in server storage
- Template metadata saved in database

---

### Feature: Drag & Drop Field Designer

User can add text field placeholders:

- Student Name
- Course Name
- Completion Date
- Certificate ID
- Verification Link
- Custom Fields

Each field should support:

- Draggable positioning
- Font size selection
- Font family selection
- Text color
- Bold/Italic toggle
- Text alignment
- Preview mode

Template must store:

- X position
- Y position
- Font size
- Color
- Field type

---

## 5.3 Certificate Generation

### 5.3.1 Single Certificate

User enters:

- Student Name
- Course Name
- Completion Date

System:

- Generates unique verification code (UUID)
- Renders template with dynamic text
- Embeds verification URL:mywebsite.com/verify/{verificationCode}
- Generates downloadable PDF
- Saves record in database

---

### 5.3.2 Bulk Certificate Generation

User uploads CSV file containing:

- Name
- Course
- Completion Date
- Email (optional)

System:

- Generates certificate for each row
- Creates unique verification ID per student
- Stores records
- Allows:
  - Download all as ZIP
  - Send email (future feature)

---

## 5.4 Verification System

### Public Route
mywebsite.com/verify/{verificationCode}

When accessed, system fetches:

- Student Name
- Course Name
- Completion Date
- Certificate ID
- Issued by
- Issue date

Display:

- ✔ Certificate Verified  
- ❌ Invalid Certificate

---

## 5.5 Admin Panel

Admin can:

- Create user
- Delete user
- View all certificates
- Disable certificate
- View system analytics

---

# 6. Non-Functional Requirements

## Performance

- Generate certificate under 2 seconds
- Bulk generation (100 certificates) < 30 seconds

## Security

- JWT authentication
- Password hashing (bcrypt)
- Secure verification code (UUID v4)
- HTTPS required

## Scalability

- Support 10,000+ certificates
- Indexed `verification_code` column

## Reliability

- Certificates stored permanently
- PostgreSQL backups enabled

---

# 7. System Architecture

---

## 7.1 Tech Stack

### Frontend

- React.js
- TypeScript
- Plain CSS

### Backend

- Express.js
- TypeScript
- No ORM
- Raw SQL queries

### Database

- PostgreSQL

---

## 7.2 High-Level Architecture

React Frontend
|
|
Express API (TypeScript)
|
PostgreSQL Database
|
File Storage (Template + Generated PDFs)


---

# 8. Database Design (PostgreSQL - No ORM)

---

## 8.1 Users Table

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100) UNIQUE,
    password_hash TEXT,
    role VARCHAR(20), -- admin | instructor
    created_at TIMESTAMP DEFAULT NOW()
);

### 8.2 Templates Table
CREATE TABLE templates (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    template_image_path TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

8.3 Template Fields Table
CREATE TABLE template_fields (
    id UUID PRIMARY KEY,
    template_id UUID REFERENCES templates(id),
    field_type VARCHAR(50), -- name, course, date, verification_link
    position_x INT,
    position_y INT,
    font_size INT,
    font_color VARCHAR(20),
    font_family VARCHAR(50)
);
8.4 Certificates Table
CREATE TABLE certificates (
    id UUID PRIMARY KEY,
    template_id UUID REFERENCES templates(id),
    user_id UUID REFERENCES users(id),
    student_name VARCHAR(150),
    course_name VARCHAR(150),
    completion_date DATE,
    verification_code UUID UNIQUE,
    created_at TIMESTAMP DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'active'
);
# 9. API Endpoints

---

## Authentication

- **POST** `/api/auth/login`
- **POST** `/api/auth/register` _(Admin only)_

---

## Templates

- **POST** `/api/templates/upload`
- **GET** `/api/templates`
- **POST** `/api/templates/:id/fields`
- **PUT** `/api/templates/:id/fields`

---

## Certificates

- **POST** `/api/certificates/generate`
- **POST** `/api/certificates/bulk`
- **GET** `/api/certificates/:id`
- **GET** `/api/certificates/download/:id`

---

## Verification

- **GET** `/api/verify/:verificationCode`

---

## Admin

- **POST** `/api/admin/create-user`
- **DELETE** `/api/admin/delete-user/:id`
- **GET** `/api/admin/users`

---

# 10. Frontend Requirements

---

## Pages

- Login Page
- Dashboard
- Template Designer Page
- Certificate Generator Page
- Bulk Upload Page
- Verification Public Page
- Admin Panel

---

## Drag & Drop Implementation

Use:

- `react-draggable` or custom implementation

---

## Template Editor Flow

1. Upload image
2. Render image in canvas container
3. Add draggable text boxes
4. Save coordinates to backend

---

# 11. Certificate Rendering Logic

Backend should:

1. Load template image
2. Use one of the following libraries:
   - `pdf-lib`
   - `node-canvas`
3. Place dynamic text at saved coordinates
4. Generate PDF
5. Store file path
6. Return download URL

---

# 12. Verification Flow

User clicks:mywebsite.com/verify/1234-uuid


Frontend:

- Calls backend API
- Displays certificate details
- Shows **Verified** or **Not Found**

---

# 13. Future Enhancements

- QR Code on certificate
- Email certificate automatically
- Digital signature
- Certificate expiration
- Blockchain verification
- Analytics dashboard

---

# 14. Risks

- Incorrect coordinate placement
- PDF rendering font issues
- Security of verification codes
- Large bulk upload performance issues

---

# 15. Milestone Plan

---

## Phase 1

- Authentication
- Template upload
- Drag & drop fields
- Single certificate generation

---

## Phase 2

- Bulk upload
- Verification page
- Admin panel

---

## Phase 3

- Optimization
- Security hardening
- UI polish

---

# 16. Success Metrics

- 100% certificates verifiable
- Certificate generation < 2 seconds
- 0 duplicate verification codes
- Admin user management fully functional

---

# 17. Conclusion

This system will:

- ✔ Eliminate fake certificates
- ✔ Automate certificate generation
- ✔ Enable public verification
- ✔ Provide admin control
- ✔ Support bulk operations

---

