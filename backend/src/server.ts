import cors from 'cors';
import dotenv from 'dotenv';
import express, { type Express } from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeDatabase } from './database/documentRepository.js';
import {
  handleGetDocumentFile,
  handleHealthCheck,
  handleListDocuments,
  handleProcessDocument,
  handleRetryDocument,
} from './functions/index.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backendRoot = path.resolve(__dirname, '..');
const workspaceRoot = path.resolve(__dirname, '../..');

// Load environment variables from workspace root or backend root
dotenv.config({ path: path.join(workspaceRoot, '.env') });
dotenv.config({ path: path.join(backendRoot, '.env') });
dotenv.config();

// Static directory resolution (supporting dev, monorepo build, and container environments)
const getStaticDir = (): string => {
  const possibleStaticDirs = [
    path.join(workspaceRoot, 'frontend', 'dist'),
    path.join(workspaceRoot, 'dist', 'frontend'),
    path.join(backendRoot, 'dist', 'frontend'),
    path.join(backendRoot, 'public'),
  ];

  return (
    possibleStaticDirs.find(
      (d) => fs.existsSync(d) && fs.existsSync(path.join(d, 'index.html'))
    ) ?? path.join(workspaceRoot, 'frontend', 'dist')
  );
};

// Sample documents directory resolution
const possibleSampleDocsDirs = [
  path.join(workspaceRoot, 'sample-docs'),
  path.join(backendRoot, 'sample-docs'),
];
const sampleDocsDir =
  possibleSampleDocsDirs.find((d) => fs.existsSync(d)) ?? path.join(workspaceRoot, 'sample-docs');

const app: Express = express();
const PORT = Number(process.env['PORT'] ?? 4000);

// Multer in-memory storage for handling document uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static assets (Vite React production build)
app.use((req, res, next) => {
  const currentStaticDir = getStaticDir();
  express.static(currentStaticDir)(req, res, next);
});

// Serve sample documents for quick-testing in dashboard
app.use('/sample-docs', express.static(sampleDocsDir));

app.post('/api/documents/process', upload.single('document'), handleProcessDocument);
app.post('/api/documents/:id/retry', handleRetryDocument);
app.get('/api/documents', handleListDocuments);
app.get('/api/documents/:id/file', handleGetDocumentFile);
app.get('/api/health', handleHealthCheck);

// Fallback to index.html for SPA routing
app.get('*', (_req, res) => {
  const currentStaticDir = getStaticDir();
  const indexPath = path.join(currentStaticDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('ClinicWorks Platform API is running. Frontend build missing at frontend/dist.');
  }
});

export async function startServer(initialPort = PORT): Promise<void> {
  await initializeDatabase();

  const tryListen = (portToTry: number): void => {
    const server = app.listen(portToTry, () => {
      console.log(`[ClinicWorks] Platform API & Web Dashboard running at: http://localhost:${portToTry}`);
      console.log(`[ClinicWorks] Health Check endpoint: http://localhost:${portToTry}/api/health`);
      console.log(`[ClinicWorks] Serving static frontend from: ${getStaticDir()}`);
    });

    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        const nextPort = portToTry + 1;
        console.warn(`[ClinicWorks] Port ${portToTry} is in use (e.g. by existing Docker container). Trying fallback port ${nextPort}...`);
        tryListen(nextPort);
      } else {
        console.error('[ClinicWorks] Fatal server error:', err);
        process.exit(1);
      }
    });
  };

  tryListen(initialPort);
}

// Auto-start when executed directly
if (process.argv[1]?.endsWith('server.ts') || process.argv[1]?.endsWith('server.js')) {
  startServer().catch((err) => {
    console.error('[Server] Fatal startup error:', err);
    process.exit(1);
  });
}

export default app;
