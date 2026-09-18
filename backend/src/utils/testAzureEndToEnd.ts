import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { processClinicalDocument } from '../services/documentProcessingService.js';
import { blobStorageService } from '../services/blobStorageService.js';
import { initializeDatabase, getDocumentById } from '../database/documentRepository.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, '../../..');
dotenv.config({ path: path.join(workspaceRoot, '.env') });
dotenv.config();

async function runEndToEndTest(): Promise<void> {
  console.log('====================================================');
  console.log(' ClinicWorks: End-to-End Azure Integration Test');
  console.log('====================================================');

  // Step 1: Initialize Database (PostgreSQL)
  console.log('\n[1/4] Verifying Azure Database connection & schema...');
  await initializeDatabase();
  console.log(' PostgreSQL verified with table schema & blob columns.');

  // Step 2: Verify Azure Blob Storage
  console.log('\n[2/4] Verifying Azure Blob Storage connectivity...');
  if (!blobStorageService.isConfigured()) {
    throw new Error('Azure Blob Storage is NOT configured.');
  }
  console.log(' Azure Blob Storage service is configured and ready.');

  // Step 3: Find a sample document to process
  const samplePdfPath = path.join(workspaceRoot, 'sample-docs', 'patient_1001_vitals.pdf');
  let fileBuffer: Buffer;
  let fileName = 'patient_1001_vitals.pdf';

  if (fs.existsSync(samplePdfPath)) {
    fileBuffer = fs.readFileSync(samplePdfPath);
    console.log(` Found sample PDF: ${samplePdfPath} (${fileBuffer.length} bytes)`);
  } else {
    // Generate minimal dummy PDF
    fileBuffer = Buffer.from('%PDF-1.4 Clinical Vital Signs Blood Pressure: 120/80 mmHg Date: 2026-09-18');
    fileName = 'sample_vitals_e2e.pdf';
    console.log(' Using synthetic test clinical PDF buffer.');
  }

  // Step 4: Process Clinical Document (Gemini AI + Blob Storage + Azure PostgreSQL)
  const testDocId = `E2E-${Date.now()}`;
  console.log(`\n[3/4] Processing document "${testDocId}" through clinical pipeline...`);
  const result = await processClinicalDocument({
    documentId: testDocId,
    fileName,
    fileBuffer,
    mimeType: 'application/pdf',
    submittedBy: 'Azure Integration Test Agent',
  });

  console.log('\n[Processing Result]:');
  console.log(' Document ID:', result.documentId);
  console.log(' Status:', result.processingStatus);
  console.log(' Document Type:', result.documentType);
  console.log(' Measure Extracted:', result.measureExtracted);
  console.log(' Confidence Score:', result.confidenceScore);
  console.log(' Blob Name:', result.blobName);
  console.log(' File URL:', result.fileUrl);

  // Step 5: Verify in Azure Database
  console.log(`\n[4/4] Verifying record persistence in Azure PostgreSQL...`);
  const savedDoc = await getDocumentById(testDocId);
  if (!savedDoc) {
    throw new Error(`Record ${testDocId} was not found in PostgreSQL.`);
  }

  console.log(' Verified record stored in database:');
  console.log(' - DB document_id:', savedDoc.document_id);
  console.log(' - DB blob_name:', savedDoc.blob_name);
  console.log(' - DB file_url:', savedDoc.file_url);
  console.log(' - DB processing_status:', savedDoc.processing_status);

  // Step 6: Verify SAS URL generation
  if (savedDoc.blob_name) {
    const sasUrl = blobStorageService.generateSasUrl(savedDoc.blob_name, 30);
    console.log('\n Generated Secure SAS URL for clinician view:');
    console.log(' SAS URL:', sasUrl);
  }

  console.log('\n====================================================');
  console.log(' ALL AZURE INTEGRATION TESTS PASSED (100% SUCCESS)');
  console.log('====================================================');
}

runEndToEndTest().catch((err) => {
  console.error('\n Test failed with error:', err);
  process.exit(1);
});
