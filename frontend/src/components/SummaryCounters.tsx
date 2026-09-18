import React from 'react';
import type { ClinicalDocument } from '../services/api.js';

interface SummaryCountersProps {
  readonly documents: readonly ClinicalDocument[];
  readonly processingCount: number;
}

export const SummaryCounters: React.FC<SummaryCountersProps> = ({
  documents,
  processingCount,
}) => {
  const total = documents.length;
  const successCount = documents.filter((d) => d.processingStatus === 'Success').length;
  const reviewCount = documents.filter((d) => d.processingStatus === 'Needs Review').length;
  const failedCount = documents.filter((d) => d.processingStatus === 'Failed').length;
  const attentionCount = reviewCount + failedCount;

  return (
    <div className="metrics-grid">
      <div className="metric-card">
        <div className="metric-header">
          <span className="metric-label">Total Documents</span>
          <span className="metric-icon total-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </span>
        </div>
        <div className="metric-value">{total}</div>
        <div className="metric-sub">Registered in repository</div>
      </div>

      <div className={`metric-card ${processingCount > 0 ? 'metric-card-active' : ''}`}>
        <div className="metric-header">
          <span className="metric-label">Processing</span>
          <span className="metric-icon processing-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={processingCount > 0 ? 'spin-icon' : ''}>
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
          </span>
        </div>
        <div className="metric-value">{processingCount}</div>
        <div className="metric-sub">{processingCount > 0 ? 'Active in pipeline' : 'Queue idle'}</div>
      </div>

      <div className="metric-card">
        <div className="metric-header">
          <span className="metric-label">Successfully Processed</span>
          <span className="metric-icon success-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </span>
        </div>
        <div className="metric-value">{successCount}</div>
        <div className="metric-sub">Clinical measures validated</div>
      </div>

      <div className={`metric-card ${attentionCount > 0 ? 'metric-card-attention' : ''}`}>
        <div className="metric-header">
          <span className="metric-label">Needs Attention</span>
          <span className="metric-icon attention-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </span>
        </div>
        <div className="metric-value">{attentionCount}</div>
        <div className="metric-sub">
          {attentionCount > 0 ? `${reviewCount} review · ${failedCount} failed` : 'No errors or rejections'}
        </div>
      </div>
    </div>
  );
};
