# BUILD_PLAN.md
> Living document — updated each phase. Last updated: Phase 4.

---

## PHASE 1 — PRODUCT RESEARCH

### What is Splitwise?

Splitwise is a bill-splitting application that allows groups of people to track shared expenses. Its core value proposition: eliminate the awkwardness of money between friends and roommates by providing a clear, auditable ledger of who owes what to whom.

---

### Core Workflows

#### 1. Onboarding
- User registers with email + password
- User logs in, receives JWT
- User can update their profile

#### 2. Group Management
- User creates a group (e.g., "Trip to Goa", "Flat 4B")
- User adds members to the group by email
- Members accept or are auto-added
- Group has a type (home, trip, couple, other)

#### 3. Expense Creation
- A member adds an expense to a group
- Expense has: title, amount, currency, date, payer, split type
- Split types:
  - **Equal**: Amount divided equally among selected members
  - **Unequal (Exact)**: Each member's share is entered manually
  - **Percentage**: Each member's share defined as a % (must sum to 100)
  - **Shares**: Each member assigned a number of shares; amount divided proportionally
- System calculates each member's owed amount

#### 4. Balance Calculation
- Per-group balance: Net amount each member owes or is owed within that group
- Overall balance: Across all groups, net amount between any two users
- Simplification: Reduce multi-person debts into minimum transactions (debt simplification algorithm)

#### 5. Settlements
- User A marks a payment to User B
- System records settlement and adjusts balances
- Settlement has: amount, from user, to user, group (optional), date, notes

#### 6. Expense Chat
- Each expense has a comment thread
- Members can comment, ask questions, dispute
- Real-time via Socket.IO

#### 7. Dashboard
- "You owe" total
- "You are owed" total
- List of friends with net balance
- Recent activity feed

---

### User Journeys

#### Journey 1: Create and split a group expense
1. User logs in
2. Opens group "Goa Trip"
3. Clicks "Add Expense"
4. Enters: "Hotel — ₹6000", paid by Rahul, split equally among 3 members
5. System records: each of the 3 members owes Rahul ₹2000
6. Group balance updates immediately
7. Other members see the expense in their feed

#### Journey 2: Settle up
1. Priya owes Rahul ₹2000
2. Priya pays Rahul in cash
3. Priya records a settlement: ₹2000 to Rahul
4. Balance between them drops to ₹0

#### Journey 3: Discuss an expense
1. Arjun sees the hotel charge
2. Arjun opens the expense, types a comment: "Shouldn't this be split 4 ways?"
3. Rahul replies in real-time
4. They agree, Rahul edits the expense

---

### Feature List (MVP Scope)

| Feature | Priority | Notes |
|---|---|---|
| JWT Auth (register/login) | P0 | Email + password |
| Group CRUD | P0 | Create, read, update, delete |
| Add/remove group members | P0 | By email |
| Expense CRUD | P0 | All 4 split types |
| Balance calculation (per group) | P0 | Net per member |
| Balance calculation (overall) | P0 | Cross-group net |
| Settlement recording | P0 | Mark as paid |
| Expense comments (real-time) | P1 | Socket.IO |
| Activity feed | P1 | Recent actions in group |
| Dashboard summary | P1 | Owe/owed totals |

---

### Data Relationships

```
User ──< GroupMember >── Group
User ──< ExpensePayer (1 per expense)
Group ──< Expense
Expense ──< ExpenseSplit (one per participant)
User ──< Settlement (as payer or payee)
Group ──< Settlement (optional link)
Expense ──< Comment
User ──< Comment
```

---

### Business Rules

1. **Expense invariant**: Sum of all splits must exactly equal the total expense amount (±0.01 for floating point).
2. **Payer rule**: The payer is always a member of the group.
3. **Split participant rule**: All split participants must be group members.
4. **Settlement rule**: Settlement can only be between two users who have a non-zero balance.
5. **Balance rule**: A user's balance in a group = (sum of what others owe them) − (sum of what they owe others).
6. **Deletion rule**: Soft-delete expenses (never hard-delete) to preserve audit trail.
7. **Percentage split rule**: Sum of all percentages must equal exactly 100.
8. **Share split rule**: Each share value must be > 0; total shares determine proportion.

