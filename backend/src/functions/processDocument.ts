import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { processClinicalDocument } from '../services/documentProcessingService.js';
import type { ApiResponse } from '../types/document.types.js';
import type { DocumentProcessingInput } from '../types/extraction.types.js';

/**
 * Backend Controller / Azure Function Handler for processing uploaded documents.
 * Endpoint: POST /api/documents/process
 */
export async function handleProcessDocument(req: Request, res: Response): Promise<void> {
  try {
    const file = req.file;

    if (!file) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'No document file uploaded. Please upload a PDF or image document.',
      };
      res.status(400).json(response);
      return;
    }

    const documentId = req.body['documentId'] ? String(req.body['documentId']) : `DOC-${uuidv4().substring(0, 8).toUpperCase()}`;
    const submittedBy = req.body['submittedBy'] ? String(req.body['submittedBy']) : 'Clinician / System';

    const input: DocumentProcessingInput = {
      documentId,
      fileName: file.originalname,
      fileBuffer: file.buffer,
      mimeType: file.mimetype,
      submittedBy,
    };

    const result = await processClinicalDocument(input);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: `Document ${result.documentId} processed with status: ${result.processingStatus}`,
    };

    res.status(200).json(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[ProcessDocumentHandler] Unexpected error:', message);
    const response: ApiResponse<null> = {
      success: false,
      error: `Processing error: ${message}`,
    };
    res.status(500).json(response);
  }
}
