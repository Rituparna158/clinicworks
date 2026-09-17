import type {
  ClinicalRuleEvaluationResult,
  ConfidenceBreakdown,
} from '../types/clinical.types.js';
import type { RawExtractionOutput } from '../types/extraction.types.js';
import { evaluateBpRules } from './bpRulesEngine.js';
import { evaluateHbA1cRules } from './hba1cRulesEngine.js';

export function evaluateClinicalDocument(
  rawExtraction: RawExtractionOutput
): ClinicalRuleEvaluationResult {
  const { detectedType, patient, bpReadings, hba1cReadings, modelConfidenceEstimate } = rawExtraction;

  if (detectedType === 'BP') {
    return evaluateBpRules({
      readings: bpReadings,
      patient,
      modelConfidenceEstimate,
    });
  }

  if (detectedType === 'A1C') {
    return evaluateHbA1cRules({
      readings: hba1cReadings,
      patient,
      modelConfidenceEstimate,
    });
  }

  const emptyConfidence: ConfidenceBreakdown = {
    modelCertainty: modelConfidenceEstimate,
    formatValidation: 0,
    dateCertainty: 0,
    rulesValidation: 0,
    compositeScore: Math.round(modelConfidenceEstimate * 0.2),
    reasoning: [
      `Document could not be classified as either Blood Pressure or HbA1c (detected: ${detectedType}).`,
    ],
  };

  return {
    status: 'Needs Review',
    documentType: 'UNKNOWN',
    measureExtracted: null,
    measureDate: null,
    patientAge: patient.age,
    errorMessage: 'Document does not contain recognizable Blood Pressure or HbA1c quality measures.',
    confidence: emptyConfidence,
  };
}

export * from './bpRulesEngine.js';
export * from './hba1cRulesEngine.js';
