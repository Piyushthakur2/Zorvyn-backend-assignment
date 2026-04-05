# Finance Dashboard Backend API

A production-grade REST API for a multi-role finance dashboard system built with **Node.js**, **Express**, **Prisma ORM**, and **SQLite**.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18+ |
| Framework | Express 4 |
| ORM | Prisma 5 |
| Database | SQLite (zero-config, file-based) |
| Auth | JWT (access + refresh token rotation) |
| Validation | Zod |
| Logging | Winston + Morgan |
| Security | Helmet, CORS, Rate Limiting |

---

## Architecture

```
src/
├── config/          # Prisma client singleton
├── middlewares/     # auth, role guard, validation, audit, error
├── modules/
│   ├── auth/        # register, login, refresh, logout, change-password
│   ├── users/       # user management (admin)
│   ├── records/     # financial records CRUD + filters
│   └── dashboard/   # summary, trends, cash-flow, categories
└── utils/           # ApiError, ApiResponse, catchAsync, logger
```

**Key patterns:**
- **Controller → Service** separation (no business logic in controllers)
- **`catchAsync`** wrapper — zero try/catch in controllers, all errors bubble to global handler
- **`ApiError`** class with static factory methods (`ApiError.notFound()`, `.forbidden()`, etc.)
- **Audit logging** — every write operation (POST/PATCH/DELETE) is recorded automatically via middleware
- **Soft delete** — records are never hard-deleted; `isDeleted` + `deletedAt` fields used
- **Refresh token rotation** — old token invalidated on every refresh

---

## Role Permissions

| Endpoint Group | VIEWER | ANALYST | ADMIN |
|---|:---:|:---:|:---:|
| Auth (login, register, me) | ✅ | ✅ | ✅ |
| Dashboard summary, cash-flow, recent activity | ✅ | ✅ | ✅ |
| Dashboard trends, categories | ❌ | ✅ | ✅ |
| Records — read | ✅ | ✅ | ✅ |
| Records — create, update, delete, restore | ❌ | ❌ | ✅ |
| Users — list, view, update, deactivate | ❌ | ❌ | ✅ |

---

## Setup

### 1. Clone and install
```bash
git clone <repo-url>
cd finance-backend
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env — the defaults work for local dev without changes
```

### 3. Run database migrations
```bash
npm run db:migrate
# or: npx prisma migrate dev --name init
```

### 4. Seed with test data
```bash
npm run db:seed
```

### 5. Start the server
```bash
npm run dev    # development (nodemon)
npm start      # production
```

Server runs at: `http://localhost:5000`
Health check:   `http://localhost:5000/health`

---

## API Reference

All endpoints return:
```json
{
  "success": true,
  "message": "...",
  "data": {}
}
```

Errors:
```json
{
  "success": false,
  "message": "...",
  "errors": [{ "field": "email", "message": "Invalid email" }]
}
```

---

### Auth

#### Register
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "Secret@123"
  }'
```

#### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{ "email": "admin@finance.dev", "password": "Admin@123" }'
```

Response includes `accessToken` and `refreshToken`. Use `accessToken` as `Bearer` in subsequent requests.

#### Get current user
```bash
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer <accessToken>"
```

#### Refresh tokens
```bash
curl -X POST http://localhost:5000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{ "refreshToken": "<refreshToken>" }'
```

#### Change password
```bash
curl -X PATCH http://localhost:5000/api/auth/change-password \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{ "currentPassword": "Admin@123", "newPassword": "NewPass@456" }'
```

#### Logout
```bash
curl -X POST http://localhost:5000/api/auth/logout \
  -H "Authorization: Bearer <accessToken>" \
  -d '{ "refreshToken": "<refreshToken>" }'
```

---

### Financial Records

#### Create a record (Admin)
```bash
curl -X POST http://localhost:5000/api/records \
  -H "Authorization: Bearer <adminToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 5000,
    "type": "INCOME",
    "category": "Salary",
    "date": "2024-06-01",
    "notes": "June salary",
    "tags": ["salary", "recurring"]
  }'
```

#### List records with filters
```bash
# All records (paginated)
curl "http://localhost:5000/api/records?page=1&limit=10" \
  -H "Authorization: Bearer <token>"

# Filter by type and date range
curl "http://localhost:5000/api/records?type=EXPENSE&startDate=2024-01-01&endDate=2024-06-30" \
  -H "Authorization: Bearer <token>"

# Filter by amount range and category
curl "http://localhost:5000/api/records?minAmount=100&maxAmount=500&category=Rent" \
  -H "Authorization: Bearer <token>"

# Search + sort
curl "http://localhost:5000/api/records?search=salary&sortBy=amount&sortOrder=desc" \
  -H "Authorization: Bearer <token>"
```