---

### Balance Calculation Logic

#### Per-Group Balance Matrix
For a group with members [A, B, C]:
1. For each expense, record: payer is "owed" the split amounts by each participant
2. Build a net matrix: `net[i][j]` = amount i owes j (negative means j owes i)
3. Simplify: collapse to minimum set of transactions

#### Debt Simplification (Greedy Algorithm)
1. Compute net balance for each person (positive = owed money, negative = owes money)
2. Sort creditors (positive) and debtors (negative)
3. Match largest debtor with largest creditor
4. Record transaction, reduce balances, repeat until all zero
5. Result: minimum number of transactions to settle all debts

#### Example
- A paid ₹900 split equally 3 ways: B owes A ₹300, C owes A ₹300
- B paid ₹300 split equally 3 ways: A owes B ₹100, C owes B ₹100
- Net: A is owed ₹200, B is owed ₹200 net... (trace through)
- Simplified: C pays A ₹300, C pays B ₹100 → OR just C pays A ₹400 net

---

## PHASE 2 — SYSTEM DESIGN

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT (Vercel)                       │
│                                                             │
│   React + Vite + TailwindCSS                                │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│   │  Auth    │  │  Groups  │  │ Expenses │  │  Chat    │  │
│   │  Pages   │  │  Pages   │  │  Pages   │  │  Widget  │  │
│   └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
│         │              │             │              │        │
│   ┌─────────────────────────────────────────────┐          │
│   │          React Context + React Query         │          │
│   └─────────────────────────────────────────────┘          │
│         │ HTTP (REST)                   │ WebSocket          │
└─────────┼───────────────────────────────┼───────────────────┘
          │                               │
┌─────────▼───────────────────────────────▼───────────────────┐
│                      SERVER (Render)                         │
│                                                             │
│   Node.js + Express + Socket.IO                             │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│   │  Auth    │  │  Groups  │  │ Expenses │  │  Socket  │  │
│   │  Router  │  │  Router  │  │  Router  │  │  Handler │  │
│   └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
│         │              │             │              │        │
│   ┌─────────────────────────────────────────────┐          │
│   │      Middleware: Auth, Validation, Errors    │          │
│   └─────────────────────────────────────────────┘          │
│         │                                                    │
│   ┌─────────────────────────────────────────────┐          │
│   │           Prisma ORM (Query Builder)         │          │
│   └─────────────────────────────────────────────┘          │
│         │                                                    │
└─────────┼────────────────────────────────────────────────── ┘
          │
