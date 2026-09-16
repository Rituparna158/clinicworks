/**
 * Clinical domain types for ClinicWorks Document Processing Engine.
 * Strict typing enforced - no 'any' permitted.
 */

export type DocumentType = 'BP' | 'A1C' | 'UNKNOWN';

export type ProcessingStatus = 'Success' | 'Needs Review' | 'Failed';

export type HbA1cClassification = 'Prediabetes' | 'Diabetes' | 'Normal';

/**
 * Represents a single blood pressure measurement extracted from a clinical document.
 */
export interface BloodPressureReading {
  readonly systolic: number;
  readonly diastolic: number;
  readonly unit: string;
  readonly date: string | null;
  readonly isGoalOrTarget: boolean;
  readonly rawSnippet?: string;
}

/**
 * Represents a single Hemoglobin A1c measurement extracted from a clinical document.
 */
export interface HbA1cReading {
  readonly value: number;
  readonly unit: string;
  readonly date: string | null;
  readonly isGoalOrTarget: boolean;
  readonly classification?: HbA1cClassification;
  readonly rawSnippet?: string;
}

/**
 * Patient demographic details relevant to clinical rule evaluation.
 */
export interface PatientInfo {
  readonly age: number | null;
  readonly name?: string | null;
  readonly dateOfBirth?: string | null;
}

/**
 * Transparent scoring breakdown evaluating model response, formats, dates, and rule compliance.
 */
export interface ConfidenceBreakdown {
  readonly modelCertainty: number;     // 0 - 100
  readonly formatValidation: number;   // 0 - 100
  readonly dateCertainty: number;       // 0 - 100
  readonly rulesValidation: number;     // 0 - 100
  readonly compositeScore: number;      // Weighted 0 - 100
  readonly reasoning: readonly string[];
}

/**
 * Output of the Clinical Business Rules Engine after evaluating extracted readings.
 */
export interface ClinicalRuleEvaluationResult {
  readonly status: ProcessingStatus;
  readonly documentType: DocumentType;
  readonly measureExtracted: string | null;
  readonly measureDate: string | null;
  readonly confidence: ConfidenceBreakdown;
  readonly errorMessage: string | null;
  readonly patientAge: number | null;
}
