import React, { useMemo, useState } from 'react';
import type { ClinicalDocument } from '../services/api.js';
import { ConfidenceMeter, StatusBadge, TypeBadge } from './StatusBadge.js';

interface DocumentsTableProps {
  readonly documents: readonly ClinicalDocument[];
  readonly isLoading: boolean;
  readonly onRetry: (documentId: string) => Promise<void>;
  readonly onSelectDocument: (doc: ClinicalDocument) => void;
  readonly onOpenUpload: () => void;
}

export const DocumentsTable: React.FC<DocumentsTableProps> = ({
  documents,
  isLoading,
  onRetry,
  onSelectDocument,
  onOpenUpload,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
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
    if (!isoStr) return <span className="text-muted">&mdash;</span>;
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

  // Client-side filtering
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      // Status filter
      if (statusFilter && doc.processingStatus !== statusFilter) {
        return false;
      }
      // Type filter
      if (typeFilter && doc.documentType !== typeFilter) {
        return false;
      }
      // Search query (Document ID or File Name)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const idMatch = doc.documentId.toLowerCase().includes(q);
        const nameMatch = doc.fileName.toLowerCase().includes(q);
        if (!idMatch && !nameMatch) {
          return false;
        }
      }
      return true;
    });
  }, [documents, statusFilter, typeFilter, searchQuery]);

  const hasActiveFilters = Boolean(searchQuery || statusFilter || typeFilter);

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setTypeFilter('');
  };

  return (
    <div className="table-section-card">
      {/* Search & Filter Toolbar */}
      <div className="table-toolbar">
        <div className="search-box">
          <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="search-input"
            placeholder="Search by Document ID or File Name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="btn-clear-search"
              onClick={() => setSearchQuery('')}
              title="Clear search"
            >
              &times;
            </button>
          )}
        </div>

        <div className="filters-group">
          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by processing status"
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
            aria-label="Filter by measure type"
          >
            <option value="">All Types</option>
            <option value="BP">Blood Pressure (BP)</option>
            <option value="A1C">HbA1c</option>
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              className="btn-link-reset"
              onClick={handleClearFilters}
              title="Reset search and filters"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="table-wrapper">
        <table className="clinical-table">
          <thead>
            <tr>
              <th>Document</th>
              <th>Type</th>
              <th>Measure Extracted</th>
              <th>Clinical Date</th>
              <th>Processed Date</th>
              <th>Confidence</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && documents.length === 0 ? (
              // Skeleton loading rows
              Array.from({ length: 4 }).map((_, idx) => (
                <tr key={`skeleton-${idx}`} className="skeleton-row">
                  <td><div className="skeleton-line" style={{ width: '80px' }} /></td>
                  <td><div className="skeleton-line" style={{ width: '70px' }} /></td>
                  <td><div className="skeleton-line" style={{ width: '100px' }} /></td>
                  <td><div className="skeleton-line" style={{ width: '85px' }} /></td>
                  <td><div className="skeleton-line" style={{ width: '110px' }} /></td>
                  <td><div className="skeleton-line" style={{ width: '90px' }} /></td>
                  <td><div className="skeleton-line" style={{ width: '80px' }} /></td>
                  <td className="text-right"><div className="skeleton-line" style={{ width: '60px', marginLeft: 'auto' }} /></td>
                </tr>
              ))
            ) : filteredDocuments.length > 0 ? (
              filteredDocuments.map((doc) => {
                const isRetrying = retryingId === doc.documentId;
                const canRetry = doc.processingStatus === 'Failed' || doc.processingStatus === 'Needs Review';

                return (
                  <tr key={doc.documentId} className="table-row-interactive">
                    <td>
                      <button
                        type="button"
                        className="btn-doc-link"
                        onClick={() => onSelectDocument(doc)}
                        title="View clinical audit details"
                      >
                        #{doc.documentId}
                      </button>
                      <span className="doc-filename-sub" title={doc.fileName}>
                        {doc.fileName}
                      </span>
                    </td>

                    <td>
                      <TypeBadge type={doc.documentType} />
                    </td>

                    <td>
                      {doc.measureExtracted ? (
                        <span className="clinical-measure-val">{doc.measureExtracted}</span>
                      ) : (
                        <span className="clinical-measure-na">
                          {doc.processingStatus === 'Needs Review' ? 'Review required' : 'None extracted'}
                        </span>
                      )}
                    </td>

                    <td>
                      <span className="table-date">{formatDate(doc.measureDate)}</span>
                    </td>

                    <td>
                      <span className="table-date">{formatDateTime(doc.dateProcessed)}</span>
                    </td>

                    <td>
                      <ConfidenceMeter score={doc.confidenceScore} />
                    </td>

                    <td>
                      <StatusBadge status={doc.processingStatus} />
                    </td>

                    <td className="text-right">
                      <div className="actions-cell">
                        <button
                          type="button"
                          className="btn-action-audit"
                          onClick={() => onSelectDocument(doc)}
                          title="View clinical rules and details"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                          <span>Audit</span>
                        </button>

                        {canRetry && (
                          <button
                            type="button"
                            className="btn-action-retry"
                            disabled={isRetrying}
                            onClick={(e) => handleRetryClick(e, doc.documentId)}
                            title="Re-run clinical rules & AI pipeline"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={isRetrying ? 'spin-icon' : ''}>
                              <path d="M23 4v6h-6" />
                              <path d="M1 20v-6h6" />
                              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                            </svg>
                            <span>{isRetrying ? 'Retrying...' : 'Retry'}</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : null}
          </tbody>
        </table>
      </div>

      {/* Empty States */}
      {!isLoading && documents.length === 0 && (
        <div className="empty-state-card">
          <div className="empty-icon">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="12" y2="12" />
              <line x1="15" y1="15" x2="12" y2="12" />
            </svg>
          </div>
          <h4>No clinical documents in repository</h4>
          <p>Upload medical records or lab reports to begin automated clinical quality extraction.</p>
          <button type="button" className="btn btn-primary" onClick={onOpenUpload}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Upload Document</span>
          </button>
        </div>
      )}

      {!isLoading && documents.length > 0 && filteredDocuments.length === 0 && (
        <div className="empty-state-card">
          <div className="empty-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <h4>No matching documents found</h4>
          <p>Try adjusting your search query or clear the active status and type filters.</p>
          <button type="button" className="btn btn-secondary" onClick={handleClearFilters}>
            Clear All Filters
          </button>
        </div>
      )}
    </div>
  );
};
