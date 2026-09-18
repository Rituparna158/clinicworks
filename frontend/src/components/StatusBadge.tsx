import React from 'react';

interface StatusBadgeProps {
  readonly status: 'Success' | 'Needs Review' | 'Failed' | string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  if (status === 'Success') {
    return (
      <span className="badge badge-success">
        <span className="badge-dot dot-success" />
        <span>Success</span>
      </span>
    );
  }
  if (status === 'Needs Review') {
    return (
      <span className="badge badge-review">
        <span className="badge-dot dot-review" />
        <span>Needs Review</span>
      </span>
    );
  }
  if (status === 'Failed') {
    return (
      <span className="badge badge-failed">
        <span className="badge-dot dot-failed" />
        <span>Failed</span>
      </span>
    );
  }
  // Processing or any fallback
  return (
    <span className="badge badge-processing">
      <span className="badge-dot dot-processing spin-icon" />
      <span>{status || 'Processing'}</span>
    </span>
  );
};

interface TypeBadgeProps {
  readonly type: 'BP' | 'A1C' | 'UNKNOWN' | string;
}

export const TypeBadge: React.FC<TypeBadgeProps> = ({ type }) => {
  if (type === 'BP') {
    return (
      <span className="badge badge-bp" title="Blood Pressure Clinical Quality Measure">
        <span className="badge-dot dot-bp" />
        <span>Blood Pressure</span>
      </span>
    );
  }
  if (type === 'A1C') {
    return (
      <span className="badge badge-a1c" title="Hemoglobin A1c Glycemic Measure">
        <span className="badge-dot dot-a1c" />
        <span>HbA1c</span>
      </span>
    );
  }
  return (
    <span className="badge badge-unknown" title="Unclassified Document">
      <span className="badge-dot dot-unknown" />
      <span>Unclassified</span>
    </span>
  );
};

interface ConfidenceMeterProps {
  readonly score: number | null | undefined;
}

export const ConfidenceMeter: React.FC<ConfidenceMeterProps> = ({ score }) => {
  if (score === null || score === undefined) {
    return <span className="confidence-na">&mdash;</span>;
  }

  const num = Math.round(Number(score));
  let colorClass = 'confidence-high';
  if (num < 50) colorClass = 'confidence-low';
  else if (num < 80) colorClass = 'confidence-med';

  return (
    <div className="confidence-meter-container" title={`Composite AI Confidence: ${num}%`}>
      <div className="confidence-track">
        <div className={`confidence-bar-fill ${colorClass}`} style={{ width: `${Math.max(6, Math.min(100, num))}%` }} />
      </div>
      <span className={`confidence-text ${colorClass}-text`}>{num}%</span>
    </div>
  );
};
