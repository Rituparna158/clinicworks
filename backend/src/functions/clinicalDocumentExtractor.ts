import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import {
  claimDocumentForProcessing,
  findDocumentByBlobName,
  getDocumentById,
  saveDocument,
} from '../database/documentRepository.js';
import { blobStorageService } from '../services/blobStorageService.js';
import { processClinicalDocument } from '../services/documentProcessingService.js';
import { sendDocumentAlertNotification } from '../services/notificationService.js';
import type { ClinicalDocumentDTO } from '../types/document.types.js';

interface ExtractionRequestBody {
  documentId?: string;
  blobName?: string;
  fileName?: string;
}

/**
 * Clinical Document Extraction Engine
 * Ingests clinical PDF from Azure Blob Storage, executes Azure Document Intelligence OCR + Gemini AI,
 * evaluates blood pressure & HbA1c threshold rules, records audit trails to PostgreSQL,
 * and sends alert notifications on low confidence or failure.
 */
export async function executeClinicalExtraction(
  documentId: string,
  context?: InvocationContext,
  callerName: string = 'logic-app-orchestrator',
  providedBlobName?: string,
  providedFileName?: string,
  forceReExtract: boolean = false
): Promise<ClinicalDocumentDTO | null> {
  context?.log(`[ClinicalExtractor] Processing initiated by "${callerName}" for Document ID: ${documentId}`);

  // 1. Atomic claim check
  const claimedDoc = await claimDocumentForProcessing(documentId, callerName);
  if (!claimedDoc) {
    context?.log(`[ClinicalExtractor] Document ${documentId} is already claimed or not found. Skipping.`);
    return null;
  }

  context?.log(`[ClinicalExtractor] Lock acquired by "${callerName}" for document "${claimedDoc.file_name}". Processing...`);

  const existingDoc = await getDocumentById(documentId);

  // Fast-path: Check if document was already extracted by upload handler (avoid redundant duplicate LLM call)
  if (
    !forceReExtract &&
    existingDoc &&
    existingDoc.raw_extracted_json &&
    existingDoc.processing_status
  ) {
    context?.log(
      `[ClinicalExtractor] Document ${documentId} already processed with status "${existingDoc.processing_status}". Returning verified record to orchestrator.`
    );
    return {
      documentId: existingDoc.document_id,
      fileName: existingDoc.file_name,
      fileType: existingDoc.file_type as 'PDF' | 'SCANNED_PDF' | 'IMAGE',
      documentType: existingDoc.document_type as 'BP' | 'A1C' | 'UNKNOWN',
      measureExtracted: existingDoc.measure_extracted,
      measureDate: existingDoc.measure_date ? String(existingDoc.measure_date) : null,
      dateProcessed: existingDoc.date_processed.toISOString(),
      processedBy: existingDoc.processed_by,
      processingStatus: existingDoc.processing_status as 'Success' | 'Needs Review' | 'Failed',
      confidenceScore:
        typeof existingDoc.confidence_score === 'number'
          ? existingDoc.confidence_score
          : Number(existingDoc.confidence_score),
      errorMessage: existingDoc.error_message,
      patientAge: existingDoc.patient_age,
      fileUrl:
        existingDoc.file_url ??
        (existingDoc.blob_name && blobStorageService.isConfigured()
          ? `/api/documents/${existingDoc.document_id}/file`
          : null),
      blobName: existingDoc.blob_name,
      retryCount: existingDoc.retry_count,
      confidenceBreakdown: (existingDoc.raw_extracted_json as Record<string, unknown>)?.['confidenceBreakdown'] as any,
      rawAuditJson: existingDoc.raw_extracted_json as Record<string, unknown>,
    };
  }
  const blobName = providedBlobName ?? existingDoc?.blob_name ?? claimedDoc.blob_name;
  const fileName =
    providedFileName ??
    existingDoc?.file_name ??
    claimedDoc.file_name ??
    (blobName ? blobName.split('-').slice(1).join('-') : `${documentId}.pdf`);

  if (!blobName) {
    const errorMsg = `Clinical document ${documentId} does not have an associated blobName in storage.`;
    context?.error(`[ClinicalExtractor] ${errorMsg}`);

    if (existingDoc) {
      await saveDocument({
        ...existingDoc,
        processing_status: 'Failed',
        error_message: errorMsg,
        retry_count: existingDoc.retry_count + 1,
      });
    }

    sendDocumentAlertNotification({
      documentId,
      fileName,
      status: 'Failed',
      errorMessage: errorMsg,
    }).catch((notifErr) => context?.error('[ClinicalExtractor] Failed to send alert notification:', notifErr));

    throw new Error(errorMsg);
  }

  try {
    context?.log(`[ClinicalExtractor] Fetching PDF payload from Azure Blob Storage: ${blobName}`);
    const { buffer, contentType } = await blobStorageService.downloadBlob(blobName);

    context?.log(
      `[ClinicalExtractor] Executing Azure Document Intelligence OCR & Gemini AI extraction for: "${fileName}"`
    );
    const result = await processClinicalDocument({
      documentId,
      fileName,
      fileBuffer: buffer,
      mimeType: contentType,
      submittedBy: callerName,
    });

    context?.log(
      `[ClinicalExtractor] Extraction successful: Type=${result.documentType}, Measure=${result.measureExtracted}, Score=${result.confidenceScore}%, Status=${result.processingStatus}`
    );

    // Send alert notification if clinical review is required
    if (result.processingStatus === 'Needs Review' || result.processingStatus === 'Failed') {
      sendDocumentAlertNotification({
        documentId,
        fileName,
        status: result.processingStatus,
        documentType: result.documentType,
        measure: result.measureExtracted,
        confidenceScore: result.confidenceScore,
        errorMessage: result.errorMessage,
      }).catch((notifErr) => context?.error('[ClinicalExtractor] Failed to send alert notification:', notifErr));
    }

    return result;
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    context?.error(`[ClinicalExtractor] Extraction failure on document ${documentId}:`, errorMessage);

    if (existingDoc) {
      await saveDocument({
        ...existingDoc,
        processing_status: 'Failed',
        error_message: errorMessage,
        retry_count: existingDoc.retry_count + 1,
      });
    }

    sendDocumentAlertNotification({
      documentId,
      fileName,
      status: 'Failed',
      errorMessage,
    }).catch((notifErr) => context?.error('[ClinicalExtractor] Failed to send alert notification:', notifErr));

    throw err;
  }
}

