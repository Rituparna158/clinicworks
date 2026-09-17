import { beforeEach, describe, expect, it } from 'vitest';
import { clearInMemoryStore, initializeDatabase, saveDocument } from '../src/database/documentRepository.js';
import type { ClinicalDocumentDbRow } from '../src/types/database.types.js';

describe('API Endpoints & Controllers Unit Tests', () => {
  beforeEach(async () => {
    clearInMemoryStore();
    await initializeDatabase();
  });

  it('verifies initial seeded documents are available for dashboard', async () => {
    const { listDocuments } = await import('../src/database/documentRepository.js');
    const docs = await listDocuments();
    expect(docs.length).toBeGreaterThanOrEqual(2);

    const doc1001 = docs.find((d) => d.document_id === '1001');
    expect(doc1001).toBeDefined();
    expect(doc1001?.document_type).toBe('BP');
    expect(doc1001?.measure_extracted).toBe('138/88');
    expect(doc1001?.processing_status).toBe('Success');
  });

  it('validates retry action increments retry count and maintains history', async () => {
    const testDoc: ClinicalDocumentDbRow = {
      document_id: 'DOC-API-RETRY-01',
      file_name: 'test_doc.pdf',
      file_type: 'PDF',
      document_type: 'BP',
      measure_extracted: null,
      measure_date: null,
      date_processed: new Date(),
      processed_by: 'User',
      processing_status: 'Failed',
      confidence_score: 25.0,
      error_message: 'Initial parser failure',
      patient_age: null,
      raw_extracted_json: null,
      retry_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
    };

    await saveDocument(testDoc);

    const retriedDoc: ClinicalDocumentDbRow = {
      ...testDoc,
      measure_extracted: '140/90',
      processing_status: 'Success',
      confidence_score: 92.0,
      error_message: null,
    };

    const saved = await saveDocument(retriedDoc);
    expect(saved.retry_count).toBe(1);
    expect(saved.processing_status).toBe('Success');
    expect(saved.measure_extracted).toBe('140/90');
  });

  it('filters documents by document_type (BP vs A1C)', async () => {
    const { listDocuments } = await import('../src/database/documentRepository.js');
    const bpDocs = await listDocuments({ documentType: 'BP' });
    expect(bpDocs.every((d) => d.document_type === 'BP')).toBe(true);

    const a1cDocs = await listDocuments({ documentType: 'A1C' });
    expect(a1cDocs.every((d) => d.document_type === 'A1C')).toBe(true);
  });
});
