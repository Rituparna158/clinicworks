/**
 * Typed API client for ClinicWorks backend & Azure Functions
 */

export interface ConfidenceBreakdown {
  readonly modelCertainty: number;
  readonly formatValidation: number;
  readonly dateCertainty: number;
  readonly rulesValidation: number;
  readonly compositeScore: number;
  readonly reasoning: readonly string[];
}

export interface ClinicalDocument {
  readonly documentId: string;
  readonly fileName: string;
  readonly fileType: string;
  readonly documentType: 'BP' | 'A1C' | 'UNKNOWN';
  readonly measureExtracted: string | null;
  readonly measureDate: string | null;
  readonly dateProcessed: string;
  readonly processedBy: string;
  readonly processingStatus: 'Success' | 'Needs Review' | 'Failed';
  readonly confidenceScore: number | null;
  readonly errorMessage: string | null;
  readonly patientAge: number | null;
  readonly fileUrl?: string | null;
  readonly blobName?: string | null;
  readonly retryCount: number;
  readonly confidenceBreakdown?: ConfidenceBreakdown;
  readonly rawAuditJson?: Record<string, unknown>;
}

export interface ApiResponse<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly message?: string;
  readonly error?: string;
}

export interface HealthStatus {
  readonly status: 'HEALTHY' | 'UNHEALTHY';
  readonly service: string;
  readonly uptimeSeconds: number;
  readonly database: {
    readonly connected: boolean;
    readonly latencyMs: number;
    readonly error: string | null;
  };
}

export async function fetchDocuments(status?: string, type?: string): Promise<ClinicalDocument[]> {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (type) params.append('type', type);

  const res = await fetch(`/api/documents?${params.toString()}`);
  const json: ApiResponse<ClinicalDocument[]> = await res.json();
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error ?? 'Failed to fetch documents');
  }
  return json.data;
}

export async function uploadDocument(file: File, submittedBy: string): Promise<ClinicalDocument> {
  const formData = new FormData();
  formData.append('document', file);
  formData.append('submittedBy', submittedBy);

  const res = await fetch('/api/documents/process', {
    method: 'POST',
    body: formData,
  });

  const json: ApiResponse<ClinicalDocument> = await res.json();
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error ?? 'Document processing failed');
  }
  return json.data;
}

export async function retryDocument(documentId: string): Promise<ClinicalDocument> {
  const res = await fetch(`/api/documents/${encodeURIComponent(documentId)}/retry`, {
    method: 'POST',
  });

  const json: ApiResponse<ClinicalDocument> = await res.json();
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error ?? 'Retry request failed');
  }
  return json.data;
}

export async function fetchHealth(): Promise<HealthStatus> {
  const res = await fetch('/api/health');
  if (!res.ok) throw new Error('Health check failed');
  return res.json() as Promise<HealthStatus>;
}
