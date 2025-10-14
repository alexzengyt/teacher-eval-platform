# Teacher Evaluation Platform

A modular, containerized platform for faculty evaluation. Includes Postgres, Node.js microservices, and a minimal React (Vite) frontend orchestrated with Docker Compose.

> ✅ Implemented through **Phase 6**: JWT auth, API Gateway, mock Schoolday integration (OAuth + Discovery + OneRoster), Data Integration service, and a minimal admin UI button to trigger roster sync.


## Current Status

| Component                 | Description                                                    | Port (host) | Status   |
|--------------------------|----------------------------------------------------------------|-------------|----------|
| **Postgres**             | Core database (schema + seed)                                  | 5432        | Running  |
| **Auth Service**         | Auth endpoints, demo users, issues JWT                         | 3001        | Running  |
| **Evaluation Service**   | Teacher CRUD + protected APIs (uses Postgres)                  | 3002        | Running  |
| **Mock Schoolday**       | Mock OAuth/Discovery/OneRoster provider                        | 7001        | Running  |
| **Data Integration**     | Pulls from Mock Schoolday and upserts into Postgres            | 7002        | Running  |
| **Gateway**              | Nginx reverse-proxy to backend services                        | 8080        | Running  |
| **Frontend (React)**     | Minimal Vite app with admin-only “Sync Roster” button          | 5173        | Running  |


## Project Structure
```
teacher-eval/
├── auth-service/
│ ├── src/index.js
│ ├── Dockerfile
│ └── package.json
├── evaluation-service/
│ ├── src/index.js
│ ├── Dockerfile
│ └── package.json
├── mock-schoolday-service/
│ ├── src/server.js
│ ├── Dockerfile
│ └── package.json
├── data-integration-service/
│ ├── src/server.js
│ ├── Dockerfile
│ └── package.json
├── gateway/
│ ├── nginx.conf
│ └── Dockerfile
├── frontend/
│ ├── src/
│ │ ├── lib/api.js
│ │ ├── components/SyncRosterButton.jsx
│ │ ├── components/TeachersTable.jsx
│ │ ├── App.jsx / Login.jsx / main.jsx
│ ├── index.html
│ ├── Dockerfile
│ └── package.json
├── postgres/
│ └── init.sql
├── docker-compose.yml
├── .env # shared (e.g. AUTH_JWT_SECRET, DB_PORT)
├── .env.db # DB name/user/pass
└── .gitignore
```
## How to Run (Docker)

Prerequisite: Docker Desktop is running.

From the project root:

```bash
docker compose up --build
```

Open in browser:

- Frontend: http://localhost:5173

- Gateway health: http://localhost:8080/health

- Auth health: http://localhost:3001/health

- Evaluation health: http://localhost:3002/health

- Mock Schoolday health: http://localhost:7001/healthz

- Data Integration health: http://localhost:7002/healthz

Stop all containers:

```bash
docker compose down
```


## Tech Stack

- Backend: Node.js (Express)
- Database: PostgreSQL
- Frontend: React + Vite
- Reverse proxy: Nginx
- Containerization: Docker, Docker Compose
- Architecture: Microservices (auth, evaluation, gateway, mock provider, data integration)

## 🌐 部署

### Railway 一键部署（推荐）

1. 推送代码到 GitHub
2. 访问 [Railway](https://railway.app)，使用 GitHub 登录
3. New Project → Deploy from GitHub repo → 选择此仓库
4. Railway 自动识别 `docker-compose.yml` 并部署所有服务
5. 为 `gateway` 和 `frontend` 服务生成公开域名
6. 在 `frontend` 服务添加环境变量：`VITE_API_BASE=https://your-gateway-domain.up.railway.app`

### 公开演示

🎯 **演示 URL**: _部署后填写_

测试账号:
- 管理员: `admin` / `admin123`
- 评估者: `eval1` / `eval123`
- 只读: `viewer` / `view123`

## Next Steps

- [ ] Incremental sync & conflict handling
- [ ] Better error surfacing & retries for integration
- [ ] Evaluation dashboards & charts
- [ ] Tests (unit/integration) + simple CI
- [ ] Expand OneRoster coverage (students/terms)


## Repository

- Local directory: `teacher-eval`
- GitHub repo: `teacher-eval-platform`
- Default branch: `main`


_Developed and maintained by **Yutong (Alex) Zeng**, 2025._