/**
 * Azure Function HTTP Trigger: extractClinicalDocumentHttp
 * Route: /api/extract-clinical-data
 * Invoked by Azure Logic Apps workflow orchestrator with automated retry policy.
 */
app.http('extractClinicalDocumentHttp', {
  methods: ['POST', 'GET'],
  authLevel: 'anonymous',
  route: 'extract-clinical-data',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    let docId: string | undefined;

    try {
      if (request.method === 'GET') {
        return {
          status: 200,
          jsonBody: {
            service: 'ClinicWorks Clinical Document Extraction Function',
            functionName: 'extractClinicalDocumentHttp',
            status: 'online',
            route: '/api/extract-clinical-data',
            timestamp: new Date().toISOString(),
          },
        };
      }

      let body: ExtractionRequestBody = {};
      try {
        body = (await request.json()) as ExtractionRequestBody;
      } catch {
        // Query params fallback
      }

      docId = body.documentId ?? request.query.get('documentId') ?? undefined;
      const blobName = body.blobName ?? request.query.get('blobName') ?? undefined;
      const fileName = body.fileName ?? request.query.get('fileName') ?? undefined;

      // Lookup by blobName if documentId not provided (e.g. from Logic App blob trigger)
      if (!docId && blobName) {
        const foundDoc = await findDocumentByBlobName(blobName);
        docId = foundDoc?.document_id;
      }

      if (!docId && !blobName) {
        return {
          status: 400,
          jsonBody: {
            error: 'Missing required parameter: please supply documentId or blobName in the JSON payload.',
          },
        };
      }

      if (!docId && blobName) {
        docId = `DOC-${Date.now().toString().slice(-6)}`;
      }

      const forceReExtract = Boolean(
        (body as Record<string, unknown>)?.['forceReExtract'] ??
          request.query.get('force') === 'true'
      );

      const result = await executeClinicalExtraction(
        docId!,
        context,
        'logic-app-orchestrator',
        blobName,
        fileName,
        forceReExtract
      );

      if (!result) {
        return {
          status: 200,
          jsonBody: {
            status: 'already_claimed_or_processed',
            message: `Document ${docId} is already claimed or processed by another trigger.`,
          },
        };
      }

      return {
        status: 200,
        jsonBody: {
          status: 'success',
          document: result,
        },
      };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      context.error('[ClinicalExtractor Error]:', errorMessage);

      // Return HTTP 500 so Logic App retry policy detects failure and automatically retries
      return {
        status: 500,
        jsonBody: {
          status: 'error',
          message: errorMessage,
          document: {
            document_id: docId,
            processing_status: 'Failed',
            error_message: errorMessage,
          },
        },
      };
    }
  },
});
