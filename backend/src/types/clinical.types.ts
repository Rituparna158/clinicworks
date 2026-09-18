export type DocumentType = 'BP' | 'A1C' | 'UNKNOWN';

export type ProcessingStatus = 'Success' | 'Needs Review' | 'Failed';

export type HbA1cClassification = 'Prediabetes' | 'Diabetes' | 'Normal';

export interface BloodPressureReading {
  readonly systolic: number;
  readonly diastolic: number;
  readonly unit: string;
  readonly date: string | null;
  readonly isGoalOrTarget: boolean;
  readonly rawSnippet?: string | undefined;
}

export interface HbA1cReading {
  readonly value: number;
  readonly unit: string;
  readonly date: string | null;
  readonly isGoalOrTarget: boolean;
  readonly classification?: HbA1cClassification | undefined;
  readonly rawSnippet?: string | undefined;
}

export interface PatientInfo {
  readonly age: number | null;
  readonly name?: string | null | undefined;
  readonly dateOfBirth?: string | null | undefined;
}

export interface ConfidenceBreakdown {
  readonly modelCertainty: number;     // 0 - 100
  readonly formatValidation: number;   // 0 - 100
  readonly dateCertainty: number;       // 0 - 100
  readonly rulesValidation: number;     // 0 - 100
  readonly compositeScore: number;      // Weighted 0 - 100
  readonly reasoning: readonly string[];
}
export interface ClinicalRuleEvaluationResult {
  readonly status: ProcessingStatus;
  readonly documentType: DocumentType;
  readonly measureExtracted: string | null;
  readonly measureDate: string | null;
  readonly confidence: ConfidenceBreakdown;
  readonly errorMessage: string | null;
  readonly patientAge: number | null;
}
