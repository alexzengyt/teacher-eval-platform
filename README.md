# 🎓 Teacher Evaluation Platform

> A comprehensive, microservices-based faculty evaluation system featuring OAuth 2.0 SSO integration, OneRoster 1.1 API compliance, real-time data synchronization, and advanced analytics dashboards.

[![Live Demo](https://img.shields.io/badge/demo-live-success?style=for-the-badge)](https://teacher-eval-platform.vercel.app)
[![Docker](https://img.shields.io/badge/docker-ready-blue?style=for-the-badge&logo=docker)](docker-compose.yml)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue?style=for-the-badge&logo=postgresql)](https://www.postgresql.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20-green?style=for-the-badge&logo=node.js)](https://nodejs.org/)

---

## 🌐 Live Demo

### 🚀 **Try it Now: [teacher-eval-platform.vercel.app](https://teacher-eval-platform.vercel.app)**

**Test Credentials:**
- **Demo User**: `demo@school.com` / `pass123`
- **Administrator**: `admin@school.com` / `admin123`

> **📝 Note:** The live demo showcases the frontend UI/UX only. For full backend functionality including OAuth SSO, real-time data sync, and analytics, please run the project locally (see [Quick Start](#-quick-start)).

### 📹 **Full Feature Demo**
For a complete walkthrough including OAuth SSO integration, OneRoster data synchronization, webhook subscriptions, and analytics dashboards, please see the video demonstration or run the project locally.

---

## ✨ Key Features

### 🔐 Authentication & Authorization
- **JWT-based Authentication** with 2-hour token expiration
- **OAuth 2.0 Authorization Code Flow** implementation
- **Schoolday SSO Integration** with automatic user provisioning
- **Role-based Access Control** (Admin, Teacher, User roles)
- Secure token management with automatic refresh

### 👥 Faculty Management
- **Full CRUD Operations** for teacher records
- **Advanced Search & Filtering** by name, email, source
- **Pagination Support** with customizable page sizes
- **Real-time Updates** via OneRoster sync
- **External ID Mapping** for seamless integration
- **Roster-only Filtering** to distinguish imported vs manual entries

### 🔄 Data Integration (OneRoster 1.1)
- **Discovery API** for provider endpoints
- **Users API** with role filtering (teachers)
- **Classes API** for course information
- **Enrollments API** for teaching assignments
- **Organizations API** for school structure
- **Automated Sync Pipeline** with transaction safety
- **Webhook Subscriptions** for real-time updates
- **Intelligent Data Linking** (email-based teacher matching)

### 📊 Analytics & Reporting
- **Performance Dashboards** with Chart.js visualizations
  - Time-series analysis of teacher evaluations
  - Top performers ranking
  - Subject distribution analytics
  - Peer comparison charts
- **Export Capabilities**
  - CSV export for data analysis
  - PDF export for printable reports
- **Activity Tracking**
  - Daily submission/publication metrics
  - Teacher progress monitoring
- **Responsive Charts** (Bar, Line, Radar, Doughnut)

### 🎨 Modern User Interface
- **Glassmorphism Design** with backdrop blur effects
- **Gradient Themes** with purple/indigo color scheme
- **Responsive Layout** (mobile-first approach)
- **Smooth Animations** and transitions
- **WCAG 2.1 Compliant** accessibility features
- **Real-time Feedback** with loading states and error handling

---

## 🏗️ System Architecture

### Microservices Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser                              │
│                    (React + Vite SPA)                        │
│                    localhost:5173                            │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway (Nginx)                       │
│                     localhost:8080                           │
│  Routes: /api/auth/*, /api/eval/*, /api/integration/*      │
└──────┬─────────────────┬──────────────────┬─────────────────┘
       │                 │                  │
       ↓                 ↓                  ↓
┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐
│ Auth Service │  │  Evaluation  │  │ Data Integration     │
│   :3001      │  │   Service    │  │    Service           │
│              │  │   :3002      │  │    :7002             │
│ • JWT Auth   │  │ • Teachers   │  │ • OneRoster Sync     │
│ • OAuth 2.0  │  │ • Analytics  │  │ • Webhook Handler    │
│ • SSO Login  │  │ • Reports    │  │ • Auto Linking       │
└──────────────┘  └──────┬───────┘  └─────────┬────────────┘
                         │                     │
                         │                     ↓
                         │            ┌─────────────────┐
                         │            │ Mock Schoolday  │
                         │            │    Service      │
                         │            │    :7001        │
                         │            │ • OAuth Server  │
                         │            │ • OneRoster API │
                         │            │ • Discovery     │
                         │            └─────────────────┘
                         │
                         ↓
                  ┌──────────────┐
                  │  PostgreSQL  │
                  │    :5432     │
                  │ • Core Tables│
                  │ • Roster     │
                  │ • Sync Logs  │
                  └──────────────┘
```

### Service Overview

| Service | Responsibility | Technology | Port |
|---------|---------------|------------|------|
| **Frontend** | React SPA UI | React 18, Vite 5 | 5173 |
| **API Gateway** | Reverse proxy & routing | Nginx 1.25 | 8080 |
| **Auth Service** | Authentication & SSO | Node.js 20, Express, JWT | 3001 |
| **Evaluation Service** | Core business logic | Node.js 20, Express, PostgreSQL | 3002 |
| **Data Integration** | OneRoster sync & webhooks | Node.js 20, Express | 7002 |
| **Mock Schoolday** | SIS provider simulator | Node.js 20, Express | 7001 |
| **PostgreSQL** | Primary database | PostgreSQL 15 | 5432 |

---

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js 20 LTS
- **Framework**: Express.js
- **Database**: PostgreSQL 15
- **Authentication**: JWT (jsonwebtoken)
- **OAuth 2.0**: Authorization Code Flow implementation
- **API Gateway**: Nginx with reverse proxy
- **Containerization**: Docker & Docker Compose

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite 5
- **Styling**: Inline CSS with modern design patterns
- **Charts**: Chart.js for data visualization
- **State Management**: React Hooks (useState, useEffect)
- **HTTP Client**: Fetch API with custom wrapper

### Integration Standards
- **OneRoster 1.1**: Full API compliance
- **OAuth 2.0**: RFC 6749 compliant
- **RESTful API**: Resource-based endpoints
- **JWT**: RFC 7519 compliant tokens

### DevOps
- **Containerization**: Docker multi-stage builds
- **Orchestration**: Docker Compose
- **Version Control**: Git
- **Deployment**: Vercel (frontend), Docker (backend)

---

## 🚀 Quick Start

### Prerequisites

- **Docker Desktop** (recommended) - [Download](https://www.docker.com/products/docker-desktop)
- **Node.js 20+** (for local development) - [Download](https://nodejs.org/)
- **Git** - [Download](https://git-scm.com/)

### Installation

#### Option 1: Docker (Recommended) ⭐

1. **Clone the repository**
   ```bash
   git clone https://github.com/alexzengyt/teacher-eval-platform.git
   cd teacher-eval-platform
   ```

2. **Create environment files**
   ```bash
   # Create .env for shared configuration
   cat > .env << EOF
   AUTH_JWT_SECRET=my-super-secret-jwt-key-for-teacher-eval-2025
   DB_PORT=5432
   EOF

   # Create .env.db for database credentials
   cat > .env.db << EOF
   POSTGRES_USER=te_user
   POSTGRES_PASSWORD=te_pass_Dev123!
   POSTGRES_DB=teacher_eval
   EOF
   ```

3. **Start all services**
   ```bash
   docker compose up --build
   ```
   
   Wait for all services to start (approximately 30-60 seconds).

4. **Access the application**
   - **Frontend**: http://localhost:5173
   - **API Gateway**: http://localhost:8080
   - **Gateway Health**: http://localhost:8080/health
   - **Mock Schoolday**: http://localhost:7001

5. **Login with demo credentials**
   - Demo User: `demo@school.com` / `pass123`
   - Administrator: `admin@school.com` / `admin123`

6. **Stop all services**
   ```bash
   docker compose down
   ```

#### Option 2: Individual Service Development

See [DEVELOPMENT.md](./docs/DEVELOPMENT.md) for detailed instructions on running services individually for development.

---

## 📖 Using the Platform

### Step-by-Step Guide

#### 1. **Login**
- Navigate to http://localhost:5173
- Use demo credentials or try Schoolday SSO
- JWT token is stored securely in localStorage

#### 2. **Browse Teachers**
- View paginated teacher list
- Search by name or email
- Filter by source (roster-imported vs manual)
- Adjust items per page (5, 10, 20, 50)

#### 3. **Manage Teachers** (Admin only)
- **Add**: Click "Add Teacher" button, fill form
- **Edit**: Click edit icon, modify inline
- **Delete**: Click delete icon, confirm action

#### 4. **Sync Roster Data** (Admin only)
- Click "🔄 Sync Roster" button in header
- System fetches data from Schoolday (OneRoster API)
- Automatically links teachers by email
- View sync status and statistics

#### 5. **Subscribe to Webhooks** (Admin only)
- Click "🔔 Subscribe to Webhooks" button
- Configure real-time event notifications
- Receive automatic updates on data changes

#### 6. **View Analytics**
- Click "📊 Analytics Dashboard" button
- Explore performance trends
- Compare teacher metrics
- Export data as CSV or PDF

#### 7. **Logout**
- Click "🚪 Logout" button in header
- Token is cleared, returns to login

---

## 📁 Project Structure

```
teacher-eval-platform/
│
├── frontend/                          # React frontend application
│   ├── src/
│   │   ├── components/
│   │   │   ├── TeachersTable.jsx     # Main teacher management UI (1231 lines)
│   │   │   ├── SyncRosterButton.jsx  # Roster sync trigger
│   │   │   ├── WebhookSubscribeButton.jsx
│   │   │   ├── LoadingSpinner.jsx
│   │   │   ├── EmptyState.jsx
│   │   │   └── Button.jsx
│   │   ├── lib/
│   │   │   ├── api.js                # API client with JWT handling
│   │   │   └── token.js              # Token management utilities
│   │   ├── App.jsx                   # Main app with header/logout
│   │   ├── Login.jsx                 # Login page with SSO (394 lines)
│   │   └── main.jsx                  # Entry point
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── Dockerfile
│
├── auth-service/                      # Authentication microservice
│   ├── src/
│   │   └── index.js                  # JWT auth + OAuth SSO (220 lines)
│   ├── package.json
│   └── Dockerfile
│
├── evaluation-service/                # Core evaluation logic
│   ├── src/
│   │   ├── index.js                  # Main server
│   │   ├── db.js                     # PostgreSQL connection pool
│   │   ├── middleware/
│   │   │   └── auth.js               # JWT verification middleware
│   │   └── routes/
│   │       ├── teachers.js           # Teacher CRUD operations
│   │       ├── analytics.js          # Analytics endpoints (331 lines)
│   │       ├── reports.js            # Report generation (82 lines)
│   │       ├── draft.js              # Draft evaluation management
│   │       ├── submit.js             # Evaluation submission
│   │       ├── publish.js            # Evaluation publishing
│   │       └── readOnly.js           # Read-only endpoints
│   ├── db/
│   │   └── migrations/
│   │       └── 007_add_roster_link.sql
│   ├── frontend/                     # Legacy analytics dashboards
│   │   ├── dashboard.html            # Chart.js dashboard (337 lines)
│   │   └── overview.html             # Overview page (519 lines)
│   ├── package.json
│   └── Dockerfile
│
├── data-integration-service/          # OneRoster sync service
│   ├── src/
│   │   ├── server.js                 # Main sync logic (299 lines)
│   │   └── sync/
│   │       └── linkRosterToTeachers.js  # Email-based linking
│   ├── package.json
│   └── Dockerfile
│
├── mock-schoolday-service/            # Mock SIS provider
│   ├── src/
│   │   └── server.js                 # OAuth + OneRoster APIs (443 lines)
│   ├── package.json
│   └── Dockerfile
│
├── gateway/                           # Nginx API gateway
│   ├── nginx.conf                    # Route configuration (112 lines)
│   └── Dockerfile
│
├── postgres/                          # Database initialization
│   └── init.sql                      # Schema + seed data (251 lines)
│
├── docker-compose.yml                 # Multi-container orchestration
├── vercel.json                        # Vercel deployment config
├── render.yaml                        # Render.com deployment config
├── README.md                          # This file
└── .gitignore
```

---

## 🗄️ Database Schema
### Key Features
- **Foreign Keys**: Maintain referential integrity
- **Unique Constraints**: Prevent duplicates (email, external_id)
- **Timestamps**: Automatic tracking (created_at, updated_at)
- **JSONB**: Flexible metadata storage
- **UUID**: Distributed-system-friendly IDs

---

## 👤 User Roles & Permissions

| Role | Default Users | Capabilities |
|------|--------------|--------------|
| **Admin** | `admin@school.com` | Full access: CRUD operations, sync data, view analytics, manage webhooks |
| **User** | `demo@school.com` | View teachers, search, basic analytics access |
| **Teacher** | (SSO users) | View own evaluations, submit evaluations, view reports |

### Permission Matrix

| Action | Admin | User | Teacher |
|--------|-------|------|---------|
| View Teachers | ✅ | ✅ | ✅ |
| Add Teacher | ✅ | ❌ | ❌ |
| Edit Teacher | ✅ | ❌ | ❌ |
| Delete Teacher | ✅ | ❌ | ❌ |
| Sync Roster | ✅ | ❌ | ❌ |
| Subscribe Webhooks | ✅ | ❌ | ❌ |
| View Analytics | ✅ | ✅ | ✅ (own only) |
| Export Reports | ✅ | ✅ | ❌ |

---

## 🚢 Deployment

### Vercel (Frontend) ✅ Deployed

The frontend is automatically deployed to Vercel on every push to `main`.

**Live URL**: https://teacher-eval-platform.vercel.app

**Configuration** (`vercel.json`):
```json
{
  "buildCommand": "cd frontend && npm run build",
  "outputDirectory": "frontend/dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

**Environment Variables** (set in Vercel Dashboard):
- `VITE_API_BASE`: Backend API URL (for full-stack deployment)

### Docker Compose (Full Stack)

For local or self-hosted deployment:

```bash
# Production deployment
docker compose -f docker-compose.yml up -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```


## 🔒 Security Considerations

### Implemented
- ✅ JWT tokens with 2-hour expiration
- ✅ OAuth 2.0 with state parameter (CSRF protection)
- ✅ SQL injection prevention (parameterized queries)
- ✅ CORS configuration
- ✅ Environment variable management
- ✅ Bearer token validation
- ✅ Role-based access control

### Production Recommendations
- 🔐 Use HTTPS for all endpoints
- 🔐 Implement rate limiting (express-rate-limit)
- 🔐 Add request validation (express-validator)
- 🔐 Enable security headers (helmet.js)
- 🔐 Rotate JWT secrets regularly
- 🔐 Use password hashing (bcrypt) for stored passwords
- 🔐 Implement refresh tokens
- 🔐 Add audit logging
- 🔐 Set up intrusion detection

---

## 🧪 Testing

### Manual Testing

1. **Authentication Flow**
   ```bash
   # Test email/password login
   curl -X POST http://localhost:8080/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"demo@school.com","password":"pass123"}'
   
   # Test SSO flow
   open http://localhost:8080/api/auth/schoolday/login?demo_user=alice@springfield.edu
   ```

2. **Teacher Operations**
   ```bash
   # List teachers
   curl http://localhost:8080/api/eval/teachers?page=1&pageSize=5 \
     -H "Authorization: Bearer YOUR_TOKEN"
   
   # Search teachers
   curl http://localhost:8080/api/eval/teachers?q=alice&page=1 \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

3. **Data Synchronization**
   ```bash
   # Trigger sync (admin only)
   curl -X POST http://localhost:8080/api/integration/sync \
     -H "Authorization: Bearer ADMIN_TOKEN"
   
   # Check sync status
   curl http://localhost:8080/api/integration/sync/status
   ```

### Future: Automated Testing

- Unit tests: Jest
- Integration tests: Supertest
- E2E tests: Cypress or Playwright
- API tests: Postman/Newman


## 🗺️ Feature Roadmap

### ✅ Completed 
- [x] Microservices architecture
- [x] JWT authentication
- [x] OAuth 2.0 SSO implementation
- [x] OneRoster 1.1 API integration
- [x] Teacher CRUD operations
- [x] Data synchronization pipeline
- [x] Webhook subscriptions
- [x] Analytics dashboards (Chart.js)
- [x] CSV/PDF export
- [x] Modern responsive UI
- [x] Docker containerization
- [x] Frontend deployment (Vercel)

### 🚧 In Progress
- [ ] Automated testing suite (Jest, Cypress)
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Performance monitoring
- [ ] Error tracking (Sentry)

### 📅 Planned 
- [ ] Real-time notifications (WebSocket)
- [ ] Advanced reporting templates
- [ ] Multi-tenancy support
- [ ] Mobile application (React Native)
- [ ] Incremental sync & conflict resolution
- [ ] Student evaluations module
- [ ] Term/semester management
- [ ] File upload & document management
- [ ] Email notifications
- [ ] Audit trail & activity logs

---

## 📄 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Yutong (Alex) Zeng**

- GitHub: [@alexzengyt](https://github.com/alexzengyt)
- *Last Updated: October 2025*
