# 🚀 Thapar Journey Connect (TIET Campus Transit Platform)

> A full-stack campus-exclusive web platform connecting **Thapar Institute of Engineering & Technology (TIET), Patiala** hostellers with hometown peers and compatible travel partners for safe, affordable cab and train sharing.

---

## 🌟 Key Features & Capabilities

- **Strict Student Verification**: Institutional `@thapar.edu` email authentication and hostel identification (H1–H15, Hostel D–Q, PG Quad) ensuring no outside strangers.
- **Intelligent Compatibility Ranking Engine**: Multi-factor algorithm evaluating destination, departure time window (±10m to ±30m), transport preference (Cab, Auto, Either), and hostel cluster proximity.
- **Persistent Backend & Database**: Node.js & Express REST API powered by SQLite (`better-sqlite3`), persisting user profiles, journeys, groups, chat history, and community discussions.
- **Real-Time Group Coordination Chat**: In-app group messaging for matched student cohorts with auto-sync and pickup location coordination.
- **City Hometown Communities & Notice Board**: 8 dedicated regional hubs (Jalandhar, Delhi NCR, Ludhiana, Chandigarh, Amritsar, Bathinda, Jaipur) enforcing the **Single-Community Rule** to prevent spam.
- **Interactive Discussion Notice Board**: Hostellers can post ride-sharing notices, carpools, like posts, and reply directly within discussion threads.
- **Cab Fare Split Calculator**: Interactive tool computing per-student cost splits, driver tips, and one-click copy of UPI split summaries directly into group chat.
- **Campus Safety & Emergency SOS Drawer**: Direct emergency access to TIET Campus Security (`0175-2393333`), Executive Mess Guard Post, Women Safety Helpline (`1091`), and Punjab Police (`112`).
- **Dynamic Group Simulator**: Live simulation widget demonstrating student joins, 4-member capacity limit enforcement, and automatic overflow group creation.

---

## 🛠️ Technical Architecture & Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Vite 8, Tailwind CSS 4, Lucide React Icons |
| **Backend API** | Node.js, Express.js |
| **Database** | SQLite with `better-sqlite3` (WAL mode enabled) |
| **Tooling** | Concurrently, Oxlint |

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v18+ (v24 LTS recommended)
- **npm**: v9+

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Full-Stack Application (Frontend + Backend)
To start both the Express REST API server (`http://localhost:5000`) and the Vite frontend dev server (`http://localhost:5173`) simultaneously:
```bash
npm run dev
```

