# Schoolday Integration Guide

## Overview

This document describes the Schoolday integration features implemented in the Teacher Evaluation Platform. The integration includes SSO (Single Sign-On), real-time data synchronization via webhooks, and professional development recommendations.

---

## 🔐 Feature 1: Schoolday SSO (Single Sign-On)

### What It Does
Allows users to log in to the Teacher Evaluation Platform using their Schoolday credentials via OAuth 2.0 authorization code flow.

### How It Works

#### 1. **User Initiates Login**
- User clicks "Sign in with Schoolday" button
- Browser redirects to: `http://localhost:8080/api/auth/schoolday/login`

#### 2. **Authorization Request**
- Auth service redirects to Schoolday's authorization endpoint
- URL format: `http://localhost:7001/oauth/authorize?response_type=code&client_id=dev-client&redirect_uri=...&state=...`

#### 3. **User Authentication** (Mock Schoolday)
- In production: User would see Schoolday login page
- In our mock: Auto-selects demo user (can specify with `?demo_user=email`)
- Available demo users:
  - `alice@springfield.edu` (Alice Taylor)
  - `ben@springfield.edu` (Ben Wang)
  - `peiyao@example.com` (Peiyao Yang)
  - `alex@example.com` (Alex Zeng)

#### 4. **Authorization Code Exchange**
- Schoolday redirects back with authorization code
- Auth service exchanges code for access token
- Receives user info from Schoolday

#### 5. **JWT Issuance**
- Auth service creates local user record
- Issues JWT token for the platform
- Redirects to frontend with token

### API Endpoints

#### Initiate SSO Login
```bash
GET http://localhost:8080/api/auth/schoolday/login?demo_user=alice@springfield.edu
```

#### OAuth Callback (automatic)
```bash
GET http://localhost:8080/api/auth/schoolday/callback?code=...&state=...
```

#### Token Exchange (alternative flow)
```bash
POST http://localhost:8080/api/auth/schoolday/token
Content-Type: application/json

{
  "code": "auth_code_..."
}
```

### Testing SSO

1. **Via Browser:**
   ```
   http://localhost:8080/api/auth/schoolday/login?demo_user=peiyao@example.com
   ```
   - Should redirect to frontend with token in URL

2. **Via cURL:**
   ```bash
   curl -L "http://localhost:8080/api/auth/schoolday/login?demo_user=alice@springfield.edu"
   ```

---

## 🔄 Feature 2: Real-Time Data Sync with Webhooks

### What It Does
Automatically synchronizes roster data when changes occur in Schoolday, eliminating the need for manual sync button clicks.

### How It Works

#### 1. **Webhook Subscription**
- Data Integration service subscribes to Schoolday webhooks
- Provides callback URL: `http://data-integration-service:7002/webhooks/schoolday`
- Subscribes to events: `["roster.updated"]`

#### 2. **Data Change Detection**
- When roster data changes in Schoolday
- Schoolday sends webhook notification to subscribed URL

#### 3. **Automatic Sync Trigger**
- Webhook receiver acknowledges receipt immediately
- Triggers sync asynchronously in background
- Updates teachers, classes, and enrollments

### API Endpoints

#### Subscribe to Webhooks (Admin only)
```bash
POST http://localhost:8080/api/integration/webhooks/subscribe
Authorization: Bearer <admin_jwt>
```

#### Webhook Receiver (called by Schoolday)
```bash
POST http://data-integration-service:7002/webhooks/schoolday
Content-Type: application/json

{
  "event": "roster.updated",
  "timestamp": "2025-01-15T10:30:00Z",
  "data": {
    "message": "Roster data has been updated",
    "affectedResources": ["teachers", "classes", "enrollments"]
  }
}
```

#### Manual Webhook Trigger (for testing)
```bash
POST http://localhost:7001/webhooks/trigger
Authorization: Bearer mock_sd_access_token_123
Content-Type: application/json

{
  "event": "roster.updated"
}
```

### Testing Webhooks

1. **Subscribe to webhooks:**
   ```bash
   # First, get admin token
   TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@school.com","password":"admin123"}' | jq -r '.token')

   # Subscribe
   curl -X POST http://localhost:8080/api/integration/webhooks/subscribe \
     -H "Authorization: Bearer $TOKEN"
   ```

2. **Trigger a test webhook:**
   ```bash
   curl -X POST http://localhost:7001/webhooks/trigger \
     -H "Authorization: Bearer mock_sd_access_token_123" \
     -H "Content-Type: application/json" \
     -d '{"event":"roster.updated"}'
   ```

