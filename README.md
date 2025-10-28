# 🎓 Teacher Evaluation Platform

A microservices-based faculty evaluation system with OAuth 2.0 SSO, OneRoster 1.1 integration, and advanced analytics.

**🚀 Live Demo**: [teacher-eval-platform.vercel.app](https://teacher-eval-platform.vercel.app)

**Test Credentials:**
- Demo User: `demo@school.com` / `pass123`
- Administrator: `admin@school.com` / `admin123`

> **Note:** Live demo shows UI only. Run locally for full functionality (OAuth SSO, data sync, analytics).

---

## ✨ Key Features

- **OAuth 2.0 SSO** - Schoolday single sign-on with JWT authentication
- **OneRoster 1.1** - Full API compliance (Users, Classes, Enrollments, Organizations)
- **Teacher Management** - CRUD operations, search, filtering, pagination
- **Data Sync** - Automated roster sync with webhook support
- **Analytics** - Performance dashboards, peer comparison, trend analysis
- **Multi-Tab Evaluation** - Overview, Research, Service, Professional, Career
- **Reports** - CSV/PDF export for evaluations and analytics
- **Modern UI** - Responsive design with glassmorphism and Chart.js visualizations
- **Role-Based Access** - Admin, Teacher, User permissions

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

**Backend:** Node.js 20, Express, PostgreSQL 15, JWT, OAuth 2.0, Nginx  
**Frontend:** React 18, Vite 5, Chart.js  
**Standards:** OneRoster 1.1, OAuth 2.0 (RFC 6749), RESTful API  
**DevOps:** Docker, Docker Compose, Vercel

---

## 🚀 Quick Start

**Prerequisites:** Docker Desktop ([Download](https://www.docker.com/products/docker-desktop))

```bash
# 1. Clone repository
git clone https://github.com/alexzengyt/teacher-eval-platform.git
cd teacher-eval-platform

# 2. Create environment files
cat > .env << EOF
AUTH_JWT_SECRET=my-super-secret-jwt-key-for-teacher-eval-2025
DB_PORT=5432
EOF

cat > .env.db << EOF
POSTGRES_USER=te_user
POSTGRES_PASSWORD=te_pass_Dev123!
POSTGRES_DB=teacher_eval
EOF

# 3. Start all services
docker compose up --build

# Wait 30-60 seconds, then access:
# Frontend: http://localhost:5173
# API Gateway: http://localhost:8080
```

**Login:**
- Demo User: `demo@school.com` / `pass123`
- Admin: `admin@school.com` / `admin123`

**Stop services:**
```bash
docker compose down
```

---

## 📁 Project Structure

```
teacher-eval-platform/
├── frontend/              # React 18 + Vite SPA
├── auth-service/          # JWT + OAuth 2.0 SSO
├── evaluation-service/    # Core API + Analytics
├── data-integration-service/  # OneRoster sync
├── mock-schoolday-service/    # Mock SIS provider
├── gateway/               # Nginx reverse proxy
├── postgres/              # Database + migrations
└── docker-compose.yml     # Orchestration
```

## 👤 User Roles

| Role | Access |
|------|--------|
| **Admin** | Full CRUD, sync, analytics, webhooks |
| **User** | View teachers, basic analytics |
| **Teacher** | View own evaluations only |

---

## 🚢 Deployment

**Frontend:** Deployed on Vercel → [teacher-eval-platform.vercel.app](https://teacher-eval-platform.vercel.app)  
**Backend:** Docker Compose for local/self-hosted deployment

```bash
# Production deployment
docker compose up -d

# View logs
docker compose logs -f
```

## 🔒 Security

**Implemented:**
- JWT tokens (2h expiration) + OAuth 2.0 CSRF protection
- SQL injection prevention (parameterized queries)
- Role-based access control
- Environment variable management

**Production Recommendations:**
- HTTPS, rate limiting, request validation
- Security headers (helmet.js)
- Rotate JWT secrets, implement refresh tokens

---

## 📄 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Yutong (Alex) Zeng**

- GitHub: [@alexzengyt](https://github.com/alexzengyt)
- *Last Updated: October 2025*
