import React, { useCallback, useEffect, useState } from 'react';
import './App.css';
import { DocumentDetailsModal } from './components/DocumentDetailsModal.js';
import { DocumentsTable } from './components/DocumentsTable.js';
import { Header } from './components/Header.js';
import { SummaryCounters } from './components/SummaryCounters.js';
import { UploadModal } from './components/UploadModal.js';
import {
  fetchDocuments,
  fetchHealth,
  retryDocument,
  uploadDocument,
  type ClinicalDocument,
  type HealthStatus,
} from './services/api.js';

interface ToastState {
  readonly message: string;
  readonly type: 'success' | 'error' | 'info';
}

export const App: React.FC = () => {
  const [documents, setDocuments] = useState<ClinicalDocument[]>([]);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [processingCount, setProcessingCount] = useState(0);

  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<ClinicalDocument | null>(null);

  // Notification Toast
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  }, []);

  const loadDocuments = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await fetchDocuments();
      setDocuments(data);
    } catch (err) {
      console.error('Failed to load clinical documents:', err);
      showToast('Unable to load documents from database.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  const loadHealth = useCallback(async () => {
    try {
      const data = await fetchHealth();
      setHealth(data);
    } catch {
      setHealth(null);
    }
  }, []);

  useEffect(() => {
    loadHealth();
    loadDocuments();
  }, [loadHealth, loadDocuments]);

  const handleProcessFile = async (file: File, submittedBy: string): Promise<ClinicalDocument> => {
    setProcessingCount((c) => c + 1);
    try {
      const doc = await uploadDocument(file, submittedBy);
      await loadDocuments();
      showToast(
        `Document #${doc.documentId} processed successfully: ${doc.processingStatus}`,
        doc.processingStatus === 'Failed' ? 'error' : 'success'
      );
      return doc;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Upload failed: ${msg}`, 'error');
      throw err;
    } finally {
      setProcessingCount((c) => Math.max(0, c - 1));
    }
  };

  const handleRetry = async (documentId: string): Promise<void> => {
    setProcessingCount((c) => c + 1);
    try {
      const doc = await retryDocument(documentId);
      await loadDocuments();
      // If modal was open for this document, update it
      if (selectedDoc?.documentId === documentId) {
        setSelectedDoc(doc);
      }
      showToast(
        `Document #${doc.documentId} reprocessed: ${doc.processingStatus}`,
        doc.processingStatus === 'Failed' ? 'error' : 'success'
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Retry failed for document #${documentId}: ${msg}`, 'error');
      throw err;
    } finally {
      setProcessingCount((c) => Math.max(0, c - 1));
    }
  };

  return (
    <div className="app-layout">
      <Header health={health} onRefresh={loadDocuments} isRefreshing={isLoading} />

      <main className="main-content">
        <div className="content-container">
          {/* Page Title & Primary Action Header */}
          <div className="page-header">
            <div>
              <h1 className="page-title">Clinical Documents</h1>
              <p className="page-subtitle">
                Automated document processing and clinical quality measure extraction for Blood Pressure and HbA1c.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-upload-cta"
              onClick={() => setIsUploadOpen(true)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Upload Document</span>
            </button>
          </div>

          {/* Operational Summary Counters */}
          <SummaryCounters documents={documents} processingCount={processingCount} />

          {/* Main Processed Documents Table */}
          <DocumentsTable
            documents={documents}
            isLoading={isLoading}
            onRetry={handleRetry}
            onSelectDocument={(doc) => setSelectedDoc(doc)}
            onOpenUpload={() => setIsUploadOpen(true)}
          />
        </div>
      </main>

      {/* Upload Document Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onProcessFile={handleProcessFile}
        onDocumentProcessed={() => {
          // Additional handling if needed
        }}
      />

      {/* Document Details & Clinical Audit Modal */}
      <DocumentDetailsModal
        doc={selectedDoc}
        onClose={() => setSelectedDoc(null)}
        onRetry={handleRetry}
      />

      {/* Toast Notification */}
      {toast && (
        <div className={`toast-alert toast-${toast.type}`} role="alert">
          <span className="toast-icon">
            {toast.type === 'success' && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
            {toast.type === 'error' && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            )}
            {toast.type === 'info' && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            )}
          </span>
          <span className="toast-message">{toast.message}</span>
        </div>
      )}

      {/* Clinical Platform Footer */}
      <footer className="footer">
        <div className="footer-content">
          <span>ClinicWorks Healthcare Document Operations Platform</span>
          <span className="footer-bullet">&bull;</span>
          <span>Azure Cloud Architecture &amp; Multimodal AI Vision</span>
          <span className="footer-bullet">&bull;</span>
          <span>HL7 / CQM Validation Standard</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