- **Frontend Application**: [http://localhost:5173/](http://localhost:5173/)
- **Backend API Health**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

### 4. Running Components Independently
- Start Backend Server only:
  ```bash
  npm run server
  ```
- Start Frontend Client only:
  ```bash
  npm run client
  ```
- Build for Production:
  ```bash
  npm run build
  ```

---

## 📡 REST API Documentation

### 🔐 Authentication & Profile
- `POST /api/auth/login` – Login with `@thapar.edu` credentials.
- `POST /api/auth/register` – Register student account with hostel and contact details.
- `GET /api/auth/me` – Retrieve authenticated student profile.
- `PUT /api/auth/profile` – Update profile attributes (hostel, phone, hometown).

### 🚆 Journeys & Matching Algorithm
- `GET /api/destinations` – Core campus transit destinations (Railway Station, Bus Stand, Chandigarh Airport, Delhi Airport).
- `GET /api/hostels` – TIET boys, girls, and PG hostels with cluster metadata.
- `POST /api/journeys` – Submit a departure window and run compatibility matching.

### 👥 Groups & Real-Time Coordination
- `GET /api/groups` – List active travel groups.
- `GET /api/groups/:id` – Retrieve group details, member cards, and pickup point.
- `POST /api/groups` – Create a new ride-share group.
- `POST /api/groups/:id/join` – Join an open group (enforces 4-member max limit).
- `POST /api/groups/:id/leave` – Leave a joined group.
- `POST /api/groups/:id/confirm` – Finalize journey status among members.
- `GET /api/groups/:id/messages` – Fetch conversation history.
- `POST /api/groups/:id/messages` – Send instant message to group.
- `POST /api/groups/:id/fare-split` – Calculate per-student fare split with savings metrics.

### 🏙️ Hometown Communities & Notices
- `GET /api/communities` – List all regional city hubs with member counts.
- `POST /api/communities/:id/join` – Join a community (enforces Single-Community Rule).
- `POST /api/communities/:id/leave` – Leave current hometown hub.
- `GET /api/communities/:id/posts` – Fetch ride-sharing notices and comments.
- `POST /api/communities/:id/posts` – Create a community notice or carpool offer.
- `POST /api/communities/posts/:postId/like` – Upvote a community post.
- `POST /api/communities/posts/:postId/comments` – Reply to a student notice.
- `GET /api/stats` – Live platform metrics (active riders, ₹ saved).

---

## 📂 Project Structure

```text
Thapar_Journey_Connect/
├── server/                      # Backend Express & Database
│   ├── db.js                    # SQLite schema, tables & seed data
│   ├── matchingEngine.js        # Server-side matching algorithm
│   ├── server.js                # Express REST API endpoints
│   └── thapar_journey.db        # Persistent SQLite database file
├── src/
│   ├── assets/                  # Images and logos
│   ├── components/              # UI & Modal components
│   │   ├── DestinationCard.jsx  # Transit hub card
│   │   ├── DisclaimerBanner.jsx # Student-coordination disclaimer
│   │   ├── DynamicSimulateWidget.jsx # Dynamic join simulator
│   │   ├── EmergencySOSModal.jsx# Campus SOS & safety drawer
│   │   ├── FareSplitModal.jsx   # Interactive cab fare splitter
│   │   ├── GroupChatModal.jsx   # In-app student chat modal
│   │   ├── JourneyFormModal.jsx # Departure window form
│   │   └── Navbar.jsx           # Top navigation bar
│   ├── data/
│   │   └── mockData.js          # Fallback student & community datasets
│   ├── pages/                   # Application views
│   │   ├── AuthPage.jsx         # Domain-restricted login & registration
│   │   ├── CommunitiesPage.jsx  # Hometown hubs & discussion notice board
│   │   ├── DashboardPage.jsx    # Core transit selection & welcome hub
│   │   ├── GroupDetailsPage.jsx # Group roster, pickup & fare split
│   │   ├── MatchingResultsPage.jsx # Compatibility ranking list
│   │   ├── MyJourneysPage.jsx   # Active & historical travel logs
│   │   └── ProfilePage.jsx      # Student verification profile
│   ├── services/
│   │   └── api.js               # Centralized REST API client
│   ├── utils/
│   │   └── matchingEngine.js    # Client-side time & proximity helpers
│   ├── App.jsx                  # Root state & page router
│   ├── main.jsx                 # React root entry
│   └── index.css                # Tailwind CSS entry
├── dist/                        # Production build output
├── package.json                 # Project dependencies & npm scripts
├── vite.config.js               # Vite configuration with API proxy
└── README.md                    # Comprehensive documentation
```

---

## 🎓 Capstone Project Viva Highlights

1. **Why not use existing ride apps (Ola/Uber)?**
   - Commercial ride-hailing apps do not match hostellers departing from the same campus gate going to the same train or flight at the same time. Students end up booking individual cabs, paying ₹1,200–₹1,500 each for Chandigarh Airport.
   - Thapar Journey Connect enables **pre-trip coordination**, reducing airport transit to ~₹350/student (75% savings).
2. **Safety & Domain Verification**:
   - Eliminates anonymous travel by restricting access exclusively to `@thapar.edu` accounts and tracking campus hostels.
3. **Single-Community Rule**:
   - Ensures authenticity by preventing students from flooding multiple city communities simultaneously.
