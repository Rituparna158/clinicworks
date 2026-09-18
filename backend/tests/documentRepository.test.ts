import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearInMemoryStore,
  getDocumentById,
  initializeDatabase,
  listDocuments,
  saveDocument,
} from '../src/database/documentRepository.js';
import type { ClinicalDocumentDbRow } from '../src/types/database.types.js';

describe('Document Repository', () => {
  beforeEach(() => {
    clearInMemoryStore();
  });

  it('initializes repository and seeds initial records in fallback mode', async () => {
    await initializeDatabase();
    const docs = await listDocuments();
    expect(docs.length).toBeGreaterThanOrEqual(2);

    const doc1001 = await getDocumentById('1001');
    expect(doc1001).not.toBeNull();
    expect(doc1001?.document_type).toBe('BP');
    expect(doc1001?.measure_extracted).toBe('138/88');
  });

  it('saves and retrieves a new clinical document', async () => {
    const newDoc: ClinicalDocumentDbRow = {
      document_id: 'DOC-TEST-001',
      file_name: 'test_patient_bp.pdf',
      file_type: 'PDF',
      document_type: 'BP',
      measure_extracted: '124/82',
      measure_date: '2026-08-14',
      date_processed: new Date(),
      processed_by: 'TestUser',
      processing_status: 'Success',
      confidence_score: 95.0,
      error_message: null,
      patient_age: 48,
      raw_extracted_json: { test: true },
      retry_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const saved = await saveDocument(newDoc);
    expect(saved.document_id).toBe('DOC-TEST-001');

    const fetched = await getDocumentById('DOC-TEST-001');
    expect(fetched).not.toBeNull();
    expect(fetched?.measure_extracted).toBe('124/82');
    expect(fetched?.processing_status).toBe('Success');
  });

  it('increments retry count on re-saving an existing document', async () => {
    const doc: ClinicalDocumentDbRow = {
      document_id: 'DOC-RETRY-001',
      file_name: 'retry_sample.pdf',
      file_type: 'PDF',
      document_type: 'BP',
      measure_extracted: null,
      measure_date: null,
      date_processed: new Date(),
      processed_by: 'User',
      processing_status: 'Failed',
      confidence_score: 20.0,
      error_message: 'Temporary network failure',
      patient_age: null,
      raw_extracted_json: null,
      retry_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
    };

    await saveDocument(doc);

    // Retry / update
    const retriedDoc: ClinicalDocumentDbRow = {
      ...doc,
      measure_extracted: '130/84',
      processing_status: 'Success',
      confidence_score: 91.0,
      error_message: null,
    };

    const updated = await saveDocument(retriedDoc);
    expect(updated.processing_status).toBe('Success');
    expect(updated.retry_count).toBe(1);
  });

  it('filters documents by processing status', async () => {
    await saveDocument({
      document_id: 'D-SUCCESS',
      file_name: 's.pdf',
      file_type: 'PDF',
      document_type: 'BP',
      measure_extracted: '120/80',
      measure_date: '2026-08-10',
      date_processed: new Date(),
      processed_by: 'User',
      processing_status: 'Success',
      confidence_score: 95,
      error_message: null,
      patient_age: 30,
      raw_extracted_json: null,
      retry_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
    });

    await saveDocument({
      document_id: 'D-REVIEW',
      file_name: 'r.pdf',
      file_type: 'PDF',
      document_type: 'BP',
      measure_extracted: null,
      measure_date: null,
      date_processed: new Date(),
      processed_by: 'User',
      processing_status: 'Needs Review',
      confidence_score: 40,
      error_message: 'Patient under 18',
      patient_age: 14,
      raw_extracted_json: null,
      retry_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
    });

    const successList = await listDocuments({ status: 'Success' });
    expect(successList.every((d) => d.processing_status === 'Success')).toBe(true);

    const reviewList = await listDocuments({ status: 'Needs Review' });
    expect(reviewList.every((d) => d.processing_status === 'Needs Review')).toBe(true);
  });
});