┌─────────▼───────────────────┐
│    DATABASE (Neon)          │
│    PostgreSQL 15            │
│    Hosted on Neon.tech      │
└─────────────────────────────┘
```

---

### Frontend Architecture

```
src/
├── api/              # Axios instances + API call functions
├── components/       # Reusable UI components
│   ├── common/       # Button, Input, Modal, Avatar, etc.
│   ├── groups/       # GroupCard, GroupList, MemberList
│   ├── expenses/     # ExpenseForm, ExpenseCard, SplitEditor
│   ├── balances/     # BalanceCard, SettlementForm
│   └── chat/         # ChatWindow, MessageBubble
├── contexts/         # AuthContext, SocketContext
├── hooks/            # useAuth, useExpenses, useSocket
├── pages/            # Route-level components
│   ├── Auth/
│   ├── Dashboard/
│   ├── Groups/
│   ├── GroupDetail/
│   ├── ExpenseDetail/
│   └── Settlements/
├── utils/            # formatCurrency, calculateSplits, dates
├── App.jsx
└── main.jsx
```

**State Management Decision**: React Context for auth + socket (low-frequency global state). React Query (TanStack Query) for server state (expenses, groups, balances) — gives caching, background refresh, optimistic updates.

**Routing**: React Router v6 with protected routes.

---

### Backend Architecture

```
server/
├── routes/           # Express route handlers
│   ├── auth.routes.js
│   ├── user.routes.js
│   ├── group.routes.js
│   ├── expense.routes.js
│   ├── settlement.routes.js
│   └── comment.routes.js
├── controllers/      # Business logic layer
├── middleware/        # auth, validation, error handling
├── services/         # Balance engine, split calculator
│   ├── balance.service.js
│   └── split.service.js
├── socket/           # Socket.IO event handlers
│   └── chat.socket.js
├── prisma/           # Schema + migrations
│   └── schema.prisma
├── utils/            # Helpers
└── server.js         # Entry point
```

**Architecture Pattern**: Controller-Service pattern. Routes handle HTTP, controllers orchestrate, services contain pure business logic. This makes business logic independently testable.

---

### Database Design (ER Diagram)

```
┌───────────────────┐       ┌────────────────────┐
│       User        │       │       Group        │
├───────────────────┤       ├────────────────────┤
│ id (PK)           │       │ id (PK)            │
│ email (UNIQUE)    │       │ name               │
│ name              │       │ description        │
│ passwordHash      │       │ type (ENUM)        │
│ avatarUrl         │       │ createdById (FK)   │
│ createdAt         │       │ createdAt          │
│ updatedAt         │       │ updatedAt          │
└─────────┬─────────┘       └──────────┬─────────┘
          │                            │
          │    ┌───────────────────────┤
          │    │                       │
          └────▼────────────────────┐  │
               │    GroupMember     │  │
               ├────────────────────┤  │
               │ id (PK)            │  │
               │ groupId (FK) ──────┘  │
               │ userId (FK)           │
               │ role (ENUM)           │
               │ joinedAt              │
               └────────────────────┘
                                       │
          ┌────────────────────────────▼───┐
          │           Expense              │
          ├────────────────────────────────┤
          │ id (PK)                        │
          │ groupId (FK)                   │
          │ title                          │
          │ amount (Decimal)               │
          │ currency                       │
          │ paidById (FK → User)           │
          │ splitType (ENUM)               │
          │ date                           │
          │ notes                          │
          │ isDeleted (soft delete)        │
          │ createdAt                      │
          │ updatedAt                      │
          └──────────────┬─────────────────┘
                         │
          ┌──────────────▼──────────────┐
          │       ExpenseSplit          │
          ├─────────────────────────────┤
          │ id (PK)                     │
          │ expenseId (FK)              │
          │ userId (FK)                 │
          │ amount (Decimal)            │
          │ percentage (optional)       │
          │ shares (optional)           │
          └─────────────────────────────┘

          ┌─────────────────────────────┐
          │         Settlement          │
          ├─────────────────────────────┤
          │ id (PK)                     │
          │ groupId (FK, optional)      │
          │ paidById (FK → User)        │
          │ receivedById (FK → User)    │
          │ amount (Decimal)            │
          │ notes                       │
          │ settledAt                   │
          │ createdAt                   │
          └─────────────────────────────┘

          ┌─────────────────────────────┐
          │          Comment            │
          ├─────────────────────────────┤
          │ id (PK)                     │
          │ expenseId (FK)              │
          │ userId (FK)                 │
          │ content                     │
          │ createdAt                   │
          │ updatedAt                   │
          └─────────────────────────────┘
```

---

### Prisma Schema

```prisma
// This is your Prisma schema file.
// Full schema is in /server/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum GroupType {
  HOME
  TRIP
  COUPLE
  OTHER
}

enum MemberRole {
  ADMIN
  MEMBER
}

enum SplitType {
  EQUAL
  UNEQUAL
  PERCENTAGE
  SHARES
}

model User {
  id           String    @id @default(cuid())
  email        String    @unique
  name         String
  passwordHash String
  avatarUrl    String?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  groupMemberships  GroupMember[]
  expensesPaid      Expense[]       @relation("ExpensePayer")
  expenseSplits     ExpenseSplit[]
  settlements_paid  Settlement[]    @relation("SettlementPayer")
  settlements_recv  Settlement[]    @relation("SettlementReceiver")
  comments          Comment[]
  createdGroups     Group[]         @relation("GroupCreator")
}

