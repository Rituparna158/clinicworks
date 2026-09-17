import React, { useState } from 'react';
import type { ClinicalDocument } from '../services/api.js';
import { ConfidenceMeter, StatusBadge, TypeBadge } from './StatusBadge.js';

interface DocumentsTableProps {
  readonly documents: readonly ClinicalDocument[];
  readonly onRetry: (documentId: string) => Promise<void>;
  readonly onSelectDocument: (doc: ClinicalDocument) => void;
  readonly statusFilter: string;
  readonly setStatusFilter: (val: string) => void;
  readonly typeFilter: string;
  readonly setTypeFilter: (val: string) => void;
}

export const DocumentsTable: React.FC<DocumentsTableProps> = ({
  documents,
  onRetry,
  onSelectDocument,
  statusFilter,
  setStatusFilter,
  typeFilter,
  setTypeFilter,
}) => {
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const handleRetryClick = async (e: React.MouseEvent, docId: string) => {
    e.stopPropagation();
    setRetryingId(docId);
    try {
      await onRetry(docId);
    } finally {
      setRetryingId(null);
    }
  };

  const formatDate = (isoStr: string | null) => {
    if (!isoStr) return 'Not specified';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch {
      return isoStr;
    }
  };

  const formatDateTime = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <section className="card table-card">
      <div className="table-header-row">
        <div>
          <h2>Processed Documents</h2>
          <p className="subtitle">Real-time status and clinical measures stored in PostgreSQL.</p>
        </div>
        <div className="filter-controls">
          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="Success">Success</option>
            <option value="Needs Review">Needs Review</option>
            <option value="Failed">Failed</option>
          </select>
          <select
            className="form-select"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">All Types</option>
            <option value="BP">Blood Pressure (BP)</option>
            <option value="A1C">HbA1c (A1C)</option>
          </select>
        </div>
      </div>

      <div className="table-responsive">
        <table className="clinical-table">
          <thead>
            <tr>
              <th>Document ID</th>
              <th>Type</th>
              <th>Measure Extracted</th>
              <th>Measure Date</th>
              <th>Date Processed</th>
              <th>Processed By</th>
              <th>Confidence</th>
              <th>Status</th>
              <th className="text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => {
              const isThisRetrying = retryingId === doc.documentId;
              return (
                <tr key={doc.documentId} onClick={() => onSelectDocument(doc)}>
                  <td>
                    <strong>#{doc.documentId}</strong>
                    <br />
                    <small style={{ color: '#64748b' }}>{doc.fileName}</small>
                  </td>
                  <td>
                    <TypeBadge type={doc.documentType} />
                  </td>
                  <td>
                    {doc.measureExtracted ? (
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>{doc.measureExtracted}</span>
                    ) : (
                      <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>&mdash;</span>
                    )}
                  </td>
                  <td>{formatDate(doc.measureDate)}</td>
                  <td>{formatDateTime(doc.dateProcessed)}</td>
                  <td>{doc.processedBy || 'User'}</td>
                  <td>
                    <ConfidenceMeter score={doc.confidenceScore} />
                  </td>
                  <td>
                    <StatusBadge status={doc.processingStatus} />
                  </td>
                  <td className="text-right">
                    <button
                      type="button"
                      className="btn-sm btn-retry"
                      disabled={isThisRetrying}
                      onClick={(e) => handleRetryClick(e, doc.documentId)}
                      title="Send document through processing workflow again"
                    >
                      <span>{isThisRetrying ? 'Retrying...' : 'Retry'}</span>
                      {isThisRetrying && <span className="spinner spinner-dark" />}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {documents.length === 0 && (
        <div className="empty-state">
          <p>No clinical documents found matching current filter.</p>
        </div>
      )}
    </section>
  );
};
