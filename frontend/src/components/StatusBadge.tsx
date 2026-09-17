import React from 'react';

interface StatusBadgeProps {
  readonly status: 'Success' | 'Needs Review' | 'Failed';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  if (status === 'Success') {
    return <span className="badge badge-success">&#10003; Success</span>;
  }
  if (status === 'Needs Review') {
    return <span className="badge badge-review">&#9888; Needs Review</span>;
  }
  return <span className="badge badge-failed">&#10007; Failed</span>;
};

interface TypeBadgeProps {
  readonly type: 'BP' | 'A1C' | 'UNKNOWN';
}

export const TypeBadge: React.FC<TypeBadgeProps> = ({ type }) => {
  if (type === 'BP') return <span className="badge badge-bp">Blood Pressure (BP)</span>;
  if (type === 'A1C') return <span className="badge badge-a1c">HbA1c (A1C)</span>;
  return <span className="badge badge-unknown">UNKNOWN</span>;
};

interface ConfidenceMeterProps {
  readonly score: number | null;
}

export const ConfidenceMeter: React.FC<ConfidenceMeterProps> = ({ score }) => {
  if (score === null || score === undefined) {
    return <span style={{ color: '#94a3b8' }}>N/A</span>;
  }

  const num = Math.round(Number(score));
  let colorClass = 'confidence-high';
  if (num < 50) colorClass = 'confidence-low';
  else if (num < 80) colorClass = 'confidence-med';

  return (
    <div className="confidence-meter" title={`Algorithmic Confidence: ${num}%`}>
      <div className="confidence-bar">
        <div className={`confidence-fill ${colorClass}`} style={{ width: `${num}%` }} />
      </div>
      <span style={{ fontWeight: 600, fontSize: '0.8rem' }}>{num}%</span>
    </div>
  );
};
