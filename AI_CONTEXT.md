# AI_CONTEXT.md
> Living document. Always reflects current project state. Updated after every phase.
> Last updated: Phase 4 complete.

---

## Product Understanding

This is a Splitwise-inspired expense-splitting application. Core value: maintain a transparent, auditable ledger of shared expenses in a group. Users create groups, add expenses with various split strategies, and track who owes whom. Settlements close the loop.

**This is not Splitwise.** It is an MVP inspired by Splitwise, built for a Full Stack Engineering Internship assessment. The goal is to demonstrate production-quality architecture, clean code, and depth of thought — not to replicate every feature of the original product.

---

## Scope (MVP)

### In Scope
- JWT authentication (register, login, me)
- Group CRUD + member management
- Expense CRUD with 4 split types (equal, unequal, percentage, shares)
- Balance calculation (per group + overall)
- Debt simplification (minimum transactions algorithm)
- Settlement recording
- Real-time expense comments (Socket.IO)
- Dashboard (owe/owed totals)

### Out of Scope (Post-MVP)
- Email notifications
- Push notifications
- Recurring expenses
- Multiple currencies with FX conversion
- Expense categories / tags
- Receipt image upload
- Invite links
- OAuth (Google, etc.)
- Native mobile app

---

## Assumptions

| # | Assumption | Reasoning |
|---|-----------|-----------|
| 1 | Single currency (INR default) | Simplifies balance math; FX conversion is a post-MVP feature |
| 2 | Email-based member add (user must exist) | Avoids invite flow complexity for MVP |
| 3 | Soft-delete on expenses | Preserves audit trail; hard delete loses history |
| 4 | JWT stored in localStorage | Simpler for MVP; consider httpOnly cookies for production |
| 5 | No email verification | MVP scope; adds complexity without changing architecture |
| 6 | Decimal(10,2) for amounts | Max 99,999,999.99 — sufficient for group expenses |
| 7 | UTC timestamps throughout | Avoid timezone bugs in MVP |
| 8 | CUID for primary keys | URL-safe, no collision risk, sortable |
| 9 | Zod for validation | Type-safe at runtime, integrates well with TypeScript if added later |
| 10 | React Query for server state | Industry standard; avoids manual loading/error/cache state |

---

## Architecture Decisions

### Why Controller-Service Pattern?
Controllers handle HTTP concerns (parse req, send res). Services contain pure business logic (balance calculation, split math). This separation allows:
- Testing services without HTTP layer
- Reusing services across routes
- Cleaner interviewer view of where logic lives

### Why React Query over Redux?
Redux adds boilerplate for what is essentially server cache management. React Query handles loading states, error states, background refetch, and optimistic updates out of the box. Auth/socket state stays in Context (genuinely global + low-frequency).

### Why Prisma over raw SQL?
- Type-safe queries
- Migration management
- Readable schema as source of truth
- Works well with Neon's PostgreSQL
- Easy to swap DB later

### Why Socket.IO over raw WebSockets?
- Auto-reconnect
- Room management (join_expense, join_group)
- Fallback to long-polling for difficult networks
- Better DX

### Why Zod for validation?
- Runtime type safety on the server
- Schema reusable for error messages
- Can share with frontend if TypeScript added
- Better than express-validator for complex nested schemas (splits array)

### Why Soft Delete on Expenses?
If a group member disputes an expense, hard-deleting it destroys evidence. Soft delete (`isDeleted: true`) keeps the record. Queries always filter `WHERE isDeleted = false`.

### Why CUID over UUID?
CUIDs are: collision-resistant, URL-safe, roughly sortable by creation time, and shorter. Prisma supports them natively with `@default(cuid())`.

### Balance Calculation: Why Greedy Debt Simplification?
The greedy algorithm (sort by net balance, pair largest debtor with largest creditor) produces the minimum number of transactions to settle all debts. It's O(n log n) and straightforward to implement and explain in an interview.

---

## Database Schema

See full schema in `server/prisma/schema.prisma`.

### Tables
- `User` — auth + profile
- `Group` — expense group
- `GroupMember` — many-to-many User↔Group with role
- `Expense` — an expense within a group
- `ExpenseSplit` — one row per participant per expense, stores computed amount
- `Settlement` — records a manual payment between two users
- `Comment` — comment on an expense

### Key Constraints
- `GroupMember(groupId, userId)` is UNIQUE — prevents duplicate membership
- `ExpenseSplit(expenseId, userId)` is UNIQUE — one split per person per expense
- `Expense.amount` is Decimal(10,2) — prevents floating point currency issues
- `Expense.isDeleted` enables soft delete pattern

---

## API Design

### Versioning
All endpoints prefixed with `/api/v1` for future versioning compatibility.

### Error Response Format (all endpoints)
```json
{
  "status": "error",
  "message": "Human readable message",
  "errors": [ ... ] // Optional: validation errors array
}
```

### Success Response Format
```json
{
  "status": "success",
  "data": { ... }
}
```

### Auth
- JWT, 7-day expiry
- Bearer token in Authorization header
- Payload: `{ userId, email, iat, exp }`

### Endpoints Summary
| Resource | Base Path |
|----------|-----------|
| Auth | /api/v1/auth |
| Groups | /api/v1/groups |
| Expenses | /api/v1/groups/:groupId/expenses |
| Balances (group) | /api/v1/groups/:groupId/balances |
| Balances (overall) | /api/v1/balances |
| Settlements | /api/v1/settlements |
| Comments | /api/v1/expenses/:expenseId/comments |

