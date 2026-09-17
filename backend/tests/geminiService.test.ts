import { beforeEach, describe, expect, it } from 'vitest';
import { clearInMemoryStore, getDocumentById } from '../src/database/documentRepository.js';
import { processClinicalDocument } from '../src/services/documentProcessingService.js';
import { fallbackClinicalExtractor } from '../src/services/geminiService.js';

describe('Gemini AI Extraction & Document Pipeline Service', () => {
  beforeEach(() => {
    clearInMemoryStore();
  });

  it('correctly extracts adult BP from clinical text via heuristic parser', () => {
    const clinicalText = `
      Patient Name: John Doe
      Patient Age: 54
      Encounter Date: 2026-08-12
      Vitals:
        Heart Rate: 72 bpm
        Blood Pressure: 138/88 mmHg
    `;
    const buffer = Buffer.from(clinicalText, 'utf-8');
    const result = fallbackClinicalExtractor(buffer, 'patient_vitals.txt');

    expect(result.detectedType).toBe('BP');
    expect(result.patient.age).toBe(54);
    expect(result.bpReadings.length).toBeGreaterThan(0);
    expect(result.bpReadings[0]?.systolic).toBe(138);
    expect(result.bpReadings[0]?.diastolic).toBe(88);
  });

  it('correctly extracts HbA1c from clinical text via heuristic parser', () => {
    const clinicalText = `
      Patient Name: Sarah Connor
      Patient Age: 61
      Laboratory Panel:
        Fasting Glucose: 140 mg/dL
        Hemoglobin A1c: 7.4%
      Reference Range: < 5.7%
    `;
    const buffer = Buffer.from(clinicalText, 'utf-8');
    const result = fallbackClinicalExtractor(buffer, 'lab_report.txt');

    expect(result.detectedType).toBe('A1C');
    expect(result.hba1cReadings.length).toBeGreaterThan(0);
    const validReading = result.hba1cReadings.find((r) => !r.isGoalOrTarget);
    expect(validReading?.value).toBe(7.4);
  });

  it('processes clinical document end-to-end and persists in database', async () => {
    const clinicalText = `
      Patient Age: 49
      Physical Exam
      Blood Pressure: 138/88 mmHg
      Date: 2026-08-12
    `;
    const buffer = Buffer.from(clinicalText, 'utf-8');

    const result = await processClinicalDocument({
      documentId: 'DOC-PIPELINE-001',
      fileName: 'adult_bp_138_88.pdf',
      fileBuffer: buffer,
      mimeType: 'application/pdf',
      submittedBy: 'ClinicianUser',
    });

    expect(result.documentId).toBe('DOC-PIPELINE-001');
    expect(result.documentType).toBe('BP');
    expect(result.measureExtracted).toBe('138/88');
    expect(result.processingStatus).toBe('Success');
    expect(result.confidenceScore).toBeGreaterThanOrEqual(80);

    // Verify it was saved in the database
    const saved = await getDocumentById('DOC-PIPELINE-001');
    expect(saved).not.toBeNull();
    expect(saved?.measure_extracted).toBe('138/88');
  });

  it('handles pediatric patient (<18) by setting status to Needs Review in pipeline', async () => {
    const clinicalText = `
      Patient Age: 15
      Pediatric Sports Physical
      Blood Pressure: 118/76 mmHg
      Date: 2026-08-15
    `;
    const buffer = Buffer.from(clinicalText, 'utf-8');

    const result = await processClinicalDocument({
      documentId: 'DOC-PIPELINE-PEDIATRIC',
      fileName: 'pediatric_15yo.pdf',
      fileBuffer: buffer,
      mimeType: 'application/pdf',
      submittedBy: 'PediatricClinic',
    });

    expect(result.documentId).toBe('DOC-PIPELINE-PEDIATRIC');
    expect(result.processingStatus).toBe('Needs Review');
    expect(result.measureExtracted).toBeNull();
    expect(result.errorMessage).toContain('under 18 years of age');
  });
});
