# ClinicWorks - Clinical Document Processing Platform

An enterprise-grade, lightweight clinical document processing platform built using **Node.js, TypeScript, React 18, Vite, Docker, Google Gemini Multimodal AI, PostgreSQL, Azure Functions, and Azure Logic Apps**.

ClinicWorks automatically ingests clinical documents (both digital selectable PDFs and scanned image PDFs), classifies the clinical quality measure (**Blood Pressure** or **HbA1c**), extracts validated clinical values, applies deterministic clinical business rules, computes a multi-factor confidence score, and stores the results in PostgreSQL for real-time monitoring on a web dashboard with one-click **Retry** functionality.

---

## Monorepo Architecture

The repository is organized as an industry-standard **npm workspaces monorepo** with dedicated, autonomous packages:

```
clinicworks/
├── docker-compose.yml                   # One-command orchestration (Postgres + Backend + Frontend)
├── package.json                         # Root npm workspace orchestrator
├── tsconfig.json                        # Root base configuration
├── .gitignore                           # Workspace gitignore
├── .env.example                         # Environment variables template
├── README.md                            # Main architecture & quickstart guide
├── database/
│   ├── schema.sql                       # PostgreSQL schema (DDL)
│   └── seed.sql                         # Initial benchmark clinical data
├── docs/
│   ├── azure_naming_conventions.md      # Official Azure naming registry
│   └── dbeaver_setup.md                 # DBeaver database guide
├── sample-docs/                         # 8 synthetic clinical test PDFs
├── backend/                             # Package: @clinicworks/backend
│   ├── Dockerfile                       # Dedicated Node 20 Alpine container
│   ├── .dockerignore                    # Backend Docker ignore
│   ├── README.md                        # Backend documentation (API, Rules, Gemini, DB)
│   ├── package.json                     # Express, Gemini AI, PG, PDF-Lib, Multer
│   ├── tsconfig.json                    # Strict NodeNext TypeScript config
│   ├── src/                             # Backend source code
│   └── tests/                           # Vitest test suites (26 passing tests)
└── frontend/                            # Package: @clinicworks/frontend
    ├── Dockerfile                       # Multi-stage container (Vite -> Nginx Alpine)
    ├── nginx.conf                       # Reverse proxy configuration (/api -> backend:3000)
    ├── .dockerignore                    # Frontend Docker ignore
    ├── README.md                        # Frontend documentation (Components, API client, Vite)
    ├── package.json                     # React 18, Vite, Lucide React
    ├── tsconfig.json                    # React DOM TS config
    ├── vite.config.ts                   # Vite build configuration
    ├── index.html                       # HTML5 entry point
    └── src/                             # React components, styles & typed API client
```

For package-specific details:
- See [`backend/README.md`](backend/README.md) for REST API endpoints, clinical rules logic, Gemini AI pipeline, and database models.
- See [`frontend/README.md`](frontend/README.md) for React component hierarchy, state management, and UI architecture.

---

## Quickstart

### Option 1: Run with Docker Compose (Recommended)

Run the full stack (PostgreSQL 16 + Backend API + React Dashboard via Nginx) in a single command:

```bash
# 1. Configure environment variables
cp .env.example .env

# 2. Spin up Postgres, Backend, and Frontend containers
docker compose up --build
```

- **Web Dashboard**: Open [http://localhost](http://localhost) (or [http://localhost:3000](http://localhost:3000))
- **API Health Check**: [http://localhost:3000/api/health](http://localhost:3000/api/health)
- **PostgreSQL Database**: `localhost:5432` (User: `postgres`, Password: `password123`, DB: `clinicworks`)

To stop:
```bash
docker compose down
```

---

### Option 2: Run with npm Workspaces (Local Development)

#### 1. Prerequisites
- **Node.js**: $\ge 20.0.0$
- **PostgreSQL**: Local instance or Azure Flexible Server (optional; in-memory fallback activates automatically if DB is unreachable)

#### 2. Install Dependencies
```bash
npm install
```

#### 3. Run Development Servers
```bash
# Start backend API server (port 3000)
npm run dev

# Or start frontend Vite hot-reloading dev server (port 5173)
npm run dev:frontend
```

#### 4. Run Tests & Type Checks
```bash
# Run all 26 backend unit & integration tests
npm test

# Run TypeScript strict type-check across both packages (Zero errors)
npm run type-check

# Compile production bundles for both frontend and backend
npm run build
```

---

## Clinical Business Rules Summary

### 1. Blood Pressure (BP) Rules
- **Pediatric Constraint**: Patients under age 18 are excluded. If patient age $< 18$, the measure is rejected and flagged as `Needs Review`.
- **Completeness**: Readings must include both Systolic and Diastolic values (e.g., `138/88 mmHg`).
- **Multiple Readings**:
  - Return the **most recent** reading when multiple dated measurements exist.
  - If dates are identical or indeterminable, return the **lowest BP based on Systolic + Diastolic sum**.
- **Goal / Target Exclusions**: Values labeled as `goal BP`, `target BP`, `past BP`, or reference ranges are ignored.

### 2. Hemoglobin A1c (HbA1c) Rules
- **Multiple Readings**: If multiple valid HbA1c values exist, return the **lowest value**.
- **Classification Badging**:
  - Value $> 5.9\% \implies$ `(Diabetes)` (e.g., `7.4% (Diabetes)`).
  - Value $> 5.7\%$ and $\le 5.9\% \implies$ `(Prediabetes)` (e.g., `5.8% (Prediabetes)`).
  - Value $\le 5.7\% \implies$ Normal reading.
- **Reference Range Exclusions**: Discard lab reference ranges, goals, and targets.

### 3. Processing Statuses
- **`Success`**: Valid clinical measure successfully extracted, verified, and stored.
- **`Needs Review`**: Document processed, but clinical criteria not met (e.g., age $< 18$).
- **`Failed`**: Extraction error. Eligible for **Retry** via dashboard.
