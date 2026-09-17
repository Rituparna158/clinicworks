import React from 'react';

export const FlowBanner: React.FC = () => {
  return (
    <section className="flow-banner">
      <div className="flow-container">
        <span className="flow-title">Architecture Pipeline:</span>
        <div className="flow-step active">Document Uploaded</div>
        <div className="flow-arrow">&rarr;</div>
        <div className="flow-step active">Logic App Orchestrator</div>
        <div className="flow-arrow">&rarr;</div>
        <div className="flow-step active">Azure Function (Rules)</div>
        <div className="flow-arrow">&rarr;</div>
        <div className="flow-step active">Gemini Multimodal AI</div>
        <div className="flow-arrow">&rarr;</div>
        <div className="flow-step active">PostgreSQL Storage</div>
      </div>
    </section>
  );
};