model Group {
  id          String    @id @default(cuid())
  name        String
  description String?
  type        GroupType @default(OTHER)
  createdById String
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  creator     User          @relation("GroupCreator", fields: [createdById], references: [id])
  members     GroupMember[]
  expenses    Expense[]
  settlements Settlement[]
}

model GroupMember {
  id       String     @id @default(cuid())
  groupId  String
  userId   String
  role     MemberRole @default(MEMBER)
  joinedAt DateTime   @default(now())

  group Group @relation(fields: [groupId], references: [id], onDelete: Cascade)
  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([groupId, userId])
}

model Expense {
  id        String    @id @default(cuid())
  groupId   String
  title     String
  amount    Decimal   @db.Decimal(10, 2)
  currency  String    @default("INR")
  paidById  String
  splitType SplitType
  date      DateTime  @default(now())
  notes     String?
  isDeleted Boolean   @default(false)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  group    Group          @relation(fields: [groupId], references: [id], onDelete: Cascade)
  paidBy   User           @relation("ExpensePayer", fields: [paidById], references: [id])
  splits   ExpenseSplit[]
  comments Comment[]
}

model ExpenseSplit {
  id         String   @id @default(cuid())
  expenseId  String
  userId     String
  amount     Decimal  @db.Decimal(10, 2)
  percentage Decimal? @db.Decimal(5, 2)
  shares     Int?

  expense Expense @relation(fields: [expenseId], references: [id], onDelete: Cascade)
  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([expenseId, userId])
}

model Settlement {
  id           String   @id @default(cuid())
  groupId      String?
  paidById     String
  receivedById String
  amount       Decimal  @db.Decimal(10, 2)
  notes        String?
  settledAt    DateTime @default(now())
  createdAt    DateTime @default(now())

  group      Group? @relation(fields: [groupId], references: [id])
  paidBy     User   @relation("SettlementPayer", fields: [paidById], references: [id])
  receivedBy User   @relation("SettlementReceiver", fields: [receivedById], references: [id])
}

