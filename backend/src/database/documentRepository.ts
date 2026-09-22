import type { ClinicalDocumentDbRow } from '../types/database.types.js';
import type { DocumentQueryFilter } from '../types/document.types.js';
import { getPool, testConnection } from './connection.js';

const inMemoryStore = new Map<string, ClinicalDocumentDbRow>();

export async function initializeDatabase(): Promise<void> {
  const health = await testConnection();
  if (health.isHealthy) {
    const pool = getPool();
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clinical_documents (
          document_id VARCHAR(64) PRIMARY KEY,
          file_name VARCHAR(255) NOT NULL,
          file_type VARCHAR(32) NOT NULL DEFAULT 'PDF',
          document_type VARCHAR(32) NOT NULL DEFAULT 'UNKNOWN',
          measure_extracted VARCHAR(128),
          measure_date DATE,
          date_processed TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          processed_by VARCHAR(128) DEFAULT 'User',
          processing_status VARCHAR(32) NOT NULL,
          confidence_score NUMERIC(5, 2),
          error_message TEXT,
          patient_age INT,
          file_url TEXT,
          blob_name TEXT,
          raw_extracted_json JSONB,
          retry_count INT NOT NULL DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      ALTER TABLE clinical_documents ADD COLUMN IF NOT EXISTS file_url TEXT;
      ALTER TABLE clinical_documents ADD COLUMN IF NOT EXISTS blob_name TEXT;
      CREATE INDEX IF NOT EXISTS idx_clinical_docs_status ON clinical_documents(processing_status);
      CREATE INDEX IF NOT EXISTS idx_clinical_docs_type ON clinical_documents(document_type);
      CREATE INDEX IF NOT EXISTS idx_clinical_docs_date_processed ON clinical_documents(date_processed DESC);
    `);
    console.log('[Database] PostgreSQL connected and schema verified.');
  } else {
    console.warn(
      `[Database] PostgreSQL unavailable (${health.error ?? 'offline'}); using resilient in-memory fallback store.`
    );
    seedInMemoryStore();
  }
}

function seedInMemoryStore(): void {
  if (inMemoryStore.size > 0) return;

  inMemoryStore.set('1001', {
    document_id: '1001',
    file_name: 'patient_1001_vitals.pdf',
    file_type: 'PDF',
    document_type: 'BP',
    measure_extracted: '138/88',
    measure_date: '2026-08-12',
    date_processed: new Date('2026-08-17T10:15:00Z'),
    processed_by: 'User',
    processing_status: 'Success',
    confidence_score: 96.5,
    error_message: null,
    patient_age: 54,
    raw_extracted_json: { source: 'seed', measure: 'Blood Pressure: 138/88 mmHg' },
    retry_count: 0,
    created_at: new Date('2026-08-17T10:15:00Z'),
    updated_at: new Date('2026-08-17T10:15:00Z'),
  });

  inMemoryStore.set('1002', {
    document_id: '1002',
    file_name: 'patient_1002_lab_report.pdf',
    file_type: 'PDF',
    document_type: 'A1C',
    measure_extracted: '7.4% (Diabetes)',
    measure_date: '2026-07-30',
    date_processed: new Date('2026-08-17T11:30:00Z'),
    processed_by: 'User',
    processing_status: 'Success',
    confidence_score: 94.0,
    error_message: null,
    patient_age: 62,
    raw_extracted_json: { source: 'seed', measure: 'Hemoglobin A1c: 7.4%' },
    retry_count: 0,
    created_at: new Date('2026-08-17T11:30:00Z'),
    updated_at: new Date('2026-08-17T11:30:00Z'),
  });
}


export async function saveDocument(record: ClinicalDocumentDbRow): Promise<ClinicalDocumentDbRow> {
  const health = await testConnection();

  if (health.isHealthy) {
    const pool = getPool();
    const query = `
      INSERT INTO clinical_documents (
        document_id, file_name, file_type, document_type, measure_extracted,
        measure_date, date_processed, processed_by, processing_status,
        confidence_score, error_message, patient_age, file_url, blob_name,
        raw_extracted_json, retry_count
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (document_id) DO UPDATE SET
        document_type = EXCLUDED.document_type,
        measure_extracted = EXCLUDED.measure_extracted,
        measure_date = EXCLUDED.measure_date,
        processing_status = EXCLUDED.processing_status,
        confidence_score = EXCLUDED.confidence_score,
        error_message = EXCLUDED.error_message,
        patient_age = EXCLUDED.patient_age,
        file_url = COALESCE(EXCLUDED.file_url, clinical_documents.file_url),
        blob_name = COALESCE(EXCLUDED.blob_name, clinical_documents.blob_name),
        raw_extracted_json = EXCLUDED.raw_extracted_json,
        retry_count = clinical_documents.retry_count + 1,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;

    const values = [
      record.document_id,
      record.file_name,
      record.file_type,
      record.document_type,
      record.measure_extracted,
      record.measure_date,
      record.date_processed,
      record.processed_by,
      record.processing_status,
      record.confidence_score,
      record.error_message,
      record.patient_age,
      record.file_url ?? null,
      record.blob_name ?? null,
      typeof record.raw_extracted_json === 'object'
        ? JSON.stringify(record.raw_extracted_json)
        : record.raw_extracted_json,
      record.retry_count,
    ];

    const result = await pool.query(query, values);
    const row = result.rows[0];
    if (!row) throw new Error('Failed to save document to PostgreSQL');
    return row as unknown as ClinicalDocumentDbRow;
  }

  const existing = inMemoryStore.get(record.document_id);
  const updatedRecord: ClinicalDocumentDbRow = {
    ...record,
    retry_count: existing ? existing.retry_count + 1 : record.retry_count,
    updated_at: new Date(),
  };
  inMemoryStore.set(record.document_id, updatedRecord);
  return updatedRecord;
}

export async function getDocumentById(documentId: string): Promise<ClinicalDocumentDbRow | null> {
  const health = await testConnection();

  if (health.isHealthy) {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM clinical_documents WHERE document_id = $1', [documentId]);
    const row = result.rows[0];
    return row ? (row as unknown as ClinicalDocumentDbRow) : null;
  }

  return inMemoryStore.get(documentId) ?? null;
}

export async function listDocuments(filter?: DocumentQueryFilter): Promise<readonly ClinicalDocumentDbRow[]> {
  const health = await testConnection();

  if (health.isHealthy) {
    const pool = getPool();
    const conditions: string[] = [];
    const values: string[] = [];
    let paramIndex = 1;

    if (filter?.status) {
      conditions.push(`processing_status = $${paramIndex++}`);
      values.push(filter.status);
    }
    if (filter?.documentType) {
      conditions.push(`document_type = $${paramIndex++}`);
      values.push(filter.documentType);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `SELECT * FROM clinical_documents ${whereClause} ORDER BY date_processed DESC`;

    const result = await pool.query(query, values);
    return result.rows as unknown as readonly ClinicalDocumentDbRow[];
  }

  let docs = Array.from(inMemoryStore.values());
  if (filter?.status) {
    docs = docs.filter((d) => d.processing_status === filter.status);
  }
  if (filter?.documentType) {
    docs = docs.filter((d) => d.document_type === filter.documentType);
  }
  return docs.sort((a, b) => b.date_processed.getTime() - a.date_processed.getTime());
}


export async function findDocumentByBlobName(blobName: string): Promise<ClinicalDocumentDbRow | null> {
  const health = await testConnection();

  if (health.isHealthy) {
    const pool = getPool();
    const result = await pool.query(
      'SELECT * FROM clinical_documents WHERE blob_name = $1 OR file_name = $1 ORDER BY created_at DESC LIMIT 1',
      [blobName]
    );
    const row = result.rows[0];
    return row ? (row as unknown as ClinicalDocumentDbRow) : null;
  }

  for (const doc of inMemoryStore.values()) {
    if (doc.blob_name === blobName || doc.file_name === blobName) return doc;
  }
  return null;
}

export async function claimDocumentForProcessing(
  documentId: string,
  callerName: string = 'logic-app-orchestrator'
): Promise<ClinicalDocumentDbRow | null> {
  const health = await testConnection();

  if (health.isHealthy) {
    const pool = getPool();
    const query = `
      UPDATE clinical_documents
      SET processed_by = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE document_id = $1
      RETURNING *;
    `;
    const result = await pool.query(query, [documentId, callerName]);
    const row = result.rows[0];
    return row ? (row as unknown as ClinicalDocumentDbRow) : null;
  }

  const existing = inMemoryStore.get(documentId);
  if (existing) {
    const updated: ClinicalDocumentDbRow = {
      ...existing,
      processed_by: callerName,
      updated_at: new Date(),
    };
    inMemoryStore.set(documentId, updated);
    return updated;
  }
  return null;
}

export function clearInMemoryStore(): void {
  inMemoryStore.clear();
}

