# ClinicWorks - Clinical Document Processing Platform

An enterprise-grade, lightweight clinical document processing platform built using **Node.js, TypeScript, Google Gemini Multimodal AI, PostgreSQL, Azure Functions, and Azure Logic Apps**.

ClinicWorks automatically ingests clinical documents (both digital selectable PDFs and scanned image PDFs), classifies the clinical quality measure (**Blood Pressure** or **HbA1c**), extracts validated clinical values, applies deterministic clinical business rules, computes a multi-factor confidence score, and stores the results in PostgreSQL for real-time monitoring on a web dashboard with one-click **Retry** functionality.

---

## Architecture Overview

```
[ Clinical Document (PDF / Scanned Image) ]
                   │
                   ▼
       [ Azure Web App Dashboard ]
                   │ (HTTP / Upload)
                   ▼
       [ Azure Logic App Orchestrator ]
                   │
                   ▼
       [ Azure Functions Core Processing Engine ]
         ├── Ingestion & PDF Multimodal Parser
         ├── Google Gemini Multimodal AI Service
         ├── Centralized Clinical Business Rules Engine
         │     ├── BP Rules (Age < 18 filter, Most Recent / Lowest Sum tie-breaker, Target filter)
         │     └── HbA1c Rules (Lowest value selection, >5.7 Prediabetes, >5.9 Diabetes)
         └── Algorithmic Confidence Scorer (0 - 100%)
                   │
                   ▼
       [ PostgreSQL Database (Azure / Local) ]
                   │
                   ▼
       [ Real-Time Web Dashboard (Status, Values, Confidence, Retry) ]
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

### 3. Processing Outcomes
- **`Success`**: Document successfully classified and valid clinical measure extracted.
- **`Needs Review`**: Document understood, but clinical criteria not met (e.g., age $< 18$, ambiguous readings).
- **`Failed`**: Technical/system error (corrupt file, processing error). Eligible for **Retry**.

