# ClinicWorks Web Dashboard (`@clinicworks/frontend`)

The clinical operations web dashboard for the **ClinicWorks Clinical Document Processing Platform**. Built with **React 18**, **TypeScript** (strictly typed with TSX components), and bundled using **Vite**.

---

## Component Architecture

```
frontend/
├── Dockerfile                   # Multi-stage container: Vite builder -> Nginx Alpine
├── nginx.conf                   # Reverse proxy configuration (/api -> backend:3000)
├── .dockerignore                # Excludes node_modules and dist artifacts
├── package.json                 # Frontend dependencies (React 18, Vite, Lucide React)
├── tsconfig.json                # Strict React DOM TypeScript configuration
├── vite.config.ts               # Vite configuration with /api reverse proxy
├── index.html                   # HTML5 entry point
├── README.md                    # Frontend documentation
└── src/
    ├── App.tsx                  # Root state coordinator (loads documents, health status, modal)
    ├── main.tsx                 # React 18 DOM mount
    ├── index.css                # Healthcare design system tokens, typography, and reset
    ├── App.css                  # Responsive grid, glassmorphism cards, and animation styles
    ├── components/
    │   ├── Header.tsx           # Hospital title, live system connectivity badge, clock
    │   ├── FlowBanner.tsx       # Visual pipeline flow (Upload -> Gemini -> Rules -> DB)
    │   ├── UploadCard.tsx       # Drag-and-drop PDF upload with sample document quick-loader
    │   ├── DocumentsTable.tsx   # Clinical documents data grid with filtering & retry action
    │   ├── StatusBadge.tsx      # Semantic badge (Success, Needs Review, Failed)
    │   └── AuditModal.tsx       # Deep-dive modal with confidence breakdown & raw JSON
    └── services/
        └── api.ts               # Fully-typed API client for /api/documents and /api/health
```

---

## Core Features

### 1. Real-Time Document Ingestion
- Upload clinical PDFs (both selectable text and scanned image PDFs) directly via drag-and-drop.
- Built-in **Quick Test Samples**: One-click ingestion of pre-configured clinical test documents (`bp_adult_valid.pdf`, `bp_under18_pediatric.pdf`, `hba1c_diabetes.pdf`, `scanned_image_sample.pdf`, etc.).

### 2. Clinical Measure Inspection & Audit
- View evaluated clinical measure values (e.g. `138/88 mmHg` or `7.4%`).
- View chronological encounter dates and patient age.
- Interactive **Audit Modal** inspecting the composite confidence breakdown:
  - **AI Model Certainty** (30% weight)
  - **Format Validation** (25% weight)
  - **Encounter Date Certainty** (20% weight)
  - **Clinical Rules Validation** (25% weight)
  - **Clinical Reasoning**: Clear explanation of rule application (e.g., adult systolic range, lowest HbA1c selection, goal exclusion).

### 3. Pipeline Retry Trigger
- Click the **Retry** button on any document to re-run the extraction and rules engine pipeline, incrementing the retry counter in PostgreSQL.

---

## Development & Local Execution

### Run Standalone Vite Dev Server
```bash
# Start frontend dev server on port 5173 (proxies /api to localhost:3000)
npm run dev

# Run TypeScript type-check
npm run type-check

# Compile production bundle into dist/
npm run build

# Preview production build locally
npm run preview
```

---

## Docker Execution

```bash
# Build standalone frontend container
docker build -t clinicworks-frontend .

# Run container on port 80 (communicates with backend service)
docker run -p 80:80 clinicworks-frontend
```
