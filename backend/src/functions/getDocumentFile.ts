import type { Request, Response } from 'express';
import { getDocumentById } from '../database/documentRepository.js';
import { blobStorageService } from '../services/blobStorageService.js';
import type { ApiResponse } from '../types/document.types.js';

export async function handleGetDocumentFile(req: Request, res: Response): Promise<void> {
  try {
    const rawId = req.params['id'];
    const documentId = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!documentId) {
      res.status(400).json({ success: false, error: 'Document ID is required' });
      return;
    }

    const doc = await getDocumentById(documentId);
    if (!doc) {
      res.status(404).json({ success: false, error: `Document ${documentId} not found` });
      return;
    }

    if (!doc.blob_name) {
      // If no blob is associated (e.g. initial demo seed)
      const response: ApiResponse<null> = {
        success: false,
        error: 'No raw document file stored in Azure Blob Storage for this record.',
      };
      res.status(404).json(response);
      return;
    }

    if (!blobStorageService.isConfigured()) {
      res.status(503).json({ success: false, error: 'Azure Blob Storage is not configured on this server.' });
      return;
    }

    // Generate a secure SAS URL valid for 60 minutes
    const sasUrl = blobStorageService.generateSasUrl(doc.blob_name, 60);

    // If client requested JSON metadata or redirect
    if (req.query['redirect'] === 'false') {
      res.json({ success: true, data: { sasUrl, fileName: doc.file_name } });
      return;
    }

    // Default: Redirect browser/client straight to secure SAS URL to display inline or download
    res.redirect(sasUrl);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[GetDocumentFileHandler] Error retrieving file for doc:`, message);
    res.status(500).json({ success: false, error: message });
  }
}
