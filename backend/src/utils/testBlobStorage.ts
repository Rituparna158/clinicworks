import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { BlobServiceClient } from '@azure/storage-blob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, '../../..');
dotenv.config({ path: path.join(workspaceRoot, '.env') });
dotenv.config();

async function testBlob(): Promise<void> {
  const connectionString = process.env['AZURE_STORAGE_CONNECTION_STRING'];
  const containerName = process.env['AZURE_STORAGE_CONTAINER_NAME'] ?? 'clinical-documents';

  console.log('Testing Azure Blob Storage...');
  console.log('Container:', containerName);

  if (!connectionString) {
    throw new Error('AZURE_STORAGE_CONNECTION_STRING is not set');
  }

  const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  const containerClient = blobServiceClient.getContainerClient(containerName);

  const exists = await containerClient.exists();
  console.log(`Container "${containerName}" exists:`, exists);

  if (!exists) {
    console.log(`Creating container "${containerName}"...`);
    await containerClient.create();
    console.log('Container created!');
  }

  // Upload test blob
  const testBlobName = `test-${Date.now()}.txt`;
  const blockBlobClient = containerClient.getBlockBlobClient(testBlobName);
  const data = 'Hello ClinicWorks Azure Blob Storage!';
  await blockBlobClient.upload(data, data.length);
  console.log(`Test blob uploaded successfully: ${blockBlobClient.url}`);

  // Delete test blob
  await blockBlobClient.delete();
  console.log('Test blob cleaned up.');
  console.log(' Azure Blob Storage test succeeded with 100% success!');
}

testBlob().catch((err) => {
  console.error('Blob test failed:', err);
  process.exit(1);
});
