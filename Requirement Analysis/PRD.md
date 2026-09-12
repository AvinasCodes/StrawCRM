# StrawCRM — Product Requirements Document (PRD)

**Product:** StrawCRM  
**Product Type:** Internal Support & Operations Ticketing CRM  
**Purpose:** Datastraw AI + Tech Intern Assessment  
**Recommended Stack:** React + Tailwind CSS + FastAPI + Google Cloud Firestore + Gemini API  
**Deployment:** Render / Railway  
**Target Users:** Datastraw.in internal support & operations teams handling client support tickets

---

## 1. Product Vision

StrawCRM is a high-performance internal customer-support CRM that allows Datastraw operations staff to:

- Create and triage client support tickets with file attachments
- Instant search and status filtering (<10ms UI sync)
- Track ticket status with optimistic real-time synchronization
- View complete ticket inquiries and customer history
- Add internal collaboration team notes
- Use Gemini AI to summarize complex tickets and suggest contextual responses
- Monitor operations and SLA metrics from a unified internal dashboard

> **Product principle:** Simple enough to use immediately, powerful enough to demonstrate real-world AI + full-stack engineering.

The assessment recommends keeping the database simple and says one thoughtful addition is better than several shallow features.

---

## 2. Target Users

### Primary User — Support Agent

- View incoming tickets
- Search customers
- Understand issues
- Update ticket status
- Add internal notes
- Use AI assistance

### Secondary User — Support Manager

- Monitor ticket volume
- See open/in-progress/closed tickets
- Identify unresolved issues
- Review ticket activity

### Universal Team Access Model

- **Unified Ticket Repository**: All tickets are accessible by any authenticated staff member regardless of which user ID is logged in.
- **Zero Per-User Data Silos**: No separate, isolated data partitions exist per user ID. All agents share the same live queue, search index, and ticket updates.

---

## 3. Core User Flow

```text
                    StrawCRM
                       │
                       ▼
                Dashboard/Home
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
     Create Ticket   Search      Filter
          │            │            │
          └────────────┼────────────┘
                       ▼
                  Ticket List
                       │
                       ▼
                 Ticket Details
                       │
             ┌─────────┼─────────┐
             ▼         ▼         ▼
          Update     Add Note    AI Assist
          Status
```

---

## 4. MVP Features

The Datastraw assessment defines five core features.

### 4.1 Create Ticket

**Fields**
- Customer Name
- Customer Email
- Issue Subject
- Issue Description

**Automatically generated**
- Ticket ID
- Created timestamp
- Updated timestamp
- Default status = `Open`

Example:

```text
TKT-001
```

**Validation**
- Name required
- Valid email required
- Subject required
- Description required
- Reasonable character limits
- Clear validation messages

---

## 5. Ticket Dashboard

The home page is the main workspace.

### Header

```text
StrawCRM                         + New Ticket
```

### Summary Cards

```text
┌────────────┐ ┌──────────────┐ ┌────────────┐ ┌─────────────┐
│ Total      │ │ Open         │ │ In Progress│ │ Closed      │
│ 128        │ │ 42           │ │ 31         │ │ 55          │
└────────────┘ └──────────────┘ └────────────┘ └─────────────┘
```

### Search

```text
Search tickets, customers, emails...
```

Search should work while typing.

### Status Filter

```text
All
Open
In Progress
Closed
```

### Ticket Table

| Ticket ID | Customer | Subject | Status | Created | Action |
|---|---|---|---|---|---|
| TKT-001 | Rahul Sharma | Order delayed | Open | Today | View |
| TKT-002 | Priya Shah | Wrong product | In Progress | Today | View |
| TKT-003 | Aman Gupta | Refund request | Closed | Yesterday | View |

---

## 6. Ticket Details

Clicking a ticket opens a dedicated detail view.

```text
← Back to Tickets

TKT-001                         [Open]

Customer
Rahul Sharma
rahul@email.com

Issue
Order delayed

Description
My order was supposed to arrive yesterday...

────────────────────────────────

Status
[ Open ▼ ]

────────────────────────────────

Internal Notes

Agent:
Customer contacted courier.
             10:42 AM

[ Add Note ]

────────────────────────────────

AI Assistant

[ Summarize Ticket ]

AI Summary:
Customer is reporting a delayed order...

[ Generate Suggested Reply ]
```

---

## 7. AI Feature — StrawAI

This is the primary standout feature.

Instead of adding multiple shallow features, StrawCRM includes one meaningful AI assistant.

### AI Ticket Assistant

#### Summarize

Produces a concise summary of the customer's issue.

#### Categorize

Example:

```text
Category: Delivery Issue
Priority: Medium
```

