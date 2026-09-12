# 🍓 StrawCRM — Simple Tickets. Smarter Support.

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110.0-009688.svg?style=flat&logo=FastAPI&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19.x-61DAFB.svg?style=flat&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.x-646CFF.svg?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC.svg?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore%20%26%20Auth-FFA611.svg?style=flat&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Google Gemini](https://img.shields.io/badge/AI-Google%20Gemini-8E75C2.svg?style=flat&logo=google&logoColor=white)](https://ai.google.dev/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

StrawCRM is an **AI-augmented, real-time Customer Support & Ticketing CRM** designed for high-velocity support teams. Featuring an ultra-polished neumorphic retro-modern UI, bidirectional real-time synchronization between **FastAPI** and **Google Cloud Firestore**, and automated intelligence powered by **Google Gemini AI**.

---

## ✨ Key Features

### 🎫 Interactive Ticket Management
- **Authentic Retro Ticket Stubs**: Barcoded, stamp-styled interactive cards with dynamic status badges, priority markers, and assigned agent pills.
- **Precious Drag-to-Delete Interaction**: Drag any ticket card anywhere on screen to reveal an animated, mechanical hinged dustbin that chomps down with particle vibrations, optimistic removal (<1ms), and 5-second undo notifications.
- **Dual View Layout**: Switch effortlessly between **Grid Cards** and high-density **Tabular View** with persistent preferences.
- **Full Ticket Lifecycle**: Instant status transitions (`Open`, `In Progress`, `Closed`), multi-agent assignment, priority tags (`Low`, `Normal`, `High`, `Urgent`), and multi-file attachments.

### 👥 Verified Customer Directory
- **Deterministic Customer Accounts**: Automatically aggregated across tickets with deterministic ID assignment (`CUST-001`), deduplication by email/ID, and live inquiry counter.
- **Customer History Drawer**: Slide-out panel showing every historical interaction and ticket thread associated with a customer account.
- **Zero-Stale Realtime Sync**: Dynamic derivation ensuring customers without active inquiries cleanly disappear when tickets are purged.

### 🤖 Gemini AI Assistant & Automation
- **AI Suggested Replies**: One-click contextual drafts generated from ticket history and sentiment.
- **Smart Categorization & Sentiment Analysis**: Real-time ticket tone detection and priority recommendations.
- **Automated Email Notifications**: SMTP integration for urgent escalations and assignment alerts.

### ⚡ Architecture & Security
- **Bidirectional Realtime Synchronization**: Multi-layer sync engine combining Firestore WebSocket snapshots, local tombstone cache (`localStorage`), and FastAPI REST endpoints.
- **Enterprise Security**: Firebase Authentication, secure JWT validation, Cloudflare Turnstile bot verification, and strict CSP/CORS policies.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | React 19, Vite, TanStack Query |
| **Styling & UI** | TailwindCSS, Neumorphic Custom Design System, Lucide React Icons |
| **Backend API** | FastAPI (Python 3.11+), Uvicorn, Pydantic v2 |
| **Database & Realtime** | Google Cloud Firestore (WebSockets) + Persistent JSON Store |
| **Authentication** | Firebase Authentication + JWT Verification |
| **Artificial Intelligence** | Google Gemini API (`google-generativeai`) |
| **Deployment** | Render Blueprint (`render.yaml`), Docker-ready |

---

## 📁 Repository Structure

```
StrawCRM/
├── Implementation/
│   ├── Backend/                 # FastAPI REST API & AI Service
│   │   ├── app/
│   │   │   ├── core/            # Config, security, database connectors
│   │   │   ├── database/        # Firestore & persistent storage client
│   │   │   ├── routes/          # API endpoints (tickets, customers, AI, auth)
│   │   │   ├── schemas/         # Pydantic v2 request/response models
│   │   │   └── services/        # Ticket & AI business logic
│   │   ├── data/                # Persistent JSON store
│   │   ├── tests/               # Pytest suite
│   │   └── requirements.txt     # Python dependencies
│   │
│   └── Frontend/                # Vite React 19 Client
│       ├── src/
│       │   ├── components/      # UI components (Dustbin, Stubs, History Drawer)
│       │   ├── context/         # Auth & global state
│       │   ├── pages/           # Dashboard, Tickets, Customers, Analytics
│       │   ├── services/        # Firestore realtime service & REST client
│       │   └── index.css        # Tailwind & micro-animations
│       ├── package.json
│       └── vite.config.js
│
├── render.yaml                  # 1-Click Render Infrastructure Blueprint
├── firestore.rules              # Firebase Security Rules
├── firestore_schema.md          # Firestore collection specifications
├── start-dev.bat                # Local development launcher
└── README.md
```

---

## 🚀 Quick Start (Local Development)

### 1. Clone the Repository
```bash
git clone https://github.com/AvinasCodes/StrawCRM.git
cd StrawCRM
```

### 2. Backend Setup
```bash
cd Implementation/Backend
python -m venv venv

# Windows:
.\venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
```

Create `.env` file in `Implementation/Backend`:
```env
ENVIRONMENT=development
PROJECT_NAME="StrawCRM API"
FIREBASE_PROJECT_ID=strawcrm-98ee3
FRONTEND_URL=http://localhost:5173
GEMINI_API_KEY=your_gemini_api_key_here
```

Start the FastAPI server:
```bash
uvicorn app.main:app --reload --port 8000
```
> API Docs available at [http://localhost:8000/docs](http://localhost:8000/docs)

### 3. Frontend Setup
In a new terminal window:
```bash
cd Implementation/Frontend
npm install
```

Create `.env` file in `Implementation/Frontend`:
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=strawcrm-98ee3.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=strawcrm-98ee3
VITE_FIREBASE_STORAGE_BUCKET=strawcrm-98ee3.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

Start Vite dev server:
```bash
npm run dev
```
> App will be running at [http://localhost:5173](http://localhost:5173)

---

## 🌐 1-Click Deployment to Render

StrawCRM includes a complete [render.yaml](render.yaml) Blueprint for instant deployment:

1. Push your code to GitHub:
   ```bash
   git push origin main
   ```
2. Navigate to [Render Dashboard](https://dashboard.render.com/).
3. Click **New +** > **Blueprint**.
4. Select your `StrawCRM` repository.
5. Render will automatically detect and deploy both services:
   - **`strawcrm-backend`**: FastAPI Python Web Service (`Implementation/Backend`)
   - **`strawcrm-frontend`**: Vite React SPA Static Site (`Implementation/Frontend`)
6. Fill in any secret keys (`GEMINI_API_KEY`) and click **Apply**!

---

## 🧪 Testing & Verification

### Run Backend Tests:
```bash
cd Implementation/Backend
python -m pytest
```

### Validate Frontend Production Bundle:
```bash
cd Implementation/Frontend
npm run build
```

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<div align="center">
  <sub>Built with ❤️ by Avinash & StrawCRM Contributors</sub>
</div>
