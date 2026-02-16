# TODO — Digital Certificate Generation & Verification System

> Derived from **PRD1.md** and **TechStack.md**

---

## Phase 1 — Core Foundation

### 1. Project Setup
- [ ] Initialize React.js frontend with TypeScript
- [ ] Initialize Express.js backend with TypeScript
- [ ] Set up PostgreSQL database connection (raw SQL, no ORM)
- [ ] Configure project folder structure (frontend / backend)
- [ ] Set up environment variables (`.env` for DB, JWT secret, etc.)
- [ ] Install core dependencies:
  - **Frontend:** react, react-dom, typescript, react-draggable, react-router-dom
  - **Backend:** express, pg, jsonwebtoken, bcrypt, uuid, pdf-lib (or node-canvas), multer, cors
- [ ] Set up dev scripts (`npm run dev` for both frontend & backend)

---

### 2. Database Setup
- [ ] Create `users` table (id, name, email, password_hash, role, created_at)
- [ ] Create `templates` table (id, user_id, template_image_path, created_at)
- [ ] Create `template_fields` table (id, template_id, field_type, position_x, position_y, font_size, font_color, font_family, is_bold, is_italic)
- [ ] Create `certificates` table (id, template_id, user_id, student_name, course_name, completion_date, verification_code, pdf_path, status, created_at)
- [ ] Add index on `verification_code` column
- [ ] Seed admin user into the database

---

### 3. Authentication & Authorization
- [ ] **Backend:**
  - [ ] `POST /api/auth/login` — validate credentials, return JWT
  - [ ] `POST /api/auth/register` — admin-only route to create users
  - [ ] Implement JWT middleware for protected routes
  - [ ] Implement role-based middleware (`admin` / `instructor`)
  - [ ] Password hashing with bcrypt
- [ ] **Frontend:**
  - [ ] Build Login Page (email + password form)
  - [ ] Store JWT in local storage / cookie
  - [ ] Implement protected route wrapper (redirect if unauthenticated)
  - [ ] Role-based redirection (`/admin/dashboard` or `/user/dashboard`)
  - [ ] Client-side email & password validation

---

### 4. Template Upload
- [ ] **Backend:**
  - [ ] `POST /api/templates/upload` — accept PNG/JPG image via multer
  - [ ] Save image to server file storage
  - [ ] Save template metadata (user_id, image path) to `templates` table
  - [ ] `GET /api/templates` — list all templates for the logged-in user
- [ ] **Frontend:**
  - [ ] Build Template Upload UI (file picker + upload button)
  - [ ] Display list of uploaded templates on the dashboard
  - [ ] Show template thumbnail preview

---

### 5. Drag & Drop Field Designer
- [ ] **Frontend:**
  - [ ] Render uploaded template image inside a canvas container
  - [ ] Implement draggable text field overlay using `react-draggable`
  - [ ] Allow adding field types: Student Name, Course Name, Completion Date, Certificate ID, Verification Link, Custom Fields
  - [ ] Each field supports:
    - [ ] Draggable positioning (X, Y)
    - [ ] Font size selection
    - [ ] Font family selection
    - [ ] Text color picker
    - [ ] Bold / Italic toggle
    - [ ] Text alignment
  - [ ] Preview mode — render all fields on the template image
  - [ ] Save field positions & styles to backend
- [ ] **Backend:**
  - [ ] `POST /api/templates/:id/fields` — save field configurations
  - [ ] `PUT /api/templates/:id/fields` — update field configurations
  - [ ] Store each field's position, style, and type in `template_fields` table

---

### 6. Single Certificate Generation
- [ ] **Frontend:**
  - [ ] Build Certificate Generator Page
  - [ ] Form to enter: Student Name, Course Name, Completion Date
  - [ ] Template selector dropdown
  - [ ] "Generate" button with loading state
  - [ ] Display download link for generated PDF
- [ ] **Backend:**
  - [ ] `POST /api/certificates/generate`
    - [ ] Generate UUID verification code
    - [ ] Fetch template image + field layout from DB
    - [ ] Load template image using `pdf-lib` or `node-canvas`
    - [ ] Render dynamic text at saved X/Y coordinates
    - [ ] Embed verification URL: `mywebsite.com/verify/{verificationCode}`
    - [ ] Generate downloadable PDF
    - [ ] Save certificate record in `certificates` table
    - [ ] Store PDF file path in DB
  - [ ] `GET /api/certificates/:id` — get certificate details
  - [ ] `GET /api/certificates/download/:id` — return PDF file

