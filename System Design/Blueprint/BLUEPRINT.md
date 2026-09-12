# StrawCRM — Technical Blueprint

## 1. System Overview

StrawCRM is a full-stack internal customer support and operations CRM built for Datastraw.in with:

- Frontend: React + Tailwind CSS (Vite)
- Backend: Python + FastAPI
- Database: Google Cloud Firestore (Real-time NoSQL document DB with relational PostgreSQL schema equivalence)
- File Storage: FastAPI Local / Render Persistent Storage (`POST /api/upload` -> static mount `/uploads/` up to 50MB)
- Authentication: Firebase Auth
- AI: Google Gemini API (Tone-aware summaries & reply drafts)
- Hosting: Render
- Version Control: GitHub

Architecture:

```text
Datastraw Staff
      |
      v
React + Tailwind (Vite)
      |
      +-- Real-Time Sync (<1ms) --> Google Cloud Firestore
      |                                     ^
      | HTTPS / REST / Uploads              |
      v                                     | (Admin SDK)
   FastAPI ---------------------------------+
      |
      +--> Validation (Pydantic v2)
      +--> Static File Uploads (/uploads/)
      +--> Authentication / Authorization (Firebase Auth)
      +--> Gemini API (StrawAI)
```

The core request flow combines reactive real-time Firestore listeners (`onSnapshot`) for instant cross-tab queue sync with FastAPI REST endpoints for validated ticket mutations, local static file uploads, and Gemini AI analysis.

---

## 2. Requirements to Technical Components

| Requirement | Frontend | Backend | Database |
|---|---|---|---|
| Create ticket | Create Ticket modal + upload | POST /api/tickets | tickets collection |
| Upload attachment | Multi-file dropzone (up to 50MB) | POST /api/upload | Local static `/uploads/` |
| Auto ticket ID | Display generated ID | Generate TKT-XXX | Document ID (`TKT-001`) |
| Timestamp | Display date/time | Generate server timestamp | created_at ISO string |
| List tickets | Ticket queue + live listeners | GET /api/tickets & onSnapshot | tickets collection |
| Search | Instant typing filter + query | search query parameter | Ticket fields / cache |
| Status filter | Status badge selector | status query parameter | status field |
| Ticket details | Modal / Detail view | GET /api/tickets/{id} | tickets + notes subcollection |
| Update status | Optimistic status buttons | PUT /api/tickets/{id} | tickets.status |
| Add notes | Notes timeline input | PUT /api/tickets/{id} | tickets/{id}/notes subcollection |
| AI summary | Gemini 1.5/2.0 Copilot | POST /api/tickets/{id}/ai-summary | Reads ticket context |
| AI draft reply | Tone-aware smart response | POST /api/tickets/{id}/ai-reply | Gemini API generation |
| Responsive UI | Tailwind responsive layout | N/A | N/A |

---

## 3. Frontend Blueprint

```text
frontend/
|
+-- src/
|   |
|   +-- pages/
|   |   +-- Login.jsx
|   |   +-- Dashboard.jsx
|   |   +-- Tickets.jsx
|   |   +-- CreateTicket.jsx
|   |   +-- TicketDetail.jsx
|   |
|   +-- components/
|   |   +-- layout/
|   |   +-- tickets/
|   |   +-- forms/
|   |   +-- ui/
|   |
|   +-- services/
|   |   +-- api.js
|   |   +-- ticketService.js
|   |   +-- authService.js
|   |
|   +-- context/
|   |   +-- AuthContext.jsx
|   |
|   +-- routes/
|   |   +-- ProtectedRoute.jsx
|   |
|   +-- lib/
|       +-- firebase.js
|   |
|   +-- App.jsx
|   +-- main.jsx
|
+-- package.json
+-- tailwind.config.js
```

### Frontend Routes

```text
/login
/dashboard
/tickets
/tickets/create
/tickets/:ticketId
```

Required assessment pages:

- Home / Ticket List
- Create Ticket
- Ticket Detail
- Search
- Filter

---

## 4. Backend Blueprint

