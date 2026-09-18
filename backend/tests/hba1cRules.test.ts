import { describe, expect, it } from 'vitest';
import { evaluateHbA1cRules } from '../src/rules/hba1cRulesEngine.js';
import type { HbA1cReading } from '../src/types/clinical.types.js';

describe('HbA1c Clinical Business Rules Engine', () => {
  it('extracts and classifies HbA1c > 5.9 as Diabetes', () => {
    const readings: HbA1cReading[] = [
      {
        value: 7.4,
        unit: '%',
        date: '2026-07-30',
        isGoalOrTarget: false,
      },
    ];

    const result = evaluateHbA1cRules({
      readings,
      patient: { age: 50 },
    });

    expect(result.status).toBe('Success');
    expect(result.documentType).toBe('A1C');
    expect(result.measureExtracted).toBe('7.4% (Diabetes)');
    expect(result.measureDate).toBe('2026-07-30');
    expect(result.errorMessage).toBeNull();
  });

  it('extracts and classifies HbA1c between 5.8 and 5.9 as Prediabetes', () => {
    const readings: HbA1cReading[] = [
      {
        value: 5.8,
        unit: '%',
        date: '2026-08-01',
        isGoalOrTarget: false,
      },
    ];

    const result = evaluateHbA1cRules({
      readings,
      patient: { age: 40 },
    });

    expect(result.status).toBe('Success');
    expect(result.measureExtracted).toBe('5.8% (Prediabetes)');
  });

  it('extracts normal HbA1c <= 5.7 without Diabetes/Prediabetes classification', () => {
    const readings: HbA1cReading[] = [
      {
        value: 5.4,
        unit: '%',
        date: '2026-06-12',
        isGoalOrTarget: false,
      },
    ];

    const result = evaluateHbA1cRules({
      readings,
      patient: { age: 33 },
    });

    expect(result.status).toBe('Success');
    expect(result.measureExtracted).toBe('5.4%');
  });

  it('returns the lowest value when multiple valid HbA1c values exist', () => {
    const readings: HbA1cReading[] = [
      {
        value: 8.2,
        unit: '%',
        date: '2026-08-01',
        isGoalOrTarget: false,
      },
      {
        value: 6.9, // Lowest
        unit: '%',
        date: '2026-05-15',
        isGoalOrTarget: false,
      },
      {
        value: 7.5,
        unit: '%',
        date: '2026-07-20',
        isGoalOrTarget: false,
      },
    ];

    const result = evaluateHbA1cRules({
      readings,
      patient: { age: 62 },
    });

    expect(result.status).toBe('Success');
    expect(result.measureExtracted).toBe('6.9% (Diabetes)');
    expect(result.confidence.reasoning.some((r) => r.includes('Selected lowest value: 6.9%'))).toBe(true);
  });

  it('filters out reference ranges and goals, keeping measured value', () => {
    const readings: HbA1cReading[] = [
      {
        value: 5.7,
        unit: '%',
        date: null,
        isGoalOrTarget: true, // "Reference range: < 5.7%"
      },
      {
        value: 6.5,
        unit: '%',
        date: '2026-08-10',
        isGoalOrTarget: false, // Actual patient measurement
      },
    ];

    const result = evaluateHbA1cRules({
      readings,
      patient: { age: 58 },
    });

    expect(result.status).toBe('Success');
    expect(result.measureExtracted).toBe('6.5% (Diabetes)');
    expect(result.measureDate).toBe('2026-08-10');
  });

  it('returns Needs Review when all readings are goals or invalid', () => {
    const readings: HbA1cReading[] = [
      {
        value: 5.7,
        unit: '%',
        date: null,
        isGoalOrTarget: true,
      },
    ];

    const result = evaluateHbA1cRules({
      readings,
      patient: { age: 40 },
    });

    expect(result.status).toBe('Needs Review');
    expect(result.measureExtracted).toBeNull();
  });
});
