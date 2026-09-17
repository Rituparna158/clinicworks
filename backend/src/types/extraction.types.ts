import type { BloodPressureReading, DocumentType, HbA1cReading, PatientInfo } from './clinical.types.js';

/**
 * Structured extraction payload returned by Google Gemini / document parser.
 * Guarantees zero 'any' types in the AI layer.
 */
export interface RawExtractionOutput {
  readonly detectedType: DocumentType;
  readonly patient: PatientInfo;
  readonly bpReadings: readonly BloodPressureReading[];
  readonly hba1cReadings: readonly HbA1cReading[];
  readonly summaryNotes: string;
  readonly modelConfidenceEstimate: number; // 0 - 100
}

/**
 * Input to the document ingestion and extraction pipeline.
 */
export interface DocumentProcessingInput {
  readonly documentId: string;
  readonly fileName: string;
  readonly fileBuffer: Buffer;
  readonly mimeType: string;
  readonly submittedBy: string;
}
