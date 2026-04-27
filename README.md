# MERN ERP System

A full-stack Enterprise Resource Planning platform with real-time field employee tracking and geo-fencing.

## Features

- **Geo-Fencing Attendance** — Check-in/check-out validated against configurable geo-fence zones
- **Real-Time Trip Tracking** — Live map dashboard with color-coded markers (active/idle/stale), 5-second polling
- **Meetings & Visit Logs** — Log client visits with GPS coordinates and reverse-geocoded addresses
- **Daily Reports** — Submit planned schedules and end-of-day activity reports
- **Claims & Leave Approvals** — Submit expenses and leave requests; managers approve/reject with notifications
- **Notifications System** — Real-time unread badge with per-event notifications (claims, leaves, trip idle alerts, announcements)
- **Announcements** — Company-wide broadcasts with audience targeting (all / field / office / remote)
- **Payslips** — Monthly salary statements with earnings/deductions breakdown
- **CSV Report Export** — Attendance export with date filters, CSV-injection sanitized
- **Profile Management** — Update name, work mode, and password

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js, Express.js, MongoDB (Mongoose) |
| Frontend | React 18, React Router v6, Axios |
| Maps | React-Leaflet, Leaflet.js |
| Auth | JWT (jsonwebtoken), bcryptjs |
| Validation | express-validator |
| Geocoding | Mappls Maps API |
| Rate Limiting | express-rate-limit |
| Logging | Pino (via custom logger) |

## Project Structure

```
erp-system/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── listeners/
│   │   └── utils/
│   └── package.json
└── frontend/
    ├── src/
    │   ├── pages/
    │   ├── components/
    │   ├── services/
    │   └── utils/
    └── package.json
```

## Setup

### Prerequisites

- Node.js >= 18
- MongoDB (local or Atlas)
- npm

### Backend

```bash
cd backend
npm install
cp .env.example .env   # fill in your values
npm run dev
```

**Backend `.env` variables:**

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/erp-system
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d
MAPPLS_CLIENT_ID=your_mappls_client_id
MAPPLS_CLIENT_SECRET=your_mappls_client_secret
CORS_ORIGIN=http://localhost:3000
APP_TIMEZONE=Asia/Kolkata
DEFAULT_LEAVE_BALANCE=12
```

### Frontend

```bash
cd frontend
npm install
npm start
```

Frontend runs on `http://localhost:3000` and proxies API calls to `http://localhost:5000`.

## Demo Credentials

> Seed the database first: `cd backend && node src/scripts/seed.js`

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@erp.demo | Admin@123 |
| Manager | manager@erp.demo | Admin@123 |
| Employee | employee@erp.demo | Admin@123 |

## API Overview

| Module | Base Route |
|--------|-----------|
| Auth | `POST /api/v1/auth/login` |
| Attendance | `POST /api/v1/attendance/check-in` |
| Trips | `POST /api/v1/trips/start` |
| Claims | `GET/POST /api/v1/claims` |
| Leaves | `GET/POST /api/v1/leaves` |
| Approvals | `GET /api/v1/approvals` |
| Meetings | `GET/POST /api/v1/meetings` |
| Daily Reports | `GET/POST /api/v1/daily-reports` |
| Payslips | `GET/POST /api/v1/payslips` |
| Announcements | `GET/POST /api/v1/announcements` |
| Notifications | `GET /api/v1/notifications/me` |
| Reports | `GET /api/v1/reports/attendance/export` |
| Profile | `GET/PATCH /api/v1/users/me` |

## License

MIT
