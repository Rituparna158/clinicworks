import { describe, expect, it } from 'vitest';
import { evaluateClinicalDocument } from '../src/rules/clinicalRulesEngine.js';
import type { RawExtractionOutput } from '../src/types/extraction.types.js';

describe('Unified Clinical Rules Engine Orchestrator', () => {
  it('correctly processes a valid Blood Pressure extraction', () => {
    const rawExtraction: RawExtractionOutput = {
      detectedType: 'BP',
      patient: { age: 52, name: 'Alice Smith' },
      bpReadings: [
        {
          systolic: 138,
          diastolic: 88,
          unit: 'mmHg',
          date: '2026-08-12',
          isGoalOrTarget: false,
        },
      ],
      hba1cReadings: [],
      summaryNotes: 'Standard clinical BP measurement',
      modelConfidenceEstimate: 95,
    };

    const result = evaluateClinicalDocument(rawExtraction);

    expect(result.status).toBe('Success');
    expect(result.documentType).toBe('BP');
    expect(result.measureExtracted).toBe('138/88');
    expect(result.measureDate).toBe('2026-08-12');
    expect(result.confidence.compositeScore).toBeGreaterThanOrEqual(85);
  });

  it('correctly processes a valid HbA1c extraction with classification', () => {
    const rawExtraction: RawExtractionOutput = {
      detectedType: 'A1C',
      patient: { age: 61 },
      bpReadings: [],
      hba1cReadings: [
        {
          value: 7.4,
          unit: '%',
          date: '2026-07-30',
          isGoalOrTarget: false,
        },
      ],
      summaryNotes: 'Hemoglobin A1c laboratory result',
      modelConfidenceEstimate: 92,
    };

    const result = evaluateClinicalDocument(rawExtraction);

    expect(result.status).toBe('Success');
    expect(result.documentType).toBe('A1C');
    expect(result.measureExtracted).toBe('7.4% (Diabetes)');
    expect(result.measureDate).toBe('2026-07-30');
  });

  it('returns Needs Review for unknown document types', () => {
    const rawExtraction: RawExtractionOutput = {
      detectedType: 'UNKNOWN',
      patient: { age: 30 },
      bpReadings: [],
      hba1cReadings: [],
      summaryNotes: 'Prescription slip with no BP or HbA1c data',
      modelConfidenceEstimate: 30,
    };

    const result = evaluateClinicalDocument(rawExtraction);

    expect(result.status).toBe('Needs Review');
    expect(result.documentType).toBe('UNKNOWN');
    expect(result.measureExtracted).toBeNull();
    expect(result.errorMessage).toContain('does not contain recognizable');
  });
});
