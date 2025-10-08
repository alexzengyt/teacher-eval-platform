# Teacher Evaluation Platform

A modular, containerized platform for faculty evaluation. Includes Postgres, two Node.js microservices, and a minimal React (Vite) frontend orchestrated via Docker Compose.

## Current Status

| Component            | Description                               | Port | Status |
|---------------------|-------------------------------------------|------|--------|
| Postgres            | Core database                             | 5432 | Running |
| Auth Service        | Express service for auth endpoints        | 3001 | Running |
| Evaluation Service  | Express service connected to Postgres     | 3002 | Running |
| Frontend (React)    | Minimal Vite app                          | 5173 | Running |
| Gateway             | API gateway (planned)                     |  -   | Planned |

## Project Structure

teacher-eval/
├── auth-service/
│ ├── src/index.js
│ ├── Dockerfile
│ └── package.json
├── evaluation-service/
│ ├── src/index.js
│ ├── Dockerfile
│ └── package.json
├── frontend/
│ ├── src/main.jsx
│ ├── index.html
│ ├── Dockerfile
│ └── package.json
├── postgres/
│ └── init.sql
├── docker-compose.yml
├── .env
└── .gitignore

## How to Run (Docker)

Prerequisite: Docker Desktop is running.

From the project root:

```bash
docker compose up --build
```

Open in browser:

Frontend: http://localhost:5173

Auth Service health: http://localhost:3001/health

Evaluation Service health: http://localhost:3002/health

Stop all containers:

```bash
docker compose down
```


## Tech Stack

- Backend: Node.js (Express)
- Database: PostgreSQL
- Frontend: React + Vite
- Containerization: Docker, Docker Compose
- Architecture: Microservices (auth, evaluation, planned gateway)


## Next Steps

- [ ] Add API gateway to route requests to services
- [ ] Implement auth flow (e.g., JWT) and basic users
- [ ] Build evaluation dashboard UI (charts)
- [ ] Add Schoolday mock integration (roster, courses)
- [ ] Add tests and simple CI


## Repository

- Local directory: `teacher-eval`
- GitHub repo: `teacher-eval-platform`
- Default branch: `main`

---

_Developed and maintained by **Yutong (Alex) Zeng**, 2025._
