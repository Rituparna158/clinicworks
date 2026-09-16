import type { ConfidenceBreakdown, DocumentType, ProcessingStatus } from './clinical.types.js';

/**
 * Domain model of a processed clinical document used in API responses and frontend dashboard.
 */
export interface ClinicalDocumentDTO {
  readonly documentId: string;
  readonly fileName: string;
  readonly fileType: string;
  readonly documentType: DocumentType;
  readonly measureExtracted: string | null;
  readonly measureDate: string | null;
  readonly dateProcessed: string; // ISO 8601 string
  readonly processedBy: string;
  readonly processingStatus: ProcessingStatus;
  readonly confidenceScore: number | null;
  readonly errorMessage: string | null;
  readonly patientAge: number | null;
  readonly retryCount: number;
  readonly confidenceBreakdown?: ConfidenceBreakdown;
  readonly rawAuditJson?: Record<string, unknown>;
}

/**
 * Standard API response envelope.
 */
export interface ApiResponse<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly message?: string;
  readonly error?: string;
}

/**
 * Query parameters for fetching the document list on the dashboard.
 */
export interface DocumentQueryFilter {
  readonly status?: ProcessingStatus;
  readonly documentType?: DocumentType;
  readonly search?: string;
  readonly page?: number;
  readonly limit?: number;
}
