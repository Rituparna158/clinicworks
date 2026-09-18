import React from 'react';

export const FlowBanner: React.FC = () => {
  return (
    <section className="flow-banner">
      <div className="flow-container">
        <div className="flow-badge-label">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <span>Cloud Pipeline Architecture</span>
        </div>
        <div className="flow-steps-track">
          <span className="flow-step">
            <span className="flow-step-num">1</span>
            <span>Doc Upload</span>
          </span>
          <span className="flow-arrow">&rarr;</span>
          <span className="flow-step">
            <span className="flow-step-num">2</span>
            <span>Azure Logic App</span>
          </span>
          <span className="flow-arrow">&rarr;</span>
          <span className="flow-step">
            <span className="flow-step-num">3</span>
            <span>Azure Function (Rules)</span>
          </span>
          <span className="flow-arrow">&rarr;</span>
          <span className="flow-step">
            <span className="flow-step-num">4</span>
            <span>Gemini Multimodal AI</span>
          </span>
          <span className="flow-arrow">&rarr;</span>
          <span className="flow-step">
            <span className="flow-step-num">5</span>
            <span>PostgreSQL Database</span>
          </span>
        </div>
      </div>
    </section>
  );
};