---

## Phase 2 — Advanced Features

### 7. Bulk Certificate Generation
- [ ] **Frontend:**
  - [ ] Build Bulk Upload Page
  - [ ] CSV file upload UI (drag & drop or file picker)
  - [ ] Show CSV preview table before generating
  - [ ] Progress indicator during bulk generation
  - [ ] Download all certificates as ZIP
- [ ] **Backend:**
  - [ ] `POST /api/certificates/bulk`
    - [ ] Parse CSV file (Name, Course, Completion Date, Email)
    - [ ] For each row: generate UUID, render PDF, save record
    - [ ] Bundle all PDFs into a ZIP file
    - [ ] Use streaming for large ZIP files
    - [ ] Return ZIP download link

---

### 8. Public Verification Page
- [ ] **Frontend:**
  - [ ] Build Verification Page at `/verify/:verificationCode`
  - [ ] Call backend API on page load
  - [ ] If found → display: Student Name, Course Name, Completion Date, Certificate ID, Issued By, Issue Date + ✔ Certificate Verified badge
  - [ ] If not found → display ❌ Invalid Certificate message
  - [ ] Make page publicly accessible (no auth required)
- [ ] **Backend:**
  - [ ] `GET /api/verify/:verificationCode`
    - [ ] Query `certificates` table by `verification_code`
    - [ ] Return certificate details or 404 error

---

### 9. Admin Panel
- [ ] **Frontend:**
  - [ ] Build Admin Panel page (admin-only route)
  - [ ] User Management:
    - [ ] Create new user form (name, email, password, role)
    - [ ] Users table (Name, Email, Role, Joined At, Actions)
    - [ ] Delete user button with confirmation
    - [ ] Reset password functionality
  - [ ] Certificate Management:
    - [ ] View all certificates in a searchable table
    - [ ] Disable / revoke certificate toggle
  - [ ] System Analytics overview (total users, total certificates, etc.)
- [ ] **Backend:**
  - [ ] `POST /api/admin/create-user` — create new user (admin only)
  - [ ] `DELETE /api/admin/delete-user/:id` — delete user (admin only)
  - [ ] `GET /api/admin/users` — list all users (admin only)
  - [ ] Endpoint to disable/activate a certificate

---

## Phase 3 — Polish & Production

### 10. Security Hardening
- [ ] Enforce HTTPS
- [ ] JWT token expiration & refresh strategy
- [ ] SQL parameterized queries everywhere (prevent SQL injection)
- [ ] Input validation & sanitization on all endpoints
- [ ] Limit file upload size (templates & CSVs)
- [ ] Rate limiting on auth routes
- [ ] Secure verification codes (UUID v4)

---

### 11. Performance Optimization
- [ ] Certificate generation under 2 seconds (single)
- [ ] Bulk generation (100 certificates) under 30 seconds
- [ ] Verify `verification_code` index is working efficiently
- [ ] Optimize PDF rendering logic
- [ ] Lazy-load frontend pages / code splitting

---

### 12. UI Polish & Dashboard
- [ ] Build Dashboard page (landing page after login)
  - [ ] Show recent certificates
  - [ ] Quick actions: Create Template, Generate Certificate, Bulk Upload
  - [ ] Summary stats (total templates, total certificates)
- [ ] Responsive design across all pages
- [ ] Loading states & error handling on every page
- [ ] Toast notifications for success / error actions
- [ ] Consistent styling with Plain CSS design system

---

### 13. Deployment
- [ ] Set up Node.js server with PM2
- [ ] Configure Nginx reverse proxy
- [ ] Set up SSL with Let's Encrypt
- [ ] Configure PostgreSQL backups
- [ ] Set up file storage directories (templates + generated PDFs)
- [ ] Environment variable management for production

---

## Future Enhancements (Post-Launch)
- [ ] QR Code embedded on certificates
- [ ] Email certificate automatically to students
- [ ] Digital signature support
- [ ] Certificate expiration control
- [ ] Analytics dashboard with detailed metrics
- [ ] Blockchain-based verification
