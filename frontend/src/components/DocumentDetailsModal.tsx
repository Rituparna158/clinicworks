import React, { useEffect, useState } from 'react';
import type { ClinicalDocument } from '../services/api.js';
import { ConfidenceMeter, StatusBadge, TypeBadge } from './StatusBadge.js';

interface DocumentDetailsModalProps {
  readonly doc: ClinicalDocument | null;
  readonly onClose: () => void;
  readonly onRetry: (documentId: string) => Promise<void>;
}

export const DocumentDetailsModal: React.FC<DocumentDetailsModalProps> = ({
  doc,
  onClose,
  onRetry,
}) => {
  const [isRetrying, setIsRetrying] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && doc && !isRetrying) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [doc, isRetrying, onClose]);

  if (!doc) return null;

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await onRetry(doc.documentId);
      onClose();
    } finally {
      setIsRetrying(false);
    }
  };

  const formatDate = (isoStr: string | null) => {
    if (!isoStr) return 'Not recorded';
    try {
      return new Date(isoStr).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return isoStr;
    }
  };

  const formatDateTime = (isoStr: string) => {
    try {
      return new Date(isoStr).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  const isFailed = doc.processingStatus === 'Failed';
  const isReview = doc.processingStatus === 'Needs Review';
  const isSuccess = doc.processingStatus === 'Success';
  const canRetry = isFailed || isReview;

  const reasoningList = doc.confidenceBreakdown?.reasoning ?? [];

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-dialog details-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div className="modal-header-icon details-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </div>
            <div>
              <div className="details-header-top">
                <h3>Document #{doc.documentId}</h3>
                <StatusBadge status={doc.processingStatus} />
              </div>
              <p className="modal-subtitle">{doc.fileName}</p>
            </div>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close details"
            disabled={isRetrying}
          >
            &times;
          </button>
        </div>

        <div className="modal-body">
          {/* Clinical Measure Callout Card */}
          {isSuccess && (
            <div className="clinical-result-card result-success">
              <div className="result-main">
                <span className="result-label">Validated Clinical Measure</span>
                <div className="result-value-row">
                  <span className="result-value">{doc.measureExtracted ?? 'Valid Reading'}</span>
                  <TypeBadge type={doc.documentType} />
                </div>
              </div>
              <div className="result-meta">
                <span className="meta-item">
                  <strong>Clinical Date:</strong> {formatDate(doc.measureDate)}
                </span>
                <span className="meta-item">
                  <strong>Composite Confidence:</strong> {doc.confidenceScore ? `${Math.round(doc.confidenceScore)}%` : 'N/A'}
                </span>
              </div>
            </div>
          )}

          {isReview && (
            <div className="clinical-result-card result-review">
              <div className="result-alert-header">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <strong>Clinical Review Required</strong>
              </div>
              <p className="result-alert-text">
                {doc.errorMessage || 'Clinical measure was extracted but triggered a protocol exception requiring manual clinician confirmation.'}
              </p>
              {doc.measureExtracted && (
                <div className="result-sub-detail">
                  <span>Extracted Value: <strong>{doc.measureExtracted}</strong></span>
                </div>
              )}
            </div>
          )}

          {isFailed && (
            <div className="clinical-result-card result-failed">
              <div className="result-alert-header">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                <strong>Processing Failed</strong>
              </div>
              <p className="result-alert-text">
                {doc.errorMessage || 'Document could not be processed. Please check file readability and retry processing.'}
              </p>
            </div>
          )}

          {/* Details Metadata Grid */}
          <div className="details-grid">
            <div className="details-item">
              <span className="details-label">Measure Type</span>
              <div style={{ marginTop: '0.25rem' }}>
                <TypeBadge type={doc.documentType} />
              </div>
            </div>

            <div className="details-item">
              <span className="details-label">Document File</span>
              <strong className="details-val text-truncate" title={doc.fileName}>{doc.fileName}</strong>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                <span className="details-subval">{doc.fileType}</span>
              </div>
            </div>

            <div className="details-item">
              <span className="details-label">Clinical Date</span>
              <span className="details-val">{formatDate(doc.measureDate)}</span>
            </div>

            <div className="details-item">
              <span className="details-label">Date Processed</span>
              <span className="details-val">{formatDateTime(doc.dateProcessed)}</span>
            </div>

            <div className="details-item">
              <span className="details-label">Processed By</span>
              <span className="details-val">{doc.processedBy || 'Clinician'}</span>
            </div>

            <div className="details-item">
              <span className="details-label">Reprocessing Attempts</span>
              <span className="details-val">{doc.retryCount} {doc.retryCount === 1 ? 'retry' : 'retries'}</span>
            </div>
          </div>

          {/* Confidence Breakdown */}
          <div className="section-block">
            <h4 className="section-block-title">AI Confidence &amp; Validation Score</h4>
            <div className="confidence-details-wrap">
              <ConfidenceMeter score={doc.confidenceScore} />
            </div>

            {reasoningList.length > 0 && (
              <div className="reasoning-box">
                <span className="reasoning-title">Clinical Business Rules Evaluated:</span>
                <ul className="reasoning-list">
                  {reasoningList.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Collapsible Technical JSON */}
          <div className="accordion-section">
            <button
              type="button"
              className="accordion-toggle"
              onClick={() => setShowRawJson(!showRawJson)}
            >
              <span>Technical Audit Payload (JSON)</span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{ transform: showRawJson ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {showRawJson && (
              <pre className="audit-json-viewer">
                {JSON.stringify(doc.rawAuditJson ?? doc, null, 2)}
              </pre>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isRetrying}>
            Close
          </button>
          {canRetry && (
            <button
              type="button"
              className="btn btn-primary"
              disabled={isRetrying}
              onClick={handleRetry}
            >
              {isRetrying && <span className="spinner" />}
              <span>{isRetrying ? 'Retrying Processing...' : 'Retry Processing'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
