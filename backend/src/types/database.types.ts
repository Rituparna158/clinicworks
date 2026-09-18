import type { DocumentType, ProcessingStatus } from './clinical.types.js';

/**
 * PostgreSQL row schema for the 'clinical_documents' table.
 */
export interface ClinicalDocumentDbRow {
  readonly document_id: string;
  readonly file_name: string;
  readonly file_type: string;
  readonly document_type: DocumentType;
  readonly measure_extracted: string | null;
  readonly measure_date: string | null; // ISO Date or formatted string
  readonly date_processed: Date;
  readonly processed_by: string;
  readonly processing_status: ProcessingStatus;
  readonly confidence_score: string | number | null; // pg driver returns numeric as string or number
  readonly error_message: string | null;
  readonly patient_age: number | null;
  readonly file_url?: string | null;
  readonly blob_name?: string | null;
  readonly raw_extracted_json: string | Record<string, unknown> | null;
  readonly retry_count: number;
  readonly created_at: Date;
  readonly updated_at: Date;
}

/**
 * Database connection pool configuration.
 */
export interface DatabaseConfig {
  readonly host: string;
  readonly port: number;
  readonly database: string;
  readonly user: string;
  readonly password?: string;
  readonly ssl: boolean;
  readonly maxConnections?: number;
}
