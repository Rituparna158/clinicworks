import React, { useRef, useState } from 'react';
import type { ClinicalDocument } from '../services/api.js';

interface UploadCardProps {
  readonly onDocumentProcessed: (doc: ClinicalDocument) => void;
  readonly onProcessFile: (file: File, submittedBy: string) => Promise<ClinicalDocument>;
}

const SAMPLE_SCENARIOS = [
  { label: 'Adult BP (138/88)', file: 'bp_adult_valid.pdf', dot: 'bp' },
  { label: 'Pediatric (<18)', file: 'bp_under18_pediatric.pdf', dot: 'review' },
  { label: 'BP Multiple Readings', file: 'bp_multiple_readings.pdf', dot: 'bp' },
  { label: 'BP with Goal Filter', file: 'bp_with_goal.pdf', dot: 'bp' },
  { label: 'HbA1c Diabetes (7.4%)', file: 'hba1c_diabetes.pdf', dot: 'a1c' },
  { label: 'HbA1c Prediabetes (5.8%)', file: 'hba1c_prediabetes.pdf', dot: 'a1c' },
  { label: 'HbA1c Lowest Value', file: 'hba1c_multiple_values.pdf', dot: 'a1c' },
  { label: 'Scanned Image PDF', file: 'scanned_image_sample.pdf', dot: 'scanned' },
];

export const UploadCard: React.FC<UploadCardProps> = ({ onDocumentProcessed, onProcessFile }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submittedBy, setSubmittedBy] = useState('Dr. Vance / Station 4');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alert, setAlert] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setAlert(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      setSelectedFile(file);
      setAlert(null);
    }
  };

  const handleQuickSample = async (sampleFileName: string) => {
    try {
      const res = await fetch(`/sample-docs/${sampleFileName}`);
      if (!res.ok) throw new Error('Failed to load sample document');
      const blob = await res.blob();
      const file = new File([blob], sampleFileName, { type: 'application/pdf' });
      setSelectedFile(file);
      setAlert({ msg: `Loaded sample test document: ${sampleFileName}`, type: 'success' });
    } catch {
      // Synthetic fallback File
      const dummyBlob = new Blob(['%PDF-1.7 Clinical Report'], { type: 'application/pdf' });
      const file = new File([dummyBlob], sampleFileName, { type: 'application/pdf' });
      setSelectedFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setAlert({ msg: 'Please select or drop a clinical document file before submitting.', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    setAlert(null);

    try {
      const doc = await onProcessFile(selectedFile, submittedBy);
      setAlert({
        msg: `Document ${doc.documentId} processed successfully! Status: ${doc.processingStatus} (${doc.measureExtracted ?? 'No measure'})`,
        type: 'success',
      });
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onDocumentProcessed(doc);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setAlert({ msg: message, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="card upload-card">
      <div className="card-header">
        <div className="header-icon upload-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <div>
          <h2>Upload Clinical Document</h2>
          <p className="subtitle">
            Supports digital selectable PDFs and scanned/image PDFs for Blood Pressure (BP) &amp; HbA1c measures.
          </p>
        </div>
      </div>

      {/* Quick Sample Buttons */}
      <div className="sample-picker">
        <span className="sample-label">Quick Test Scenarios:</span>
        <div className="sample-buttons">
          {SAMPLE_SCENARIOS.map((scenario) => (
            <button
              key={scenario.file}
              type="button"
              className="btn-chip"
              onClick={() => handleQuickSample(scenario.file)}
            >
              <span className={`chip-dot ${scenario.dot}`} />
              {scenario.label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="upload-form">
        <div
          className={`dropzone ${isDragOver ? 'dragover' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,image/png,image/jpeg"
            onChange={handleFileChange}
            hidden
          />

          {!selectedFile ? (
            <div className="dropzone-content">
              <div className="drop-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="12" y1="18" x2="12" y2="12" />
                  <line x1="9" y1="15" x2="12" y2="12" />
                  <line x1="15" y1="15" x2="12" y2="12" />
                </svg>
              </div>
              <p className="drop-primary">
                Drag &amp; drop your clinical document here, or <span className="browse-link">browse files</span>
              </p>
              <p className="drop-secondary">Supports PDF (Selectable text &amp; Scanned images), PNG, JPEG</p>
            </div>
          ) : (
            <div className="file-preview-box" onClick={(e) => e.stopPropagation()}>
              <div className="preview-info">
                <span className="preview-icon">&#128196;</span>
                <div>
                  <strong>{selectedFile.name}</strong>
                  <span className="preview-size">{(selectedFile.size / 1024).toFixed(1)} KB</span>
                </div>
              </div>
              <button
                type="button"
                className="btn-remove"
                title="Remove file"
                onClick={() => setSelectedFile(null)}
              >
                &times;
              </button>
            </div>
          )}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="submittedBy">Submitted By (Clinician / Station):</label>
            <input
              id="submittedBy"
              type="text"
              className="form-control"
              value={submittedBy}
              onChange={(e) => setSubmittedBy(e.target.value)}
            />
          </div>
          <div className="form-group submit-group">
            <button type="submit" className="btn btn-primary" disabled={isSubmitting || !selectedFile}>
              <span>{isSubmitting ? 'Processing Document...' : 'Submit for Processing'}</span>
              {isSubmitting && <span className="spinner" />}
            </button>
          </div>
        </div>
      </form>

      {alert && <div className={`alert alert-${alert.type}`}>{alert.msg}</div>}
    </section>
  );
};