```text
Backend/
|
+-- app/
|   |
|   +-- main.py
|   |
|   +-- routes/
|   |   +-- tickets.py
|   |   +-- ai.py
|   |   +-- upload.py
|   |
|   +-- schemas/
|   |   +-- ticket.py
|   |   +-- ai.py
|   |
|   +-- services/
|   |   +-- ticket_service.py
|   |   +-- ai_service.py
|   |
|   +-- database/
|   |   +-- firestore_client.py
|   |
|   +-- core/
|       +-- config.py
|
+-- uploads/              (Static file uploads up to 50MB)
+-- requirements.txt
+-- .env
+-- .env.example
+-- README.md
```

---

## 5. Database Blueprint

The primary live data store is **Google Cloud Firestore**, structured with top-level tickets and subcollection notes, providing `<1ms` offline caching and instant socket synchronization. Full PostgreSQL DDL is maintained in Section 6 for assessment schema equivalence.

### Firestore `tickets` Collection

Path: `tickets/{ticket_id}`

```text
id              String (Document ID, e.g. TKT-001)
ticket_id       String (Human readable ID)
customer_name   String
customer_email  String
subject         String
description     String
status          String ('Open' | 'In Progress' | 'Closed')
attachments     Array[Object: { name, url, size, type }]
created_at      Timestamp / ISO String
updated_at      Timestamp / ISO String
```

Allowed status values:

```text
Open
In Progress
Closed
```

### Firestore `notes` Subcollection

Path: `tickets/{ticket_id}/notes/{note_id}`

```text
id              String (Document ID)
ticket_id       String (Parent ticket ID)
note_text       String
created_at      Timestamp / ISO String
```

Relationship:

```text
tickets/{ticket_id}
       |
       | 1 : N Subcollection
       v
tickets/{ticket_id}/notes/{note_id}
```

---

## 6. SQL Schema (Assessment Relational Parity)

```sql
CREATE TABLE tickets (
    id BIGSERIAL PRIMARY KEY,
    ticket_id VARCHAR(20) UNIQUE NOT NULL,
    customer_name VARCHAR(150) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Open',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT tickets_status_check
        CHECK (status IN ('Open', 'In Progress', 'Closed'))
);

CREATE TABLE notes (
    id BIGSERIAL PRIMARY KEY,
    ticket_id VARCHAR(20) NOT NULL,
    note_text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT notes_ticket_fk
        FOREIGN KEY (ticket_id)
        REFERENCES tickets(ticket_id)
        ON DELETE CASCADE
);
```

---

## 7. Pydantic Schemas

### TicketStatus

```text
Open
In Progress
Closed
```

### Attachment

```text
name: str
url: str
size: int
type: str
```

### TicketCreate

```text
customer_name
customer_email
subject
description
attachments: Optional[List[Attachment]]
```

### TicketUpdate

```text
status
notes (optional)
```

### TicketListItem

```text
ticket_id
customer_name
subject
status
created_at
```

### TicketResponse

```text
ticket_id
customer_name
customer_email
subject
description
status
attachments: List[Attachment]
created_at
updated_at
notes: List[NoteResponse]
```

---

## 8. REST API Blueprint

### Upload Attachment

```http
POST /api/upload
Content-Type: multipart/form-data
```

Upload payload:
- `file`: binary data up to 50MB

Response:
```json
{
  "name": "receipt.png",
  "url": "http://localhost:8000/uploads/20260910_receipt.png",
  "size": 524288,
  "type": "image/png"
}
```

---

### Create Ticket

```http
POST /api/tickets
```

Request:

```json
{
  "customer_name": "Rahul Sharma",
  "customer_email": "rahul@example.com",
  "subject": "Order delayed",
  "description": "My order has not arrived yet."
}
```

Response:

```json
{
  "ticket_id": "TKT-001",
  "created_at": "2026-09-09T10:30:00Z"
}
```

Status:

```text
201 Created
```

---

### List Tickets

```http
GET /api/tickets
```

Search:

```http
GET /api/tickets?search=rahul
```

Status filter:

```http
GET /api/tickets?status=Open
```

Combined:

```http
GET /api/tickets?status=Open&search=rahul
```

Search fields:

```text
ticket_id
customer_name
customer_email
subject
description
```

---

### Get Ticket Details

```http
GET /api/tickets/{ticket_id}
```

Example:

```http
GET /api/tickets/TKT-001
```

Response contains:

```text
ticket_id
customer_name
customer_email
subject
description
status
created_at
updated_at
notes[]
```

---

### Update Ticket

```http
PUT /api/tickets/{ticket_id}
```

Request:

```json
{
  "status": "In Progress",
  "notes": "Checking delivery status with courier."
}
```

Response:

```json
{
  "success": true,
  "updated_at": "2026-09-09T11:00:00Z"
}
```

---

## 9. Authentication Blueprint

Authentication uses Firebase Auth.

```text
Login Page
    |
    v
Frontend Validation
    |
    v
Firebase Auth
    |
    +---- Failure ---> Safe Error Message
    |
    +---- Success
             |
             v
        Firebase ID Token
             |
             v
          Dashboard
```

Protected routes:

```text
/dashboard
/tickets
/tickets/create
/tickets/:ticketId
```

Public routes:

```text
/login
/forgot-password
```

For protected FastAPI endpoints:

```text
React
  |
  | Authorization: Bearer <firebase_id_token>
  v
FastAPI
  |
  v
Verify Firebase JWT (firebase-admin SDK)
  |
  +---- Invalid ---> 401
  |
  +---- Valid
          |
          v
      Business Logic
          |
          v
      Google Cloud Firestore
```

### Team Access Model

StrawCRM uses a unified team access architecture for Datastraw internal support:
- All tickets are stored in a centralized Firestore collection (`tickets`) and are universally accessible by any authenticated staff ID.
- No separate or segregated data partitions exist per user ID.
- Any support team member can view, search, filter, update, or add notes to any ticket across the entire organization.

---

## 10. AI Blueprint

Gemini is an optional standout feature and must not block the core CRM.

Example endpoints:

```http
POST /api/tickets/{ticket_id}/ai-summary
POST /api/tickets/{ticket_id}/ai-reply
```

Flow:

```text
User clicks "Summarize"
        |
        v
React
        |
        v
FastAPI
        |
        v
Fetch Ticket
        |
        v
Build Controlled Prompt
        |
        v
Gemini API
        |
        v
AI Response
        |
        v
FastAPI
        |
        v
React
```

The Gemini API key must remain server-side.

Never call Gemini directly from React using a secret API key.

---

## 11. Security Blueprint

```text
Browser
   |
   | HTTPS
   v
React
   |
   | HTTPS + Bearer Token
   v
FastAPI
   |
   +-- Authentication
   +-- Authorization
   +-- Pydantic Validation
   +-- CORS
   +-- Rate Limiting
   +-- Security Headers
   +-- Safe Error Handling
   |
   v
Google Cloud Firestore
```

Security rules:

- HTTPS in production
- Environment variables for secrets
- No secrets in Git
- Server-side AI API calls
- Protected database credentials
- Input validation
- Controlled CORS
- Safe error messages
- Do not log passwords
- Do not log tokens
- Do not log API keys
- Never expose FIREBASE_SERVICE_ACCOUNT credentials to React
- Never expose GEMINI_API_KEY to React

---

## 12. Environment Variables

### Frontend

```text
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
VITE_API_BASE_URL=
```

### Backend

```text
GOOGLE_APPLICATION_CREDENTIALS=
# or FIREBASE_SERVICE_ACCOUNT_KEY=
FIREBASE_PROJECT_ID=
GEMINI_API_KEY=
FRONTEND_URL=
PORT=8000
```

Never commit `.env`.

Commit `.env.example` with variable names only.

---

## 13. Deployment Blueprint

```text
                    GitHub
                      |
                      v
                GitHub Actions
                      |
               Build / Test
                      |
          +-----------+-----------+
          |                       |
          v                       v
   Render Static Site      Render Web Service
          |                       |
          v                       v
       React                   FastAPI
                                  |
                                  v
                         Supabase PostgreSQL
                                  |
                                  v
                             Gemini API
```