model Comment {
  id        String   @id @default(cuid())
  expenseId String
  userId    String
  content   String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  expense Expense @relation(fields: [expenseId], references: [id], onDelete: Cascade)
  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

---

### API Design

#### Base URL: `/api/v1`

#### Authentication Headers
All protected routes require:
```
Authorization: Bearer <jwt_token>
```

---

#### Auth Routes

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | /auth/register | Register new user | No |
| POST | /auth/login | Login, receive JWT | No |
| GET | /auth/me | Get current user | Yes |

**POST /auth/register**
```json
Request:
{
  "name": "Rahul Sharma",
  "email": "rahul@example.com",
  "password": "SecurePass123"
}

Response 201:
{
  "user": { "id": "clx...", "name": "Rahul Sharma", "email": "rahul@example.com" },
  "token": "eyJhbGci..."
}
```

**POST /auth/login**
```json
Request:
{ "email": "rahul@example.com", "password": "SecurePass123" }

Response 200:
{
  "user": { "id": "clx...", "name": "Rahul Sharma", "email": "rahul@example.com" },
  "token": "eyJhbGci..."
}
```

---

#### Group Routes

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | /groups | Create group | Yes |
| GET | /groups | Get user's groups | Yes |
| GET | /groups/:id | Get group detail | Yes |
| PUT | /groups/:id | Update group | Yes (Admin) |
| DELETE | /groups/:id | Delete group | Yes (Admin) |
| POST | /groups/:id/members | Add member by email | Yes (Admin) |
| DELETE | /groups/:id/members/:userId | Remove member | Yes (Admin) |

**POST /groups**
```json
Request:
{
  "name": "Goa Trip 2024",
  "description": "Annual beach trip",
  "type": "TRIP"
}

Response 201:
{
  "id": "clx...",
  "name": "Goa Trip 2024",
  "type": "TRIP",
  "members": [{ "userId": "...", "role": "ADMIN" }]
}
```

---

#### Expense Routes

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | /groups/:groupId/expenses | Add expense | Yes (Member) |
| GET | /groups/:groupId/expenses | List expenses | Yes (Member) |
| GET | /groups/:groupId/expenses/:id | Get expense | Yes (Member) |
| PUT | /groups/:groupId/expenses/:id | Edit expense | Yes (Creator) |
| DELETE | /groups/:groupId/expenses/:id | Soft-delete | Yes (Creator/Admin) |

**POST /groups/:groupId/expenses**
```json
Request (Equal Split):
{
  "title": "Hotel Room",
  "amount": 6000,
  "paidById": "user_id_rahul",
  "splitType": "EQUAL",
  "date": "2024-03-15",
  "splits": [
    { "userId": "user_id_rahul" },
    { "userId": "user_id_priya" },
    { "userId": "user_id_arjun" }
  ]
}

Request (Unequal Split):
{
  "title": "Dinner",
  "amount": 1500,
  "paidById": "user_id_rahul",
  "splitType": "UNEQUAL",
  "splits": [
    { "userId": "user_id_rahul", "amount": 800 },
    { "userId": "user_id_priya", "amount": 400 },
    { "userId": "user_id_arjun", "amount": 300 }
  ]
}

Request (Percentage Split):
{
  "title": "Cab",
  "amount": 1000,
  "paidById": "user_id_priya",
  "splitType": "PERCENTAGE",
  "splits": [
    { "userId": "user_id_rahul", "percentage": 50 },
    { "userId": "user_id_priya", "percentage": 30 },
    { "userId": "user_id_arjun", "percentage": 20 }
  ]
}

Request (Shares Split):
{
  "title": "Groceries",
  "amount": 2000,
  "paidById": "user_id_arjun",
  "splitType": "SHARES",
  "splits": [
    { "userId": "user_id_rahul", "shares": 2 },
    { "userId": "user_id_priya", "shares": 1 },
    { "userId": "user_id_arjun", "shares": 1 }
  ]
}

Response 201:
{
  "id": "clx...",
  "title": "Hotel Room",
  "amount": "6000.00",
  "splitType": "EQUAL",
  "paidBy": { "id": "...", "name": "Rahul" },
  "splits": [
    { "userId": "...", "name": "Rahul", "amount": "2000.00" },
    { "userId": "...", "name": "Priya", "amount": "2000.00" },
    { "userId": "...", "name": "Arjun", "amount": "2000.00" }
  ]
}
```

---

#### Balance Routes

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /groups/:groupId/balances | Group balance summary | Yes |
| GET | /balances | Overall balances (all groups) | Yes |
| GET | /balances/simplified | Simplified settlement plan | Yes |

**GET /groups/:groupId/balances**
```json
Response 200:
{
  "groupId": "clx...",
  "balances": [
    {
      "userId": "...",
      "name": "Rahul",
      "netAmount": 400.00,
      "owes": [],
      "isOwed": [
        { "fromUserId": "...", "fromName": "Priya", "amount": 200 },
        { "fromUserId": "...", "fromName": "Arjun", "amount": 200 }
      ]
    }
  ]
}
```

---

#### Settlement Routes

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | /settlements | Record a settlement | Yes |
| GET | /settlements | Get user's settlements | Yes |
| GET | /groups/:groupId/settlements | Group settlements | Yes |

---

#### Comment Routes

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /expenses/:expenseId/comments | Get comments | Yes |
| POST | /expenses/:expenseId/comments | Post comment | Yes |
| DELETE | /expenses/:expenseId/comments/:id | Delete comment | Yes (Owner) |

---

### Socket.IO Events

#### Connection
```
Client connects with: { auth: { token: "JWT" } }
Server validates JWT on connection.
```

#### Events

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `join_expense` | Client → Server | `{ expenseId }` | Join expense chat room |
| `leave_expense` | Client → Server | `{ expenseId }` | Leave expense chat room |
| `send_comment` | Client → Server | `{ expenseId, content }` | Send a comment |
| `new_comment` | Server → Client | `{ id, expenseId, user, content, createdAt }` | Broadcast new comment |
| `join_group` | Client → Server | `{ groupId }` | Join group activity room |
| `leave_group` | Client → Server | `{ groupId }` | Leave group activity room |
| `expense_added` | Server → Client | `{ groupId, expense }` | New expense in group |
| `expense_updated` | Server → Client | `{ groupId, expense }` | Expense edited |
| `settlement_recorded` | Server → Client | `{ groupId, settlement }` | Settlement logged |
| `error` | Server → Client | `{ message }` | Socket error |

**new_comment payload:**
```json
{
  "id": "clx...",
  "expenseId": "clx...",
  "user": { "id": "...", "name": "Rahul", "avatarUrl": null },
  "content": "This looks right!",
  "createdAt": "2024-03-15T10:30:00Z"
}
```

---

## PHASE 3 — PROJECT STRUCTURE

```
splitwise-clone/
├── client/                         # React frontend (deployed to Vercel)
│   ├── public/
│   ├── src/
│   │   ├── api/
│   │   │   ├── axios.js            # Axios instance with interceptors
│   │   │   ├── auth.api.js         # Auth API calls
│   │   │   ├── groups.api.js       # Group API calls
│   │   │   ├── expenses.api.js     # Expense API calls
│   │   │   ├── balances.api.js     # Balance API calls
│   │   │   ├── settlements.api.js  # Settlement API calls
│   │   │   └── comments.api.js     # Comment API calls
│   │   ├── components/
│   │   │   ├── common/
│   │   │   │   ├── Button.jsx
│   │   │   │   ├── Input.jsx
│   │   │   │   ├── Modal.jsx
│   │   │   │   ├── Avatar.jsx
│   │   │   │   ├── Badge.jsx
│   │   │   │   ├── LoadingSpinner.jsx
│   │   │   │   ├── EmptyState.jsx
│   │   │   │   └── ErrorBoundary.jsx
│   │   │   ├── layout/
│   │   │   │   ├── Navbar.jsx
│   │   │   │   ├── Sidebar.jsx
│   │   │   │   └── Layout.jsx
│   │   │   ├── groups/
│   │   │   │   ├── GroupCard.jsx
│   │   │   │   ├── GroupForm.jsx
│   │   │   │   └── MemberList.jsx
│   │   │   ├── expenses/
│   │   │   │   ├── ExpenseCard.jsx
│   │   │   │   ├── ExpenseForm.jsx
│   │   │   │   └── SplitEditor.jsx
│   │   │   ├── balances/
│   │   │   │   ├── BalanceSummary.jsx
│   │   │   │   └── SettlementForm.jsx
│   │   │   └── chat/
│   │   │       ├── ChatWindow.jsx
│   │   │       └── MessageBubble.jsx
│   │   ├── contexts/
│   │   │   ├── AuthContext.jsx     # User auth state
│   │   │   └── SocketContext.jsx   # Socket.IO connection
│   │   ├── hooks/
│   │   │   ├── useAuth.js
│   │   │   ├── useSocket.js
│   │   │   └── useGroups.js
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   │   ├── LoginPage.jsx
│   │   │   │   └── RegisterPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── groups/
│   │   │   │   ├── GroupsPage.jsx
│   │   │   │   └── GroupDetailPage.jsx
│   │   │   ├── expenses/
│   │   │   │   └── ExpenseDetailPage.jsx
│   │   │   └── SettlementsPage.jsx
│   │   ├── utils/
│   │   │   ├── currency.js         # Format INR/USD amounts
│   │   │   ├── dates.js            # Date formatting helpers
│   │   │   └── splits.js           # Client-side split preview
│   │   ├── App.jsx                 # Routes + providers
│   │   ├── main.jsx                # Vite entry
│   │   └── index.css               # Tailwind base
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
├── server/                          # Node.js backend (deployed to Render)
│   ├── prisma/
│   │   ├── schema.prisma            # Full schema
│   │   └── migrations/              # Auto-generated
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── user.routes.js
│   │   │   ├── group.routes.js
│   │   │   ├── expense.routes.js
│   │   │   ├── settlement.routes.js
│   │   │   ├── balance.routes.js
│   │   │   └── comment.routes.js
│   │   ├── controllers/
│   │   │   ├── auth.controller.js
│   │   │   ├── group.controller.js
│   │   │   ├── expense.controller.js
│   │   │   ├── settlement.controller.js
│   │   │   ├── balance.controller.js
│   │   │   └── comment.controller.js
│   │   ├── services/
│   │   │   ├── balance.service.js   # Core balance engine
│   │   │   └── split.service.js     # Split calculation
│   │   ├── middleware/
│   │   │   ├── auth.middleware.js   # JWT verification
│   │   │   ├── validate.middleware.js # Zod validation
│   │   │   └── error.middleware.js  # Global error handler
│   │   ├── socket/
│   │   │   └── chat.socket.js       # Socket.IO event handlers
│   │   ├── utils/
│   │   │   ├── prisma.js            # Prisma client singleton
│   │   │   ├── jwt.js               # Sign/verify helpers
│   │   │   └── AppError.js          # Custom error class
│   │   └── validators/
│   │       ├── auth.validator.js    # Zod schemas for auth
│   │       ├── group.validator.js
│   │       └── expense.validator.js
│   ├── server.js                    # Express + Socket.IO entry
│   ├── .env.example
│   └── package.json
│
├── AI_CONTEXT.md                    # Living architecture document
├── BUILD_PLAN.md                    # This file
└── README.md                        # Setup + deployment guide
```

---

## PHASE 4 — IMPLEMENTATION ROADMAP

### Milestone 1: Authentication
**Goal**: Users can register, log in, and get their profile. JWT issued and validated.

**Tasks**:
1. Initialize server project (Express + Prisma)
2. Set up Neon DB + Prisma connection
3. User model migration
4. POST /auth/register — hash password, create user, return JWT
5. POST /auth/login — verify password, return JWT
6. GET /auth/me — return current user from JWT
7. Auth middleware (protect routes)
8. Initialize client project (React + Vite + Tailwind)
9. AuthContext + useAuth hook
10. LoginPage + RegisterPage
11. Protected route wrapper

**Files to create**:
- `server/prisma/schema.prisma`
- `server/src/utils/prisma.js`
- `server/src/utils/jwt.js`
- `server/src/utils/AppError.js`
- `server/src/middleware/auth.middleware.js`
- `server/src/middleware/error.middleware.js`
- `server/src/routes/auth.routes.js`
- `server/src/controllers/auth.controller.js`
- `server/server.js`
- `client/src/api/axios.js`
- `client/src/api/auth.api.js`
- `client/src/contexts/AuthContext.jsx`
- `client/src/hooks/useAuth.js`
- `client/src/pages/auth/LoginPage.jsx`
- `client/src/pages/auth/RegisterPage.jsx`
- `client/src/components/common/Button.jsx`
- `client/src/components/common/Input.jsx`
- `client/src/App.jsx`

**Expected outcome**: `/login` and `/register` work end-to-end. JWT stored in localStorage. Authenticated requests work.

---

### Milestone 2: Groups
**Goal**: Authenticated users can create groups, add members, view group list.

**Tasks**:
1. GroupMember migration
2. POST /groups
3. GET /groups (user's groups)
4. GET /groups/:id
5. POST /groups/:id/members (add by email)
6. DELETE /groups/:id/members/:userId
7. GroupsPage, GroupDetailPage, GroupCard, GroupForm
8. Group member list UI

**Files to create**:
- `server/src/routes/group.routes.js`
- `server/src/controllers/group.controller.js`
- `server/src/validators/group.validator.js`
- `client/src/api/groups.api.js`
- `client/src/pages/groups/GroupsPage.jsx`
- `client/src/pages/groups/GroupDetailPage.jsx`
- `client/src/components/groups/GroupCard.jsx`
- `client/src/components/groups/GroupForm.jsx`
- `client/src/components/groups/MemberList.jsx`

**Expected outcome**: Full group CRUD. Member management. Group pages render correctly.

---

### Milestone 3: Expenses
**Goal**: Members can add expenses with all 4 split types. Expenses display in group.

**Tasks**:
1. Expense + ExpenseSplit migration
2. Split calculation service (all 4 types)
3. POST /groups/:id/expenses
4. GET /groups/:id/expenses
5. GET /groups/:id/expenses/:expenseId
6. PUT + DELETE (soft) endpoints
7. ExpenseForm with dynamic SplitEditor
8. ExpenseCard, ExpenseDetailPage

**Files to create**:
- `server/src/services/split.service.js`
- `server/src/routes/expense.routes.js`
- `server/src/controllers/expense.controller.js`
- `server/src/validators/expense.validator.js`
- `client/src/api/expenses.api.js`
- `client/src/components/expenses/ExpenseForm.jsx`
- `client/src/components/expenses/SplitEditor.jsx`
- `client/src/components/expenses/ExpenseCard.jsx`
- `client/src/pages/expenses/ExpenseDetailPage.jsx`

**Expected outcome**: Create any split type expense. See list in group. View individual expense.

---

### Milestone 4: Balance Engine
**Goal**: Accurate real-time balances. Per-group and overall. Simplified settlement view.

**Tasks**:
1. Balance calculation algorithm (per group)
2. Debt simplification algorithm (greedy)
3. GET /groups/:id/balances
4. GET /balances (overall)
5. GET /balances/simplified
6. BalanceSummary component
7. Dashboard with "owe/owed" totals

**Files to create**:
- `server/src/services/balance.service.js`
- `server/src/routes/balance.routes.js`
- `server/src/controllers/balance.controller.js`
- `client/src/api/balances.api.js`
- `client/src/components/balances/BalanceSummary.jsx`
- `client/src/pages/DashboardPage.jsx`

**Expected outcome**: Correct balances visible. Simplified settlement suggestions shown.

---

### Milestone 5: Settlements
**Goal**: Users can record settlements. Balances update accordingly.

**Tasks**:
1. Settlement migration
2. POST /settlements
3. GET /settlements
4. GET /groups/:id/settlements
5. SettlementForm component
6. SettlementsPage

**Files to create**:
- `server/src/routes/settlement.routes.js`
- `server/src/controllers/settlement.controller.js`
- `client/src/api/settlements.api.js`
- `client/src/components/balances/SettlementForm.jsx`
- `client/src/pages/SettlementsPage.jsx`

**Expected outcome**: Settlement recorded, balance recalculated, reflects on dashboard.

---

### Milestone 6: Real-time Chat
**Goal**: Real-time comment thread on each expense. Socket.IO bidirectional.

**Tasks**:
1. Comment migration
2. GET + POST /expenses/:id/comments
3. Socket.IO server setup
4. join_expense / send_comment / new_comment events
5. JWT auth on socket connection
6. ChatWindow + MessageBubble components
7. SocketContext
8. group activity broadcasts (expense_added, etc.)

**Files to create**:
- `server/src/routes/comment.routes.js`
- `server/src/controllers/comment.controller.js`
- `server/src/socket/chat.socket.js`
- `client/src/contexts/SocketContext.jsx`
- `client/src/hooks/useSocket.js`
- `client/src/components/chat/ChatWindow.jsx`
- `client/src/components/chat/MessageBubble.jsx`

**Expected outcome**: Two browser tabs in same expense see comments in real time.

---

### Milestone 7: Deployment
**Goal**: App running live on Vercel + Render + Neon.

**Tasks**:
1. Neon: create project, get DATABASE_URL
2. Run `prisma migrate deploy` against Neon
3. Render: create Web Service for server, set env vars
4. Vercel: connect GitHub repo, set VITE_API_URL
5. Test end-to-end in production

**Expected outcome**: Publicly accessible app with all features working in production.
