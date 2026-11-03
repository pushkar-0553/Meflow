# VCube MeFlow
## Digital Marketing Team HRMS & Content Production Management System

VCube MeFlow is a workflow-driven operations platform designed specifically for digital marketing departments. It eliminates chaotic WhatsApp groups and untracked spreadsheets by orchestrating content creation around a deterministic pipeline:

**People & Roles $\rightarrow$ Dynamic Permissions $\rightarrow$ Tasks $\rightarrow$ Self-Claim Work Pool $\rightarrow$ Production Stages $\rightarrow$ Proof of Action $\rightarrow$ Manager Approval $\rightarrow$ Social Publishing $\rightarrow$ Audit History**

---

### Tech Stack
- **Frontend:** React 18, Vite, React Router v6, Tailwind CSS, Lucide Icons, Axios.
- **Backend:** Node.js, Express.js, `mysql2/promise`, `express-session` with persistent store.
- **Database:** TiDB Cloud Serverless / MySQL 8.0 with ACID transactions and atomic concurrency guards.
- **Email:** Resend HTTPS REST API (Port 443) with automatic console simulation fallback during development.
- **Proof Storage:** Cloudinary (for photo/screenshot proofs) + External Drive URLs (Google Drive / Frame.io for raw footage) + Text Notes.

---

### Quick Start (Local Development)

#### 1. Setup Environment
Configure `backend/.env` (a template is available in `backend/.env.example`):
```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
SESSION_SECRET=meflow-secure-dev-session-secret-min-32-chars

# TiDB Cloud Serverless or MySQL Connection
DB_HOST=gateway01.us-east-1.prod.aws.tidbcloud.com
DB_PORT=4000
DB_USER=your_user.root
DB_PASSWORD=your_password
DB_NAME=meflow
DB_SSL=true

# Resend HTTPS Email (Optional in dev - logs to console if empty)
RESEND_API_KEY=

# Cloudinary (Optional in dev - simulated if empty)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

#### 2. Run Database Migrations & Seeds
Once your database credentials are set in `backend/.env`:
```bash
npm run migrate
npm run seed
```
This initializes all 16 relational tables and seeds the 46 permissions, 9 core roles, and the default Administrator account (`admin@vcube.com` / `Admin@12345`).

#### 3. Start Development Servers
In separate terminals:
```bash
# Terminal 1: Backend API (http://localhost:5000)
npm run dev:backend

# Terminal 2: Frontend SPA (http://localhost:5173)
npm run dev:frontend
```

---

### Project Structure
```text
vcube-meflow/
├── backend/
│   ├── src/
│   │   ├── config/        # Environment, TiDB database pool
│   │   ├── db/            # Schema DDL migrations and seed scripts
│   │   ├── middleware/    # Error handling, persistent session, RBAC
│   │   ├── routes/        # Modular REST API endpoints
│   │   ├── services/      # Email (Resend HTTPS) & Storage (Cloudinary)
│   │   ├── utils/         # Standardized API response helpers, Logger
│   │   ├── app.js         # Express app configuration & middleware
│   │   └── server.js      # Server boot & graceful shutdown
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/           # Axios client with interceptors
│   │   ├── components/    # Navbar, Sidebar, StatCards, StatusBadges, Skeletons
│   │   ├── context/       # AuthContext (sessions, permissions) & ToastContext
│   │   ├── pages/         # Login, SetPassword, AdminDashboard, EmployeeDashboard
│   │   ├── App.jsx        # Routing table & role layout guards
│   │   └── main.jsx       # React entry point
│   └── package.json
└── docs/
    └── STAGE_0_ARCHITECTURE_SPECIFICATION.md
```
