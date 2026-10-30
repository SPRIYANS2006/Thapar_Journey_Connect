# 🚀 Thapar Journey Connect (TIET Campus Transit Platform)

> A production-grade, campus-exclusive ride-sharing and travel-partner matching platform built for students and scholars of **Thapar Institute of Engineering & Technology (TIET), Patiala**. Connect with hostel peers, coordinate carpools to railway stations and airports, and split transit fares safely.

---

## 🌟 Architecture & Highlights

- **Pure MongoDB Atlas Cloud Architecture**: Complete migration away from SQLite to a robust MongoDB Atlas backend utilizing Mongoose with compound indexing, atomic counters for sequential group numbering (`Group #1`, `Group #2`), and transactional reliability.
- **Institutional Google SSO Security Model**:
  - Accept exclusively signed Google ID tokens (`POST /api/auth/google`) verified cryptographically via `google-auth-library`.
  - Enforces `email_verified === true`, `hd === "thapar.edu"`, and domain `@thapar.edu` (all personal `@gmail.com` accounts are strictly rejected).
  - Issues signed 30-day JWT session tokens verified via `requireAuth` middleware.
  - Client identity is never trusted: student IDs, names, hostels, and contacts are derived strictly from `req.user`.
- **Contact Privacy Shield**: Student mobile numbers are never returned in search results or open group listings. Phone numbers are visible exclusively to co-riders within the same group **after** the journey status is Confirmed.
- **Single-Ride Policy**: A student can belong to only one Open or Confirmed travel group at any time, preventing overlapping or conflicting bookings.
- **Late-Cancellation Reliability Rating Policy**:
  - Cancellations $\le 4$ hours before departure incur a **$-0.3\star$** reliability penalty.
  - Cancellations in the final $\le 30$ minutes incur a **$-0.8\star$** penalty (rating floor is $1.0\star$).
  - Automated system notices broadcast to remaining group members in group chat.
- **Intelligent Deterministic Matching Engine**:
  - Circular minute calculation accounting for midnight wrap-around: $\min(|a-b|, 1440 - |a-b|)$.
  - Window evaluation based on the agreed flexibility between both students: $\min(r_1.\text{flexibility}, r_2.\text{flexibility})$.
  - Strict vehicle compatibility (Shared Cab matches Shared Cab or Either; Shared Auto matches Shared Auto or Either; Cab never matches Auto).
  - Hostel proximity resolution against 18 official TIET halls: Same hostel (40 pts), Same quad (30 pts), Same gender quad (20 pts), Wider campus (10 pts).
- **Hometown Communities & Single-Community Rule**:
  - Dedicated hometown regional hubs (Jalandhar, Delhi NCR, Ludhiana, Chandigarh, Amritsar, Bathinda, Jaipur, etc.) with custom community creation support.
  - Students belong to 1 official native hometown community at a time; discussion boards and notices are private to verified community members.
- **11 College Degrees & 6 Academic Years**: Full support for all official TIET undergraduate, lateral entry, postgraduate, and doctoral degree programs.
- **Authenticated Real-Time WebSockets**: Socket.io live updates with session token handshake verification and private rooms (`user_<id>` and `group_<id>`).

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Vite 8, Tailwind CSS 4, Lucide React Icons |
| **Backend API** | Node.js 22, Express.js 5, Socket.io |
| **Database** | MongoDB Atlas Cloud, Mongoose 9 |
| **Authentication** | Google Identity Services (GIS), `google-auth-library`, JWT (`jsonwebtoken`), bcryptjs |
| **Testing & Quality** | Node.js native test runner (`node:test`), Supertest, `mongodb-memory-server`, Oxlint |
| **Deployment** | Render Web Service (`render.yaml`), GitHub Actions CI |

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: $\ge 22.0.0$
- **npm**: $\ge 10.0.0$
- **MongoDB Atlas Connection URI** (or local MongoDB)

### 2. Installation
```bash
git clone https://github.com/your-username/Thapar_Journey_Connect.git
cd Thapar_Journey_Connect
npm ci
```

### 3. Environment Configuration
Copy `.env.example` to `.env` and provide your secrets:
```bash
cp .env.example .env
```

| Variable | Description | Default |
|---|---|---|
| `PORT` | Backend server port | `5000` |
| `NODE_ENV` | Environment mode | `development` |
| `MONGODB_URI` | MongoDB Atlas connection string | Required |
| `SESSION_SECRET` | JWT session token signing secret ($\ge 32$ chars) | Required |
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 Client ID for `@thapar.edu` | Required |
| `APP_ORIGIN` | Allowed client origin for CORS and Socket.io | `http://localhost:5173` |

### 4. Running the Development Servers
Start both the Node 22 backend server and the Vite dev server concurrently:
```bash
npm run dev
```

- Frontend App: [http://localhost:5173](http://localhost:5173)
- Backend API: [http://localhost:5000](http://localhost:5000)
- Health Check: [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## 🧪 Testing & Verification

The test suite validates all 11 core acceptance criteria using `node:test`, `supertest`, and `mongodb-memory-server`:

```bash
# Run all automated acceptance tests
npm test

# Run code quality linting (Oxlint)
npm run lint

# Build production bundle
npm run build
```

### Verified Acceptance Scenarios:
1. Google auth with a personal `@gmail.com` account is rejected with HTTP 400.
2. Google auth with `email_verified: false` is rejected with HTTP 400.
3. Protected endpoints without an Authorization header return HTTP 401.
4. Protected endpoints with forged or expired JWTs return HTTP 401.
5. Attempting to join a second Open/Confirmed ride enforces the Single-Ride Policy with HTTP 409.
6. Leaving a ride within 4 hours penalizes reliability by $-0.3\star$; within 30 minutes by $-0.8\star$ (rating floor $1.0\star$).
7. Adding a 5th passenger to a Shared Cab fails with HTTP 409 capacity limit enforcement.
8. Non-members requesting group chat history are denied with HTTP 403.
9. Match queries for Shared Cab never match candidates who requested Shared Auto.
10. Creating community posts in a hub the student has not joined is denied with HTTP 403.
11. Group creation with a past departure time today in IST is rejected with HTTP 400.

---

## 📦 Deployment on Render

This repository includes a production-ready `render.yaml` specification:
- **Build Command**: `npm ci --include=dev && npm run build`
- **Start Command**: `npm start`
- **Health Check**: `/api/health`
- Secret environment variables (`MONGODB_URI`, `SESSION_SECRET`, `GOOGLE_CLIENT_ID`, `APP_ORIGIN`) are configured with `sync: false` for secure dashboard entry.

---

## 🛡️ License
Private and proprietary to students and administrators of Thapar Institute of Engineering & Technology (TIET).
