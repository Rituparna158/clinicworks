
CREATE TABLE IF NOT EXISTS clinical_documents (
    document_id VARCHAR(64) PRIMARY KEY,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(32) NOT NULL DEFAULT 'PDF',          -- 'PDF', 'SCANNED_PDF', 'IMAGE'
    document_type VARCHAR(32) NOT NULL DEFAULT 'UNKNOWN',  -- 'BP', 'A1C', 'UNKNOWN'
    measure_extracted VARCHAR(128),                        -- e.g. '138/88', '7.4% (Diabetes)'
    measure_date DATE,                                     -- Associated clinical date
    date_processed TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_by VARCHAR(128) DEFAULT 'User',
    processing_status VARCHAR(32) NOT NULL,                -- 'Success', 'Needs Review', 'Failed'
    confidence_score NUMERIC(5, 2),                        -- 0.00 to 100.00
    error_message TEXT,                                    -- Details for Failed / Needs Review
    patient_age INT,                                       -- Patient age if extracted
    raw_extracted_json JSONB,                              -- Complete audit trail from LLM & rules
    retry_count INT NOT NULL DEFAULT 0,                    -- Number of re-processing attempts
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


CREATE INDEX IF NOT EXISTS idx_clinical_docs_status ON clinical_documents(processing_status);
CREATE INDEX IF NOT EXISTS idx_clinical_docs_type ON clinical_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_clinical_docs_date_processed ON clinical_documents(date_processed DESC);
CREATE INDEX IF NOT EXISTS idx_clinical_docs_measure_date ON clinical_documents(measure_date DESC);


CREATE OR REPLACE FUNCTION update_clinical_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_clinical_documents_updated_at ON clinical_documents;

CREATE TRIGGER trg_update_clinical_documents_updated_at
BEFORE UPDATE ON clinical_documents
FOR EACH ROW
EXECUTE FUNCTION update_clinical_documents_updated_at();
