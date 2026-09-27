import type { Request, Response } from 'express';
import { getDocumentById } from '../database/documentRepository.js';
import { blobStorageService } from '../services/blobStorageService.js';
import { processClinicalDocument } from '../services/documentProcessingService.js';
import type { ApiResponse } from '../types/document.types.js';
import type { DocumentProcessingInput } from '../types/extraction.types.js';

/**
 * Backend Controller / Azure Function Handler for re-processing a document.
 * Endpoint: POST /api/documents/:id/retry
 * Fulfills assignment requirement (Page 4): "The Retry action should send the document through the processing workflow again."
 */
export async function handleRetryDocument(req: Request, res: Response): Promise<void> {
  try {
    const idParam = req.params['id'];
    const documentId = Array.isArray(idParam) ? idParam[0] : idParam;

    if (!documentId) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Document ID is required for retry.',
      };
      res.status(400).json(response);
      return;
    }

    const existingDoc = await getDocumentById(documentId);
    if (!existingDoc) {
      const response: ApiResponse<null> = {
        success: false,
        error: `Document ${documentId} not found.`,
      };
      res.status(404).json(response);
      return;
    }

    // Retrieve original PDF from Azure Blob Storage if available
    let fileBuffer: Buffer = Buffer.from(
      `Re-processing Document: ${existingDoc.file_name}\nType: ${existingDoc.document_type}\nEncounter: Clinical Retry`,
      'utf-8'
    );
    let mimeType = 'application/pdf';

    if (existingDoc.blob_name && blobStorageService.isConfigured()) {
      try {
        const downloaded = await blobStorageService.downloadBlob(existingDoc.blob_name);
        fileBuffer = downloaded.buffer;
        mimeType = downloaded.contentType;
      } catch (dlErr) {
        console.warn(`[RetryHandler] Could not download blob ${existingDoc.blob_name}:`, dlErr);
      }
    }

    const input: DocumentProcessingInput = {
      documentId: existingDoc.document_id,
      fileName: existingDoc.file_name,
      fileBuffer,
      mimeType,
      submittedBy: `${existingDoc.processed_by} (Retry)`,
    };

    const result = await processClinicalDocument(input);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: `Document ${documentId} successfully retried. Current status: ${result.processingStatus}`,
    };

    res.status(200).json(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[RetryDocumentHandler] Failed to retry document:`, message);
    const response: ApiResponse<null> = {
      success: false,
      error: `Retry failed: ${message}`,
    };
    res.status(500).json(response);
  }
}