3. **Check sync status:**
   ```bash
   curl http://localhost:8080/api/integration/sync/status
   ```

---

## 📚 Feature 3: Professional Development Recommendations

### What It Does
Provides personalized professional development course recommendations based on teacher evaluation scores.

### How It Works

#### 1. **Score Analysis**
- System analyzes teacher's evaluation scores
- Identifies weak areas (scores < 4.5)
- Categories: teaching, research, service

#### 2. **Course Matching**
- Queries Schoolday Academy for relevant courses
- Filters by category and level
- Returns top 3 recommendations

#### 3. **Display**
- Shows recommended courses in teacher overview
- Includes course details: title, duration, topics, description

### Available PD Courses

1. **Advanced Teaching Strategies** (Teaching, 4 weeks, Intermediate)
   - Topics: Active Learning, Student Engagement, Assessment Design

2. **Research Methods in Education** (Research, 6 weeks, Advanced)
   - Topics: Quantitative Methods, Qualitative Analysis, Academic Writing

3. **Community Engagement Best Practices** (Service, 3 weeks, Beginner)
   - Topics: Committee Leadership, Mentorship, Outreach Programs

4. **Educational Technology Integration** (Teaching, 5 weeks, Intermediate)
   - Topics: Learning Management Systems, Interactive Content, Online Assessment

5. **Grant Writing Workshop** (Research, 4 weeks, Intermediate)
   - Topics: Proposal Structure, Budget Planning, Impact Statements

### API Endpoints

#### Get All PD Courses
```bash
GET http://localhost:7001/academy/courses
Authorization: Bearer mock_sd_access_token_123

# Filter by category
GET http://localhost:7001/academy/courses?category=teaching
```

#### Get Personalized Recommendations
```bash
POST http://localhost:7001/academy/recommendations
Authorization: Bearer mock_sd_access_token_123
Content-Type: application/json

{
  "weakAreas": ["teaching", "research"],
  "currentScores": {
    "teaching": 4.2,
    "research": 4.3,
    "service": 4.7
  }
}
```

### Testing PD Recommendations

```bash
# Get access token
TOKEN=$(curl -s -X POST http://localhost:7001/oauth/token \
  -H "Content-Type: application/json" \
  -d '{"grant_type":"client_credentials","client_id":"dev-client","client_secret":"dev-secret"}' | jq -r '.access_token')

# Get all courses
curl http://localhost:7001/academy/courses \
  -H "Authorization: Bearer $TOKEN"

# Get recommendations for a teacher with weak teaching scores
curl -X POST http://localhost:7001/academy/recommendations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "weakAreas": ["teaching"],
    "currentScores": {
      "teaching": 4.2,
      "research": 4.8,
      "service": 4.6
    }
  }'
```

---

## 🏗️ Architecture

### Service Communication

```
┌─────────────────┐
│    Frontend     │
│  (React/Vite)   │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│     Gateway     │
│     (Nginx)     │
└────────┬────────┘
         │
         ├──────────────────────────┐
         ↓                          ↓
┌─────────────────┐        ┌─────────────────┐
│  Auth Service   │        │ Eval Service    │
│  (Node.js)      │        │ (Node.js)       │
└────────┬────────┘        └─────────────────┘
         │
         ↓
┌─────────────────┐
│ Mock Schoolday  │◄───────┐
│  (Node.js)      │        │
└────────┬────────┘        │
         │                 │
         │ Webhooks        │ API Calls
         ↓                 │
┌─────────────────┐        │
│ Data Integration│────────┘
│  (Node.js)      │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   PostgreSQL    │
└─────────────────┘
```

### OAuth 2.0 Flow

```
User → Frontend → Gateway → Auth Service → Mock Schoolday
                                              ↓
                                         (authorize)
                                              ↓
                                    User authenticates
                                              ↓
                                   Redirect with code
                                              ↓
Auth Service ← Exchange code for token ← Schoolday
     ↓
Issue JWT
     ↓
Frontend (with token)
```

### Webhook Flow

```
Schoolday (data change) → Webhook notification
                                ↓
                    Data Integration Service
                                ↓
                        Trigger sync job
                                ↓
                    Fetch latest roster data
                                ↓
                        Update PostgreSQL
```

---

## 🔧 Configuration

### Environment Variables

#### Auth Service
```env
PORT=4001
AUTH_JWT_SECRET=your_secret_key
SD_BASE_URL=http://mock-schoolday-service:7001
SD_CLIENT_ID=dev-client
SD_CLIENT_SECRET=dev-secret
SD_REDIRECT_URI=http://localhost:8080/api/auth/schoolday/callback
FRONTEND_URL=http://localhost:5173
```

