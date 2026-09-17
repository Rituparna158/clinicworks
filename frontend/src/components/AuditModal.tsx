import React from 'react';
import type { ClinicalDocument } from '../services/api.js';
import { StatusBadge, TypeBadge } from './StatusBadge.js';

interface AuditModalProps {
  readonly doc: ClinicalDocument | null;
  readonly onClose: () => void;
}

export const AuditModal: React.FC<AuditModalProps> = ({ doc, onClose }) => {
  if (!doc) return null;

  const reasoningList = doc.confidenceBreakdown?.reasoning ?? [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Document Audit: #{doc.documentId}</h3>
          <button type="button" className="modal-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="modal-body">
          <div className="audit-grid">
            <div className="audit-item">
              <label>File Name</label>
              <strong>{doc.fileName}</strong> ({doc.fileType})
            </div>
            <div className="audit-item">
              <label>Detected Measure Type</label>
              <TypeBadge type={doc.documentType} />
            </div>
            <div className="audit-item">
              <label>Extracted Measure</label>
              <strong>{doc.measureExtracted ?? 'None extracted'}</strong>
            </div>
            <div className="audit-item">
              <label>Measure Clinical Date</label>
              <span>{doc.measureDate ?? 'Undated'}</span>
            </div>
            <div className="audit-item">
              <label>Current Status</label>
              <StatusBadge status={doc.processingStatus} />
            </div>
            <div className="audit-item">
              <label>Retry Count</label>
              <span>{doc.retryCount} reprocessing attempts</span>
            </div>
          </div>

          {doc.errorMessage && (
            <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>
              <strong>Review Note:</strong> {doc.errorMessage}
            </div>
          )}

          <div className="audit-reasoning">
            <h4>Clinical Business Rules Applied:</h4>
            <ul>
              {reasoningList.length > 0 ? (
                reasoningList.map((r, i) => <li key={i}>{r}</li>)
              ) : (
                <li>Standard extraction rules applied without exception.</li>
              )}
            </ul>
          </div>

          <div>
            <label
              style={{
                fontSize: '0.75rem',
                color: '#64748b',
                fontWeight: 600,
                textTransform: 'uppercase',
                display: 'block',
                marginBottom: '0.4rem',
              }}
            >
              Raw JSON Audit Trail (Gemini + Rules Engine)
            </label>
            <pre className="audit-json">
              {JSON.stringify(doc.rawAuditJson ?? doc, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