#### Update a record (Admin)
```bash
curl -X PATCH http://localhost:5000/api/records/<id> \
  -H "Authorization: Bearer <adminToken>" \
  -H "Content-Type: application/json" \
  -d '{ "amount": 5500, "notes": "Updated amount" }'
```

#### Soft delete a record (Admin)
```bash
curl -X DELETE http://localhost:5000/api/records/<id> \
  -H "Authorization: Bearer <adminToken>"
```

#### Restore a deleted record (Admin)
```bash
curl -X POST http://localhost:5000/api/records/<id>/restore \
  -H "Authorization: Bearer <adminToken>"
```

---

### Dashboard

#### Summary (all roles)
```bash
curl "http://localhost:5000/api/dashboard/summary" \
  -H "Authorization: Bearer <token>"

# With date range filter
curl "http://localhost:5000/api/dashboard/summary?startDate=2024-01-01&endDate=2024-06-30" \
  -H "Authorization: Bearer <token>"
```

Response:
```json
{
  "totalIncome": 42000,
  "totalExpenses": 28500,
  "netBalance": 13500,
  "savingsRate": 32.14,
  "recordCount": 240,
  "topCategories": [
    { "name": "Salary", "total": 30000, "count": 6 }
  ]
}
```

#### Cash flow (current vs previous month)
```bash
curl http://localhost:5000/api/dashboard/cash-flow \
  -H "Authorization: Bearer <token>"
```

#### Monthly trend (Analyst, Admin)
```bash
curl "http://localhost:5000/api/dashboard/trends/monthly?months=6" \
  -H "Authorization: Bearer <analystToken>"
```

#### Weekly trend (Analyst, Admin)
```bash
curl "http://localhost:5000/api/dashboard/trends/weekly?weeks=8" \
  -H "Authorization: Bearer <analystToken>"
```

#### Category breakdown (Analyst, Admin)
```bash
curl "http://localhost:5000/api/dashboard/categories?type=EXPENSE" \
  -H "Authorization: Bearer <analystToken>"
```

#### Recent activity (all roles)
```bash
curl "http://localhost:5000/api/dashboard/recent-activity?limit=5" \
  -H "Authorization: Bearer <token>"
```

---

### Users (Admin only)

#### List users
```bash
curl "http://localhost:5000/api/users?page=1&limit=10&role=ANALYST" \
  -H "Authorization: Bearer <adminToken>"
```

#### Update user role / status
```bash
curl -X PATCH http://localhost:5000/api/users/<id> \
  -H "Authorization: Bearer <adminToken>" \
  -H "Content-Type: application/json" \
  -d '{ "role": "ANALYST", "isActive": true }'
```

#### Deactivate user
```bash
curl -X DELETE http://localhost:5000/api/users/<id> \
  -H "Authorization: Bearer <adminToken>"
```

#### View user activity
```bash
curl http://localhost:5000/api/users/<id>/activity \
  -H "Authorization: Bearer <adminToken>"
```

---

## Query Parameters — Records

| Param | Type | Description |
|---|---|---|
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 10) |
| `type` | string | `INCOME` or `EXPENSE` |
| `category` | string | Partial match |
| `minAmount` | number | Minimum amount |
| `maxAmount` | number | Maximum amount |
| `startDate` | ISO date | Range start |
| `endDate` | ISO date | Range end |
| `search` | string | Searches category + notes |
| `tags` | string | Tag to match |
| `sortBy` | string | `date`, `amount`, `createdAt`, `category` |
| `sortOrder` | string | `asc` or `desc` |

---

## Design Decisions & Assumptions

1. **SQLite** — chosen for zero-config local setup; switching to PostgreSQL requires only updating `DATABASE_URL` and the Prisma provider.

2. **Refresh token rotation** — every `/auth/refresh` call invalidates the old token and issues a new pair, preventing token reuse attacks.

3. **Timing-safe login** — password comparison runs even when the email doesn't exist, preventing user enumeration via response timing.

4. **Soft delete** — financial records are never permanently deleted. `isDeleted` + `deletedAt` fields allow restore and maintain audit integrity.

5. **Audit log** — all write operations are automatically captured by middleware without polluting controller/service logic.

6. **Tags as JSON string** — SQLite has no native array type; tags are stored as `JSON.stringify(array)` and parsed on read.

7. **Role hierarchy** — `ADMIN > ANALYST > VIEWER`. Middleware uses explicit arrays (`requireRole('ADMIN', 'ANALYST')`) rather than numeric tiers for clarity.

8. **Global rate limiting** — 100 req/15min for all API routes; stricter 20 req/15min for auth routes to prevent brute force.

---

## Test Accounts (after seed)

| Role | Email | Password |
|---|---|---|
| Admin | admin@finance.dev | Admin@123 |
| Analyst | analyst@finance.dev | Analyst@123 |
| Viewer | viewer@finance.dev | Viewer@123 |