#### Data Integration Service
```env
PORT=7002
DATABASE_URL=postgresql://user:pass@postgres:5432/teacher_eval
SD_BASE_URL=http://mock-schoolday-service:7001
SD_CLIENT_ID=dev-client
SD_CLIENT_SECRET=dev-secret
WEBHOOK_URL=http://data-integration-service:7002/webhooks/schoolday
```

#### Mock Schoolday Service
```env
PORT=7001
SD_EXPECTED_CLIENT_ID=dev-client
SD_EXPECTED_CLIENT_SECRET=dev-secret
```

---

## 📊 Integration Status

| Feature | Status | Endpoints | Notes |
|---------|--------|-----------|-------|
| **SSO Login** | ✅ Complete | `/api/auth/schoolday/login`<br>`/api/auth/schoolday/callback` | OAuth 2.0 authorization code flow |
| **Webhook Sync** | ✅ Complete | `/webhooks/schoolday`<br>`/webhooks/subscribe` | Automatic roster updates |
| **PD Recommendations** | ✅ Complete | `/academy/courses`<br>`/academy/recommendations` | Based on evaluation scores |
| **OneRoster API** | ✅ Complete | `/oneroster/v1p1/users`<br>`/oneroster/v1p1/classes`<br>`/oneroster/v1p1/enrollments` | Teachers, classes, enrollments |

---

## 🧪 Complete Testing Guide

### 1. Test SSO Login

```bash
# Open in browser
open "http://localhost:8080/api/auth/schoolday/login?demo_user=peiyao@example.com"

# Should redirect to frontend with token
# URL will look like: http://localhost:5173/?sso_token=eyJhbGc...&sso_provider=schoolday
```

### 2. Test Webhook Subscription

```bash
# Get admin token
ADMIN_TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@school.com","password":"admin123"}' | jq -r '.token')

# Subscribe to webhooks
curl -X POST http://localhost:8080/api/integration/webhooks/subscribe \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq

# Should return:
# {
#   "status": "subscribed",
#   "subscription": { ... },
#   "message": "Successfully subscribed to Schoolday webhooks"
# }
```

### 3. Test Automatic Sync via Webhook

```bash
# Trigger webhook from Schoolday
curl -X POST http://localhost:7001/webhooks/trigger \
  -H "Authorization: Bearer mock_sd_access_token_123" \
  -H "Content-Type: application/json" \
  -d '{"event":"roster.updated"}' | jq

# Check sync status
curl http://localhost:8080/api/integration/sync/status | jq

# Should show recent sync with status "ok"
```

### 4. Test PD Recommendations

```bash
# Get Schoolday access token
SD_TOKEN=$(curl -s -X POST http://localhost:7001/oauth/token \
  -H "Content-Type: application/json" \
  -d '{"grant_type":"client_credentials","client_id":"dev-client","client_secret":"dev-secret"}' | jq -r '.access_token')

# Get recommendations
curl -X POST http://localhost:7001/academy/recommendations \
  -H "Authorization: Bearer $SD_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "weakAreas": ["teaching", "research"],
    "currentScores": {
      "teaching": 4.2,
      "research": 4.3,
      "service": 4.7
    }
  }' | jq

# Should return 3 recommended courses
```

---

## 🚀 Next Steps

### Pending Enhancements

1. **Enhanced Data Integration** (TODO #4)
   - Sync student data from OneRoster
   - Sync course schedules and terms
   - Sync grade data
   - Implement incremental sync (delta updates)

2. **Frontend Integration**
   - Add "Sign in with Schoolday" button to Login page
   - Display PD recommendations in teacher overview
   - Show webhook subscription status in admin panel

3. **Security Improvements**
   - Use HTTP-only cookies instead of URL parameters for tokens
   - Implement CSRF protection for OAuth state parameter
   - Add rate limiting for webhook endpoints

4. **Monitoring & Logging**
   - Add webhook delivery logs
   - Track SSO login success/failure rates
   - Monitor sync job performance

---

## 📝 Notes

- All Schoolday integration features are fully functional in the mock environment
- The mock service simulates real Schoolday behavior for development and testing
- In production, replace `SD_BASE_URL` with actual Schoolday API endpoint
- Webhook URLs must be publicly accessible in production (use ngrok for local testing)

---

_Last updated: January 2025_
_Developed by: Yutong (Alex) Zeng_

