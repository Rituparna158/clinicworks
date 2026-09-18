import {
  BlobServiceClient,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
  StorageSharedKeyCredential,
} from '@azure/storage-blob';
import path from 'path';

class BlobStorageService {
  private blobServiceClient: BlobServiceClient | null = null;
  private containerName: string = 'clinical-documents';
  private accountName: string = '';
  private accountKey: string = '';

  constructor() {
    this.init();
  }

  private init(): void {
    const connStr = process.env['AZURE_STORAGE_CONNECTION_STRING'];
    this.containerName = process.env['AZURE_STORAGE_CONTAINER_NAME'] ?? 'clinical-documents';

    if (connStr) {
      try {
        this.blobServiceClient = BlobServiceClient.fromConnectionString(connStr);
        // Extract account name and account key for SAS generation
        const matchName = connStr.match(/AccountName=([^;]+)/);
        const matchKey = connStr.match(/AccountKey=([^;]+)/);
        if (matchName && matchName[1]) this.accountName = matchName[1];
        if (matchKey && matchKey[1]) this.accountKey = matchKey[1];
      } catch (err) {
        console.warn('[BlobStorageService] Warning: Failed to initialize BlobServiceClient from connection string:', err);
      }
    }
  }

  /**
   * Check if Blob Storage is configured and accessible
   */
  public isConfigured(): boolean {
    return this.blobServiceClient !== null;
  }

  /**
   * Upload a clinical document file buffer to Azure Blob Storage
   */
  public async uploadClinicalDocument(
    fileName: string,
    fileBuffer: Buffer,
    mimeType: string = 'application/pdf'
  ): Promise<{ blobUrl: string; blobName: string }> {
    if (!this.blobServiceClient) {
      this.init();
      if (!this.blobServiceClient) {
        throw new Error('Azure Storage connection string is not configured.');
      }
    }

    const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
    
    // Ensure container exists
    const exists = await containerClient.exists();
    if (!exists) {
      await containerClient.create();
    }

    // Sanitize filename and create unique blob name
    const ext = path.extname(fileName) || (mimeType.includes('pdf') ? '.pdf' : '.bin');
    const baseName = path.basename(fileName, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const blobName = `${Date.now()}-${baseName}${ext}`;

    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.upload(fileBuffer, fileBuffer.length, {
      blobHTTPHeaders: {
        blobContentType: mimeType,
        blobContentDisposition: `inline; filename="${fileName}"`,
      },
    });

    console.log(`[BlobStorageService] Uploaded document ${blobName} to container ${this.containerName}`);

    return {
      blobUrl: blockBlobClient.url,
      blobName,
    };
  }

  /**
   * Generate a time-limited Shared Access Signature (SAS) URL for securely
   * viewing or downloading a private clinical document.
   */
  public generateSasUrl(blobName: string, expiryMinutes: number = 60): string {
    if (!this.blobServiceClient) {
      throw new Error('Azure Storage is not configured.');
    }

    if (!this.accountName || !this.accountKey) {
      // Fallback to direct URL if credentials cannot be parsed for SAS
      const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
      return containerClient.getBlockBlobClient(blobName).url;
    }

    const sharedKeyCredential = new StorageSharedKeyCredential(this.accountName, this.accountKey);

    const expiresOn = new Date();
    expiresOn.setMinutes(expiresOn.getMinutes() + expiryMinutes);

    const sasPermissions = new BlobSASPermissions();
    sasPermissions.read = true;

    const sasToken = generateBlobSASQueryParameters(
      {
        containerName: this.containerName,
        blobName,
        permissions: sasPermissions,
        expiresOn,
      },
      sharedKeyCredential
    ).toString();

    const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
    const blobClient = containerClient.getBlockBlobClient(blobName);
    return `${blobClient.url}?${sasToken}`;
  }

  /**
   * Download a blob directly into memory
   */
  public async downloadBlob(blobName: string): Promise<{ buffer: Buffer; contentType: string }> {
    if (!this.blobServiceClient) {
      throw new Error('Azure Storage is not configured.');
    }

    const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
    const blobClient = containerClient.getBlockBlobClient(blobName);
    const downloadResponse = await blobClient.download();

    const contentType = downloadResponse.contentType ?? 'application/pdf';
    const readableStream = downloadResponse.readableStreamBody;

    if (!readableStream) {
      throw new Error(`Blob ${blobName} returned empty stream.`);
    }

    const chunks: Buffer[] = [];
    for await (const chunk of readableStream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    return {
      buffer: Buffer.concat(chunks),
      contentType,
    };
  }
}

export const blobStorageService = new BlobStorageService();