---

## Frontend Structure

### Pages and their purpose
| Page | Route | Purpose |
|------|-------|---------|
| LoginPage | /login | JWT login form |
| RegisterPage | /register | New user registration |
| DashboardPage | / | Owe/owed summary, recent activity |
| GroupsPage | /groups | List all user's groups |
| GroupDetailPage | /groups/:id | Group expenses + balances |
| ExpenseDetailPage | /expenses/:id | Expense detail + chat |
| SettlementsPage | /settlements | Record + view settlements |

### State Architecture
- **AuthContext**: `{ user, token, login(), logout() }` — persisted to localStorage
- **SocketContext**: `{ socket }` — established once on auth, torn down on logout
- **React Query**: all API data (groups, expenses, balances, comments)

---

## Backend Structure

### Request Lifecycle
```
Request
  → Express Router
  → Auth Middleware (verify JWT, attach req.user)
  → Validation Middleware (Zod schema check)
  → Controller (parse params, call service)
  → Service (business logic, Prisma queries)
  → Controller (format response)
  → Response
  → [Error Middleware if throw]
```

### Split Service Logic
```
EQUAL:    amount = totalAmount / participants.length
UNEQUAL:  amount = explicitly provided; validate sum === total
PERCENTAGE: amount = (percentage / 100) * total; validate percentages sum to 100
SHARES:   amount = (userShares / totalShares) * total
```

### Balance Service Logic
```
1. Fetch all non-deleted expenses in group with splits
2. For each expense:
   - paidBy user gets credit: +amount from each split participant
   - each split participant gets debit: -split.amount (if not the payer)
   - special: payer's own split.amount reduces their credit
3. Build netBalance map: userId → net amount (+ = owed, - = owes)
4. For simplified view: greedy matching algorithm
```

---

## Deployment Plan

| Service | Platform | Plan |
|---------|----------|------|
| Frontend | Vercel | Free (Hobby) |
| Backend | Render | Free (Web Service) |
| Database | Neon | Free (0.5GB) |

### Environment Variables

**Server (.env)**
```
DATABASE_URL=postgresql://...@neon.tech/splitwise?sslmode=require
JWT_SECRET=<random 64-char hex>
PORT=5000
CLIENT_URL=https://splitwise-clone.vercel.app
NODE_ENV=production
```

**Client (.env)**
```
VITE_API_URL=https://splitwise-clone.onrender.com/api/v1
VITE_SOCKET_URL=https://splitwise-clone.onrender.com
```

---

## Testing Plan

### Unit Tests (to be added post-MVP)
- `split.service.js` — all 4 split type calculations
- `balance.service.js` — net balance calculation + simplification
- Input validators (Zod schemas)

### Integration Tests
- Auth flow (register → login → me)
- Expense creation with each split type
- Balance recalculation after expense + settlement

### Manual QA Checklist
1. Register two users (A and B)
2. User A creates a group, adds User B
3. User A adds an equal-split expense for ₹1000
4. Verify: User B owes User A ₹500
5. Add unequal, percentage, shares split expenses
6. Verify balances are correct
7. User B records a settlement of ₹500 to User A
8. Verify: balance now ₹0
9. User A posts a comment on the expense
10. User B sees it in real-time (two browser tabs)
11. User A deletes the expense (soft delete)
12. Verify: expense hidden, balances recalculated

---

## Tradeoffs

| Decision | Chosen | Rejected | Tradeoff |
|----------|--------|----------|---------|
| State mgmt | React Query + Context | Redux | Less boilerplate, enough for MVP; Redux better for very complex state |
| Auth storage | localStorage | httpOnly cookie | Easier to implement; cookies are more XSS-safe |
| DB IDs | CUID | UUID v4 | CUIDs are URL-safe and sortable; UUIDs are more universally recognized |
| Validation | Zod (server) | Joi, express-validator | Zod is TS-native, composable; Joi has more community resources |
| ORM | Prisma | TypeORM, Sequelize | Prisma has better DX, better migrations; TypeORM heavier |
| Real-time | Socket.IO | raw WebSocket, SSE | Socket.IO has rooms, auto-reconnect; SSE is unidirectional |
| Split math | Decimal.js | JS numbers | Decimal.js avoids 0.1+0.2=0.3 errors in currency; JS floats unsafe |

---

## Prompts Used

> (This section tracks what was asked to generate this project)

1. Full system prompt — Phase 1–4 planning for Splitwise clone
2. Phases 5–7 — code generation milestone by milestone

---

## Changes During Development

> (Will be updated as development progresses)

- None yet — documentation phase

---

## Known Limitations

1. **Single currency**: All amounts in INR. No FX conversion.
2. **No email verification**: Users can register with any email.
3. **No pagination**: Expense and comment lists are unpaginated (acceptable for MVP group sizes).
4. **Free tier cold starts**: Render free tier has ~30s cold start. First request will be slow.
5. **LocalStorage JWT**: Vulnerable to XSS. Production app should use httpOnly cookies.
6. **No rate limiting**: Could be abused. Add express-rate-limit in production.
7. **No file uploads**: No receipt images.
8. **Balance calculation on-the-fly**: No materialized balance table. For large groups with many expenses this will be slow. Acceptable for MVP.