Deployment targets:

```text
Frontend -> Render Static Site
Backend  -> Render Web Service
Database -> Supabase PostgreSQL
AI       -> Gemini API
```

---

## 14. Error Handling

Frontend states:

```text
Default
Loading
Validation Error
Authentication Error
API Error
Empty State
Success
```

Backend status codes:

```text
201 -> Created
200 -> Success
400 -> Bad Request
401 -> Unauthenticated
403 -> Forbidden
404 -> Ticket Not Found
422 -> Validation Error
500 -> Internal Server Error
```

Do not expose stack traces or internal implementation details to users.

---

## 15. Validation Rules

Backend must reject:

```text
Missing customer name
Missing customer email
Invalid email
Missing subject
Missing description
Invalid status
Missing ticket
Empty note
Duplicate ticket ID
```

New tickets:

```text
status = Open
```

Creation:

```text
created_at = current timestamp
updated_at = current timestamp
```

Update:

```text
updated_at = current timestamp
```

---

## 16. Implementation Order

### Phase 1 — Foundation

```text
1. Initialize React
2. Initialize FastAPI
3. Configure Google Cloud / Firebase project
4. Create tickets Firestore model
5. Mount static upload router (/api/upload)
6. Connect FastAPI via Admin SDK
```

### Phase 2 — Core APIs

```text
7. POST /api/tickets
8. GET /api/tickets
9. Search
10. Status filtering
11. GET /api/tickets/{ticket_id}
12. PUT /api/tickets/{ticket_id}
```

### Phase 3 — Frontend

```text
13. Dashboard
14. Ticket List
15. Create Ticket
16. Ticket Detail
17. Search
18. Filter
19. Status Update
20. Notes
```

### Phase 4 — Authentication

```text
21. Login
22. Firebase Auth (Email/Password)
23. Firebase ID Token handling
24. Protected routes
25. FastAPI Firebase JWT verification (firebase-admin SDK)
```

### Phase 5 — AI

```text
26. Gemini integration
27. Ticket summary
28. Suggested response if stable
```

### Phase 6 — Production

```text
29. Loading states
30. Empty states
31. Error states
32. Responsive UI
33. Security review
34. API testing
35. Production deployment
36. Production testing
37. GitHub cleanup
38. README
39. Demo video
```

---

## 17. Definition of Done

StrawCRM is technically complete when:

### Frontend

```text
[ ] Login
[ ] Dashboard
[ ] Ticket list
[ ] Create ticket
[ ] Ticket details
[ ] Search
[ ] Status filter
[ ] Status update
[ ] Notes
[ ] AI summary
[ ] Responsive UI
```

### Backend

```text
[ ] REST API
[ ] Validation
[ ] Authentication
[ ] Authorization
[ ] Error handling
[ ] Google Cloud Firestore connection
[ ] Gemini integration
```

### Database

```text
[ ] tickets collection & SQL parity schema
[ ] notes subcollection
[ ] Foreign key
[ ] Unique ticket ID
[ ] Status constraint
[ ] Timestamps
```

### Production

```text
[ ] Frontend deployed
[ ] Backend deployed
[ ] Database connected
[ ] AI working
[ ] HTTPS
[ ] GitHub repository
[ ] README
[ ] .env.example
[ ] Demo video
```

---

## 18. Engineering Principle

Build the system as a sequence of working vertical slices:

```text
Database
   |
   v
Create Ticket API
   |
   v
Create Ticket UI
   |
   v
List API
   |
   v
Ticket List UI
   |
   v
Search + Filter
   |
   v
Detail API
   |
   v
Detail UI
   |
   v
Update + Notes
   |
   v
Authentication
   |
   v
Gemini
   |
   v
Security + Error States
   |
   v
Deployment
   |
   v
Production Testing
```

Do not over-engineer the MVP. The primary objective is a working, understandable, production-deployed CRM with the required ticket functionality.
