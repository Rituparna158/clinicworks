# ClinicWorks Backend Service (`@clinicworks/backend`)

The core processing engine of the **ClinicWorks Clinical Document Processing Platform**. It implements the REST API endpoints, Azure Function HTTP controllers, multimodal Gemini AI extraction pipeline, deterministic clinical business rules, and PostgreSQL persistence repository.

---

## Architecture & Directory Structure

```
backend/
├── Dockerfile                   # Multi-stage production container (Node 20 Alpine)
├── .dockerignore                # Excludes node_modules, tests, and build artifacts
├── package.json                 # Backend dependencies (Express, Gemini, PG, PDF-Lib)
├── tsconfig.json                # Strict NodeNext TypeScript configuration
├── README.md                    # Backend technical documentation
├── src/
│   ├── database/
│   │   ├── connection.ts        # PostgreSQL connection pool with Azure SSL
│   │   ├── documentRepository.ts# Repository pattern with in-memory fallback
│   │   └── index.ts             # Barrel export for database operations
│   ├── functions/
│   │   ├── healthCheck.ts       # GET /api/health (DB connectivity & uptime)
│   │   ├── listDocuments.ts     # GET /api/documents (Filtering & pagination)
│   │   ├── processDocument.ts   # POST /api/documents/process (AI extraction)
│   │   ├── retryDocument.ts     # POST /api/documents/:id/retry (Re-run pipeline)
│   │   └── index.ts             # Azure Function HTTP controller exports
│   ├── rules/
│   │   ├── bpRulesEngine.ts     # Blood pressure evaluation rules
│   │   ├── hba1cRulesEngine.ts  # Glycated hemoglobin evaluation rules
│   │   ├── clinicalRulesEngine.ts# Unified clinical rules orchestrator
│   │   └── index.ts             # Rules engine exports
│   ├── services/
│   │   ├── geminiService.ts     # Multimodal Gemini extraction & fallback
│   │   ├── documentProcessingService.ts # End-to-end document processor
│   │   └── index.ts             # Services exports
│   ├── types/
│   │   ├── clinical.types.ts    # Clinical evaluation domain models
│   │   ├── database.types.ts    # PostgreSQL database schemas
│   │   ├── document.types.ts    # Document domain models
│   │   ├── extraction.types.ts  # AI extraction schema
│   │   └── index.ts             # Type exports
│   ├── utils/
│   │   └── generateSampleDocs.ts# Synthetic clinical PDF generator
│   └── server.ts                # Express server mounting API & static dashboard
└── tests/
    ├── api.test.ts              # API controller & repository integration tests
    ├── bpRules.test.ts          # Blood pressure unit tests (10 test cases)
    ├── clinicalRulesEngine.test.ts # Unified orchestrator tests (5 test cases)
    ├── documentRepository.test.ts  # Repository persistence tests (4 test cases)
    ├── geminiService.test.ts    # Multimodal AI parser tests (4 test cases)
    └── hba1cRules.test.ts       # HbA1c unit tests (7 test cases)
```

---

## API Endpoints & Azure Function Triggers

| Method | Endpoint | Description | Request Body / Params |
|---|---|---|---|
| `GET` | `/api/health` | Service health & database connectivity | None |
| `GET` | `/api/documents` | List processed clinical documents | `?status=Success&type=BP` (optional query) |
| `POST` | `/api/documents/process` | Ingest and process a clinical PDF | `multipart/form-data`: `document` (PDF file), `submittedBy` (string) |
| `POST` | `/api/documents/:id/retry` | Re-run AI extraction pipeline on document | URL param: `id` |

---

## Clinical Business Rules

### 1. Blood Pressure Rules (`bpRulesEngine.ts`)
- **Format**: Requires `Systolic / Diastolic` in mmHg (e.g., `138/88`).
- **Normal Range**: Systolic $< 120$ AND Diastolic $< 80$.
- **Elevated Range**: Systolic $120\text{--}129$ AND Diastolic $< 80$.
- **Hypertension Stage 1**: Systolic $130\text{--}139$ OR Diastolic $80\text{--}89$.
- **Hypertension Stage 2**: Systolic $\ge 140$ OR Diastolic $\ge 90$.
- **Hypertensive Crisis**: Systolic $> 180$ OR Diastolic $> 120$ $\to$ Status: `Needs Review`.
- **Pediatric Constraint**: Patients under 18 years old are flagged with `Needs Review`.
- **Target/Goal Exclusion**: Goal/target notations (e.g., `Goal < 120/80`) are ignored in favor of measured vitals.
- **Multiple Encounters**: When multiple readings exist, the most recent chronological encounter is selected.

### 2. HbA1c Glycemic Rules (`hba1cRulesEngine.ts`)
- **Format**: Requires percentage value (e.g., `7.4%`).
- **Normal**: $< 5.7\%$.
- **Prediabetes**: $> 5.7\%$ and $\le 5.9\%$ (or $< 6.5\%$).
- **Diabetes**: $> 5.9\%$ (e.g. $7.4\%$).
- **Multiple Values Constraint**: When multiple test values are reported without timestamps, evaluate the lowest clinical value.

---

## Multimodal Gemini AI Pipeline (`geminiService.ts`)

- Accepts clinical documents as raw PDF bytes (both selectable text and scanned image PDFs).
- Passes the base64-encoded PDF to `gemini-1.5-flash` using `application/pdf` inline data.
- Enforces strict JSON schema extraction (`documentType`, `measureExtracted`, `measureDate`, `patientAge`, etc.).
- Computes composite confidence score across 4 weighted vectors:
  $$\text{Composite Score} = (0.30 \times \text{Model}) + (0.25 \times \text{Format}) + (0.20 \times \text{Date}) + (0.25 \times \text{Rules})$$
- Resilient fallback engine ensures offline and test reliability even if API quota is reached or network is unavailable.

---

## Development & Testing

```bash
# Run unit & integration tests (26 passing tests)
npm test

# Run tests in watch mode
npm run test:watch

# Start development server with hot-reloading
npm run dev

# Compile TypeScript to dist/
npm run build

# Generate synthetic test clinical PDFs into sample-docs/
npm run generate:docs
```

---

## Docker Execution

```bash
# Build standalone backend image
docker build -t clinicworks-backend .

# Run standalone container
docker run -p 3000:3000 --env-file ../.env clinicworks-backend
```
