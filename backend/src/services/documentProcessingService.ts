import { saveDocument } from '../database/documentRepository.js';
import { evaluateClinicalDocument } from '../rules/clinicalRulesEngine.js';
import type { ClinicalDocumentDbRow } from '../types/database.types.js';
import type { ClinicalDocumentDTO } from '../types/document.types.js';
import type { DocumentProcessingInput } from '../types/extraction.types.js';
import { extractClinicalData } from './geminiService.js';

export async function processClinicalDocument(
  input: DocumentProcessingInput
): Promise<ClinicalDocumentDTO> {
  const { documentId, fileName, submittedBy } = input;

  // Determine file type (PDF, SCANNED_PDF, or IMAGE)
  let fileType: 'PDF' | 'SCANNED_PDF' | 'IMAGE' = 'PDF';
  const lower = fileName.toLowerCase();
  if (input.mimeType.startsWith('image/') || lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
    fileType = 'IMAGE';
  } else if (lower.includes('scanned')) {
    fileType = 'SCANNED_PDF';
  }

  try {
    // Step 1: Gemini AI Multimodal Extraction
    const rawExtraction = await extractClinicalData(input);

    // Step 2: Clinical Business Rules & Confidence Evaluation
    const evaluation = evaluateClinicalDocument(rawExtraction);

    // Step 3: Map to PostgreSQL DB Row
    const dbRow: ClinicalDocumentDbRow = {
      document_id: documentId,
      file_name: fileName,
      file_type: fileType,
      document_type: evaluation.documentType,
      measure_extracted: evaluation.measureExtracted,
      measure_date: evaluation.measureDate,
      date_processed: new Date(),
      processed_by: submittedBy,
      processing_status: evaluation.status,
      confidence_score: evaluation.confidence.compositeScore,
      error_message: evaluation.errorMessage,
      patient_age: evaluation.patientAge,
      raw_extracted_json: {
        rawExtraction,
        confidenceBreakdown: evaluation.confidence,
      },
      retry_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
    };

    // Step 4: Persist in PostgreSQL
    const saved = await saveDocument(dbRow);

    return {
      documentId: saved.document_id,
      fileName: saved.file_name,
      fileType: saved.file_type,
      documentType: saved.document_type,
      measureExtracted: saved.measure_extracted,
      measureDate: saved.measure_date,
      dateProcessed: saved.date_processed.toISOString(),
      processedBy: saved.processed_by,
      processingStatus: saved.processing_status,
      confidenceScore: typeof saved.confidence_score === 'number'
        ? saved.confidence_score
        : Number(saved.confidence_score),
      errorMessage: saved.error_message,
      patientAge: saved.patient_age,
      retryCount: saved.retry_count,
      confidenceBreakdown: evaluation.confidence,
      rawAuditJson: typeof saved.raw_extracted_json === 'object' && saved.raw_extracted_json !== null
        ? (saved.raw_extracted_json as Record<string, unknown>)
        : undefined,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[ProcessingService] Error processing document ${documentId}:`, errorMsg);

    const failedRow: ClinicalDocumentDbRow = {
      document_id: documentId,
      file_name: fileName,
      file_type: fileType,
      document_type: 'UNKNOWN',
      measure_extracted: null,
      measure_date: null,
      date_processed: new Date(),
      processed_by: submittedBy,
      processing_status: 'Failed',
      confidence_score: 0.0,
      error_message: `Technical processing failure: ${errorMsg}`,
      patient_age: null,
      raw_extracted_json: { error: errorMsg },
      retry_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const saved = await saveDocument(failedRow);

    return {
      documentId: saved.document_id,
      fileName: saved.file_name,
      fileType: saved.file_type,
      documentType: saved.document_type,
      measureExtracted: null,
      measureDate: null,
      dateProcessed: saved.date_processed.toISOString(),
      processedBy: saved.processed_by,
      processingStatus: 'Failed',
      confidenceScore: 0.0,
      errorMessage: saved.error_message,
      patientAge: null,
      retryCount: saved.retry_count,
    };
  }
}


export async function retryClinicalDocument(
  documentId: string,
  fileBuffer: Buffer,
  fileName: string,
  submittedBy: string
): Promise<ClinicalDocumentDTO> {
  const result = await processClinicalDocument({
    documentId,
    fileName,
    fileBuffer,
    mimeType: 'application/pdf',
    submittedBy,
  });

  return result;
}
