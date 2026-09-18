import type { Request, Response } from 'express';
import { listDocuments } from '../database/documentRepository.js';
import type { DocumentType, ProcessingStatus } from '../types/clinical.types.js';
import type { ApiResponse, ClinicalDocumentDTO, DocumentQueryFilter } from '../types/document.types.js';

/**
 * Backend Controller / Azure Function Handler for listing processed documents.
 * Endpoint: GET /api/documents
 */
export async function handleListDocuments(req: Request, res: Response): Promise<void> {
  try {
    const statusQuery = req.query['status'];
    const typeQuery = req.query['type'];

    const filter: DocumentQueryFilter = {};
    if (statusQuery === 'Success' || statusQuery === 'Needs Review' || statusQuery === 'Failed') {
      (filter as { status: ProcessingStatus }).status = statusQuery;
    }
    if (typeQuery === 'BP' || typeQuery === 'A1C' || typeQuery === 'UNKNOWN') {
      (filter as { documentType: DocumentType }).documentType = typeQuery;
    }

    const rows = await listDocuments(filter);

    const data: ClinicalDocumentDTO[] = rows.map((r) => {
      const rawObj = typeof r.raw_extracted_json === 'object' && r.raw_extracted_json !== null
        ? (r.raw_extracted_json as Record<string, unknown>)
        : undefined;

      return {
        documentId: r.document_id,
        fileName: r.file_name,
        fileType: r.file_type,
        documentType: r.document_type,
        measureExtracted: r.measure_extracted,
        measureDate: r.measure_date,
        dateProcessed: r.date_processed.toISOString(),
        processedBy: r.processed_by,
        processingStatus: r.processing_status,
        confidenceScore: typeof r.confidence_score === 'number'
          ? r.confidence_score
          : Number(r.confidence_score),
        errorMessage: r.error_message,
        patientAge: r.patient_age,
        fileUrl: r.file_url ?? (r.blob_name ? `/api/documents/${r.document_id}/file` : null),
        blobName: r.blob_name ?? null,
        retryCount: r.retry_count,
        rawAuditJson: rawObj,
      };
    });

    const response: ApiResponse<ClinicalDocumentDTO[]> = {
      success: true,
      data,
      message: `Retrieved ${data.length} clinical documents.`,
    };

    res.status(200).json(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[ListDocumentsHandler] Error listing documents:', message);
    const response: ApiResponse<null> = {
      success: false,
      error: `Failed to retrieve documents: ${message}`,
    };
    res.status(500).json(response);
  }
}