#### Suggested Reply

Generates a professional support response that the agent can review before sending.

### Why this feature?

It connects the CRM to the AI-development focus of the role while remaining small enough to implement and explain properly.

---

## 8. Database Design

StrawCRM uses **Google Cloud Firestore (Real-Time NoSQL Document Store)** with offline-first client persistence and sub-second multi-tab updates. (SQL equivalent schema is provided for assessment specification parity).

### `tickets` Collection

| Field | Type | Description |
|---|---|---|
| id | String | Firestore document ID (matches ticket_id) |
| ticket_id | String | Unique public ID (e.g. `TKT-001`) |
| customer_name | String | Customer / client name |
| customer_email | String | Customer contact email |
| subject | String | Issue subject |
| description | String | Issue inquiry description |
| status | String | Open / In Progress / Closed |
| attachments | Array | File attachments metadata (name, size, type, url, created_at) |
| created_at | Timestamp/ISO | Creation time |
| updated_at | Timestamp/ISO | Last update |

### `tickets/{ticket_id}/notes` Subcollection

| Field | Type | Description |
|---|---|---|
| id | String | Note document ID |
| ticket_id | String | Related ticket foreign key identifier |
| note_text | String | Internal team note content |
| author_name | String | Support agent display name |
| author_email | String | Support agent email |
| created_at | Timestamp/ISO | Creation time |

---

## 9. REST API

FastAPI will expose the backend.

### Required Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/tickets` | Create ticket |
| GET | `/api/tickets` | List/search/filter tickets |
| GET | `/api/tickets/{ticket_id}` | Get ticket details |
| PUT | `/api/tickets/{ticket_id}` | Update status/notes |

### AI Endpoints

```text
POST /api/tickets/{ticket_id}/ai-summary
POST /api/tickets/{ticket_id}/ai-reply
```

These are optional additions for the AI feature.

---

## 10. Search Architecture

Search should support:

- Ticket ID
- Customer name
- Customer email
- Description
- Subject

Example:

```text
GET /api/tickets?search=rahul
```

Status:

```text
GET /api/tickets?status=Open
```

Both:

```text
GET /api/tickets?status=Open&search=rahul
```

---

## 11. Frontend Architecture

```text
src/
│
├── components/
│   ├── Navbar
│   ├── TicketCard
│   ├── TicketTable
│   ├── StatusBadge
│   ├── SearchBar
│   ├── StatusFilter
│   └── LoadingState
│
├── pages/
│   ├── Dashboard
│   ├── CreateTicket
│   └── TicketDetails
│
├── services/
│   └── api.js
│
├── hooks/
│
├── utils/
│
└── App.jsx
```

---

## 12. Backend Architecture

```text
backend/
│
├── app/
│   ├── main.py
│   │
│   ├── routes/
│   │   ├── tickets.py
│   │   └── ai.py
│   │
│   ├── models/
│   │   └── ticket.py
│   │
│   ├── schemas/
│   │   └── ticket.py
│   │
│   ├── services/
│   │   ├── ticket_service.py
│   │   └── ai_service.py
│   │
│   └── database/
│       └── supabase.py
│
├── requirements.txt
├── .env.example
└── README.md
```

---

## 13. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite |
| Styling | Tailwind CSS |
| Backend | Python + FastAPI |
| Database | Google Cloud Firestore (Real-Time NoSQL) |
| File Storage | FastAPI Static Storage (`/uploads/`) |
| Authentication | Firebase Auth |
| AI | Google Gemini API |
| Version Control | Git + GitHub |
| Frontend Deployment | Render / Vercel |
| Backend Deployment | Render / Railway |
| API | REST |
| Automation | n8n — optional future integration |

---

## 14. Deployment Architecture

```text
                  INTERNET
                     │
          ┌──────────┴──────────┐
          │                     │
          ▼                     ▼
     Frontend              Backend (FastAPI)
  React + Tailwind        REST API & Uploads
          │                     │
          │                     ▼
          │              Gemini AI Engine
          │                     │
          └──────────┬──────────┘
                     │
                     ▼
          Google Cloud Firestore
         Real-Time Data & Cache
```

The final application must be accessible for Datastraw operations staff.

---

## 15. UI/UX Direction

### Visual Style

**Modern SaaS dashboard**

- Clean
- Professional
- Minimal
- High information density
- Rounded cards
- Clear status badges
- Responsive
- Strong typography
- Good empty/loading/error states

### Status

- Open — attention/neutral
- In Progress — active
- Closed — success

### Responsive

Desktop-first but usable on mobile.

---

## 16. Error Handling

