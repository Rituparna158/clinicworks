import { describe, expect, it } from 'vitest';
import { evaluateBpRules } from '../src/rules/bpRulesEngine.js';
import type { BloodPressureReading } from '../src/types/clinical.types.js';

describe('BP Clinical Business Rules Engine', () => {
  it('extracts valid BP reading for an adult patient', () => {
    const readings: BloodPressureReading[] = [
      {
        systolic: 138,
        diastolic: 88,
        unit: 'mmHg',
        date: '2026-08-12',
        isGoalOrTarget: false,
      },
    ];

    const result = evaluateBpRules({
      readings,
      patient: { age: 45, name: 'John Doe' },
    });

    expect(result.status).toBe('Success');
    expect(result.documentType).toBe('BP');
    expect(result.measureExtracted).toBe('138/88');
    expect(result.measureDate).toBe('2026-08-12');
    expect(result.errorMessage).toBeNull();
    expect(result.confidence.compositeScore).toBeGreaterThanOrEqual(80);
  });

  it('rejects BP result when patient age is under 18 (Pediatric rule)', () => {
    const readings: BloodPressureReading[] = [
      {
        systolic: 120,
        diastolic: 78,
        unit: 'mmHg',
        date: '2026-08-15',
        isGoalOrTarget: false,
      },
    ];

    const result = evaluateBpRules({
      readings,
      patient: { age: 16, name: 'Minor Patient' },
    });

    expect(result.status).toBe('Needs Review');
    expect(result.documentType).toBe('BP');
    expect(result.measureExtracted).toBeNull();
    expect(result.errorMessage).toContain('under 18 years of age');
  });

  it('filters out goal and target BP, returning only actual measured reading', () => {
    const readings: BloodPressureReading[] = [
      {
        systolic: 120,
        diastolic: 80,
        unit: 'mmHg',
        date: null,
        isGoalOrTarget: true, // "Goal BP: <120/80"
      },
      {
        systolic: 142,
        diastolic: 92,
        unit: 'mmHg',
        date: '2026-08-10',
        isGoalOrTarget: false, // Actual reading
      },
    ];

    const result = evaluateBpRules({
      readings,
      patient: { age: 52 },
    });

    expect(result.status).toBe('Success');
    expect(result.measureExtracted).toBe('142/92');
    expect(result.measureDate).toBe('2026-08-10');
  });

  it('returns the most recent reading when multiple dated readings exist', () => {
    const readings: BloodPressureReading[] = [
      {
        systolic: 140,
        diastolic: 90,
        unit: 'mmHg',
        date: '2026-05-10',
        isGoalOrTarget: false,
      },
      {
        systolic: 136,
        diastolic: 84,
        unit: 'mmHg',
        date: '2026-08-15', // Most recent date
        isGoalOrTarget: false,
      },
      {
        systolic: 130,
        diastolic: 82,
        unit: 'mmHg',
        date: '2026-07-01',
        isGoalOrTarget: false,
      },
    ];

    const result = evaluateBpRules({
      readings,
      patient: { age: 60 },
    });

    expect(result.status).toBe('Success');
    expect(result.measureExtracted).toBe('136/84');
    expect(result.measureDate).toBe('2026-08-15');
  });

  it('tie-breaker: returns lowest BP based on (systolic + diastolic) sum when undated', () => {
    const readings: BloodPressureReading[] = [
      {
        systolic: 140,
        diastolic: 90, // Sum = 230
        unit: 'mmHg',
        date: null,
        isGoalOrTarget: false,
      },
      {
        systolic: 130,
        diastolic: 85, // Sum = 215 (Lowest!)
        unit: 'mmHg',
        date: null,
        isGoalOrTarget: false,
      },
      {
        systolic: 135,
        diastolic: 88, // Sum = 223
        unit: 'mmHg',
        date: null,
        isGoalOrTarget: false,
      },
    ];

    const result = evaluateBpRules({
      readings,
      patient: { age: 39 },
    });

    expect(result.status).toBe('Success');
    expect(result.measureExtracted).toBe('130/85');
    expect(result.confidence.reasoning.some((r) => r.includes('lowest BP'))).toBe(true);
  });

  it('returns Needs Review when no valid readings exist', () => {
    const result = evaluateBpRules({
      readings: [],
      patient: { age: 30 },
    });

    expect(result.status).toBe('Needs Review');
    expect(result.measureExtracted).toBeNull();
  });
});
