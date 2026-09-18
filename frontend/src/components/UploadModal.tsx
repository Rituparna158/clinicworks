import React, { useEffect, useRef, useState } from 'react';
import type { ClinicalDocument } from '../services/api.js';

interface UploadModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onProcessFile: (file: File, submittedBy: string) => Promise<ClinicalDocument>;
  readonly onDocumentProcessed: (doc: ClinicalDocument) => void;
}

const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg'];
const MAX_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onProcessFile,
  onDocumentProcessed,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submittedBy, setSubmittedBy] = useState('Clinical Staff');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const validateAndSetFile = (file: File) => {
    setValidationError(null);
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setValidationError(`Unsupported file format "${ext}". Please upload a PDF, PNG, or JPEG.`);
      setSelectedFile(null);
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setValidationError('File size exceeds the 25 MB limit.');
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setSelectedFile(null);
    setValidationError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setValidationError('Please select or drag a clinical document before processing.');
      return;
    }
    if (!submittedBy.trim()) {
      setValidationError('Please provide the clinician or workstation name.');
      return;
    }

    setIsSubmitting(true);
    setValidationError(null);

    try {
      const doc = await onProcessFile(selectedFile, submittedBy.trim());
      onDocumentProcessed(doc);
      handleClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setValidationError(`Processing failed: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={handleClose} role="dialog" aria-modal="true">
      <div className="modal-dialog upload-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div className="modal-header-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <div>
              <h3>Upload Clinical Document</h3>
              <p className="modal-subtitle">
                Select a medical record or lab report to extract and validate Blood Pressure or HbA1c measures.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={handleClose}
            disabled={isSubmitting}
            aria-label="Close dialog"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Drag and Drop Zone */}
            <div
              className={`dropzone ${isDragOver ? 'dragover' : ''} ${selectedFile ? 'dropzone-has-file' : ''}`}
              onClick={() => !isSubmitting && fileInputRef.current?.click()}
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
                disabled={isSubmitting}
                hidden
              />

              {!selectedFile ? (
                <div className="dropzone-content">
                  <div className="drop-icon">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="12" y1="18" x2="12" y2="12" />
                      <polyline points="9 15 12 12 15 15" />
                    </svg>
                  </div>
                  <p className="drop-primary">
                    Drop document here, or <span className="browse-link">browse files</span>
                  </p>
                  <p className="drop-secondary">Supports PDF, PNG, JPEG (up to 25 MB)</p>
                </div>
              ) : (
                <div className="file-selected-box" onClick={(e) => e.stopPropagation()}>
                  <div className="file-meta">
                    <div className="file-type-badge">
                      {selectedFile.name.endsWith('.pdf') ? 'PDF' : 'IMG'}
                    </div>
                    <div className="file-details">
                      <strong className="file-name">{selectedFile.name}</strong>
                      <span className="file-size">{(selectedFile.size / 1024).toFixed(1)} KB</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-remove-file"
                    title="Remove selected file"
                    disabled={isSubmitting}
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                  >
                    &times;
                  </button>
                </div>
              )}
            </div>

            {/* Clinician / Submitter input */}
            <div className="form-group" style={{ marginTop: '1.25rem' }}>
              <label htmlFor="submittedBy" className="form-label">
                Submitted By (Clinician / Workstation)
              </label>
              <input
                id="submittedBy"
                type="text"
                className="form-control"
                value={submittedBy}
                onChange={(e) => setSubmittedBy(e.target.value)}
                placeholder="e.g., Dr. Vance / Station 4"
                disabled={isSubmitting}
                required
              />
            </div>

            {validationError && (
              <div className="alert alert-error" style={{ marginTop: '1rem' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{validationError}</span>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting || !selectedFile}
            >
              {isSubmitting && <span className="spinner" />}
              <span>{isSubmitting ? 'Processing Document...' : 'Upload & Process'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
