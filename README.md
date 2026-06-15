# SplitEase — Splitwise-Inspired Expense Splitter

A full-stack expense splitting application with real-time chat, 4 split types, balance tracking, and debt simplification.

**Live Demo**: [splitease.vercel.app](https://splitease.vercel.app) _(update after deploy)_

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, TailwindCSS, React Query, React Router v6 |
| Backend | Node.js, Express, Socket.IO |
| Database | PostgreSQL (Neon), Prisma ORM |
| Auth | JWT (jsonwebtoken, bcryptjs) |
| Validation | Zod |
| Deployment | Vercel (frontend), Render (backend), Neon (database) |

---

## Features

- **Authentication** — Register, login, JWT-protected routes
- **Groups** — Create groups (Home / Trip / Couple / Other), add/remove members
- **Expenses** — Add expenses with 4 split strategies:
  - Equal — divided evenly
  - Unequal — exact amounts per person
  - Percentage — percent-based with 100% validation
  - Shares — proportional to share count
- **Balances** — Per-group and cross-group net balance calculations
- **Debt Simplification** — Greedy algorithm finds minimum transactions to settle all debts
- **Settlements** — Record payments; balances update immediately
- **Real-time Chat** — Comment on any expense; Socket.IO broadcasts to all viewers

---

## Project Structure

```
splitwise-clone/
├── client/          # React frontend (Vercel)
│   ├── src/
│   │   ├── api/     # Axios + all API modules
│   │   ├── components/  # Reusable UI
│   │   ├── contexts/    # AuthContext, SocketContext
│   │   ├── hooks/       # useAuth, useSocket
│   │   ├── pages/       # Route pages
│   │   └── utils/       # Currency, date helpers
│   └── ...
├── server/          # Express backend (Render)
│   ├── prisma/      # Schema + migrations
│   └── src/
│       ├── controllers/ # Route handlers
│       ├── services/    # Balance engine, split calculator
│       ├── middleware/  # Auth, validation, errors
│       ├── routes/      # Express routers
│       ├── socket/      # Socket.IO handlers
│       └── validators/  # Zod schemas
├── AI_CONTEXT.md    # Architecture decisions + living context
└── BUILD_PLAN.md    # Full system design + roadmap
```

---

## Local Development

### Prerequisites

- Node.js 18+
- A PostgreSQL database (local or [Neon free tier](https://neon.tech))

### 1. Clone and install

```bash
git clone https://github.com/your-username/splitwise-clone.git
cd splitwise-clone

# Install server deps
cd server && npm install

# Install client deps
cd ../client && npm install
```

### 2. Configure server environment

```bash
cd server
cp .env.example .env
```

Edit `.env`:
```env
DATABASE_URL="postgresql://user:pass@localhost:5432/splitease"
JWT_SECRET="generate-with-command-below"
PORT=5000
CLIENT_URL="http://localhost:5173"
NODE_ENV="development"
```

Generate a secure JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. Configure client environment

```bash
cd client
cp .env.example .env.local
```

`.env.local` is pre-configured for local development — no changes needed.

### 4. Set up the database

```bash
cd server

# Generate Prisma client
npm run db:generate

# Run migrations (creates all tables)
npm run db:migrate
```

### 5. Start both servers

**Terminal 1 — Backend:**
```bash
cd server
npm run dev
# Running on http://localhost:5000
```

**Terminal 2 — Frontend:**
```bash
cd client
npm run dev
# Running on http://localhost:5173
```

Open [http://localhost:5173](http://localhost:5173) and register your first user.

---

## Deployment

### Step 1 — Neon (Database)

1. Create a free account at [neon.tech](https://neon.tech)
2. Create a new project named `splitease`
3. Copy the **Connection String** — it looks like:
   ```
   postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/splitease?sslmode=require
   ```
4. Save it as `DATABASE_URL` for Render (Step 2)

Run migrations against Neon:
```bash
cd server
DATABASE_URL="your-neon-url" npx prisma migrate deploy
```

---

### Step 2 — Render (Backend)

1. Push code to GitHub
2. Go to [render.com](https://render.com) → New → Web Service
3. Connect your GitHub repo
4. Configure:

| Setting | Value |
|---------|-------|
| **Name** | `splitease-api` |
| **Root Directory** | `server` |
| **Runtime** | Node |
| **Build Command** | `npm install && npx prisma generate` |
| **Start Command** | `npm start` |

5. Add Environment Variables:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | your Neon connection string |
| `JWT_SECRET` | your 64-char hex secret |
| `CLIENT_URL` | `https://your-app.vercel.app` (set after Vercel step) |
| `NODE_ENV` | `production` |
| `PORT` | `5000` |

6. Deploy. Note your Render URL: `https://splitease-api.onrender.com`

> **Note**: Render free tier has a ~30s cold start on first request. Upgrade to paid tier to eliminate this.

---

### Step 3 — Vercel (Frontend)

1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your GitHub repo
3. Configure:

| Setting | Value |
|---------|-------|
| **Framework Preset** | Vite |
| **Root Directory** | `client` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |

4. Add Environment Variables:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://splitease-api.onrender.com/api/v1` |
| `VITE_SOCKET_URL` | `https://splitease-api.onrender.com` |

5. Deploy. Note your Vercel URL.

6. Go back to Render → your service → Environment → update `CLIENT_URL` to your Vercel URL → Redeploy.

---

### Step 4 — Verify deployment

```bash
# Health check
curl https://splitease-api.onrender.com/health

# Expected: {"status":"ok","timestamp":"..."}
```

Open your Vercel URL, register, create a group, add an expense — verify end-to-end.

---

## API Reference

All endpoints prefixed with `/api/v1`. Protected routes require `Authorization: Bearer <token>`.

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login, receive JWT |
| GET | `/auth/me` | Get current user |

### Groups
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/groups` | Create group |
| GET | `/groups` | List your groups |
| GET | `/groups/:id` | Get group detail |
| PUT | `/groups/:id` | Update group (admin only) |
| DELETE | `/groups/:id` | Delete group (admin only) |
| POST | `/groups/:id/members` | Add member by email |
| DELETE | `/groups/:id/members/:userId` | Remove member |

### Expenses
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/groups/:id/expenses` | Add expense |
| GET | `/groups/:id/expenses` | List expenses |
| GET | `/groups/:id/expenses/:expId` | Get expense detail |
| PUT | `/groups/:id/expenses/:expId` | Update expense |
| DELETE | `/groups/:id/expenses/:expId` | Soft-delete |

### Balances
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/groups/:id/balances` | Group balance summary |
| GET | `/groups/:id/balances/simplified` | Minimum settlement plan |
| GET | `/balances` | Overall cross-group balances |

### Settlements & Comments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/settlements` | Record a payment |
| GET | `/settlements` | Your settlement history |
| GET | `/expenses/:id/comments` | Get comments |
| POST | `/expenses/:id/comments` | Post comment |

---

## Socket.IO Events

Connect with: `io(SOCKET_URL, { auth: { token: "JWT" } })`

| Event | Direction | Payload |
|-------|-----------|---------|
| `join_expense` | Client → Server | `{ expenseId }` |
| `leave_expense` | Client → Server | `{ expenseId }` |
| `join_group` | Client → Server | `{ groupId }` |
| `new_comment` | Server → Client | `{ id, user, content, createdAt }` |
| `expense_added` | Server → Client | `{ groupId, expense }` |

---

## Architecture Decisions

See [AI_CONTEXT.md](./AI_CONTEXT.md) for full reasoning behind every decision.

Key choices:
- **Controller-Service pattern**: Services are pure functions (balance engine, split calculator) — independently testable
- **Greedy debt simplification**: O(n log n), produces minimum transaction count
- **Soft-delete on expenses**: Preserves audit trail, supports dispute resolution
- **React Query**: Server-state caching, background refresh, optimistic updates
- **Socket.IO rooms**: `expense:{id}` and `group:{id}` rooms prevent unnecessary broadcasts

---

## Known Limitations

1. Single currency (INR). No FX conversion.
2. No email verification or OAuth.
3. No pagination (fine for small groups, post-MVP concern).
4. Balance calculated on-the-fly (no materialized view — acceptable for MVP scale).
5. JWT stored in localStorage (XSS risk — use httpOnly cookies in stricter production).
6. Render free tier has cold-start latency (~30s).

---

## License

MIT