Handle:
- Invalid email
- Empty fields
- Ticket not found
- Database failure
- API failure
- AI API failure
- Network failure
- Duplicate ticket ID
- Invalid status

Frontend displays non-blocking toast notifications and inline alerts instead of crashing.

---

## 17. Loading & Empty States

### Loading
Skeleton loaders and spinners during initial query mounts.

### No Tickets
Clear empty state prompting the creation of the first ticket.

---

## 18. Security Basics

- API keys stored in environment variables
- Never commit `.env`
- `.env.example` included
- Server-side Pydantic validation
- CORS configured for frontend domain
- Firebase Auth JWT validation
- Static uploads directory sanitized and size-limited (50MB)

---

## 19. Repository Structure

```text
StrawCRM/
│
├── Implementation/
│   ├── Frontend/ (React + Vite + Tailwind CSS)
│   └── Backend/  (FastAPI + Python + Firestore Client)
│
├── Requirement Analysis/
│   ├── PRD.md
│   ├── TRD.md
│   └── WSIR.md
│
├── System Design/
│   └── Blueprint/
│       └── BLUEPRINT.md
│
├── firestore.rules
└── README.md
```

---

## 20. Demo Video Plan

Duration: **3–5 minutes**

| Minute | Segment | Content |
|---|---|---|
| **0:00 – 0:30** | Hook & Problem | Pain of slow internal support desks for Datastraw team operations |
| **0:30 – 1:30** | Core Tour | Creating tickets with file attachments, real-time live sync, search, status updates |
| **1:30 – 2:30** | AI Magic | Gemini AI ticket summarization and context-aware smart response generation |
| **2:30 – 3:30** | Technical Deep Dive | Architecture, Google Cloud Firestore real-time sync & offline cache, FastAPI upload endpoint |
| **3:30 – 4:00** | Conclusion | Datastraw internal operational impact and future extensions |

---

## 21. What We Will NOT Build

To stay focused on core business requirements:
- No complex multi-tenant billing or subscription management
- No heavy custom email SMTP server configuration (handled via webhooks in phase 2)
- No complex external payment gateways
- No redundant cloud blob bucket dependencies (leveraging streamlined FastAPI static upload system)

---

## 22. Future Roadmap

### Phase 2
- Agent shift scheduling & auto-assignment
- Email webhook integration (incoming email -> ticket)
- WhatsApp Business API connector for Datastraw clients
- Enhanced CSAT automated survey workflows

---

## 23. Success Criteria

### Core
- [x] User can create tickets with file attachments
- [x] Ticket ID generated automatically
- [x] Timestamp generated automatically
- [x] Tickets stored in Google Cloud Firestore (Real-Time & Offline cache)
- [x] Tickets displayed correctly in live queue
- [x] Search works while typing
- [x] Status filter works
- [x] Ticket details work
- [x] Status can be updated optimistically
- [x] Notes can be added to ticket timeline

### Engineering
- [x] REST API works (FastAPI)
- [x] Static file upload endpoint works (/api/upload up to 50MB)
- [x] Proper validation (Pydantic)
- [x] Proper error handling
- [x] Clean project structure
- [x] Environment variables secured
- [x] GitHub repository clean
- [x] README complete

### AI
- [x] Ticket summarization works (Gemini 1.5/2.0)
- [x] Tone-aware smart response suggestion works
- [x] AI failure handled gracefully
- [x] AI API key never exposed to frontend

### Deployment
- [ ] Frontend live (Render / Vercel)
- [ ] Backend live (Render / Railway)
- [x] Database connected (Google Cloud Firestore)
- [ ] Production environment tested

### Submission
- [ ] Live URL
- [ ] GitHub repository
- [ ] 3–5 minute demo video
- [ ] Technical approach explained
- [ ] Challenges explained
- [ ] Future improvements explained

---

## 24. Final Product Definition

### StrawCRM

> **An AI-assisted customer support CRM that helps Datastraw internal support teams create, organize, search, resolve and understand customer tickets from one unified workspace.**

### Final Architecture

```text
                       STRAWCRM
                           │
             ┌─────────────┴─────────────┐
             │                           │
       React + Tailwind              FastAPI
       Frontend (Vite)               REST API & Uploads
             │                           │
             └─────────────┬─────────────┘
                           │
                 Google Cloud Firestore
                 Real-Time Data & Cache
                           │
                    ┌──────┴──────┐
                    │             │
                 Tickets        Notes
                    │
                    ▼
                 StrawAI
                    │
               Gemini API
```

**Architecture goal:** satisfy the required full-stack CRM while demonstrating database, REST APIs, frontend, AI-assisted development, deployment and end-to-end thinking.
