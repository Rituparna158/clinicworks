import React, { useCallback, useEffect, useState } from 'react';
import './App.css';
import { AuditModal } from './components/AuditModal.js';
import { DocumentsTable } from './components/DocumentsTable.js';
import { FlowBanner } from './components/FlowBanner.js';
import { Header } from './components/Header.js';
import { UploadCard } from './components/UploadCard.js';
import {
  fetchDocuments,
  fetchHealth,
  retryDocument,
  uploadDocument,
  type ClinicalDocument,
  type HealthStatus,
} from './services/api.js';

export const App: React.FC = () => {
  const [documents, setDocuments] = useState<ClinicalDocument[]>([]);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<ClinicalDocument | null>(null);

  const loadDocuments = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const data = await fetchDocuments(statusFilter, typeFilter);
      setDocuments(data);
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [statusFilter, typeFilter]);

  const loadHealth = useCallback(async () => {
    try {
      const data = await fetchHealth();
      setHealth(data);
    } catch {
      setHealth(null);
    }
  }, []);

  useEffect(() => {
    loadHealth();
    loadDocuments();
  }, [loadHealth, loadDocuments]);

  const handleProcessFile = async (file: File, submittedBy: string): Promise<ClinicalDocument> => {
    const doc = await uploadDocument(file, submittedBy);
    // Refresh table after upload
    await loadDocuments();
    return doc;
  };

  const handleRetry = async (documentId: string): Promise<void> => {
    await retryDocument(documentId);
    await loadDocuments();
  };

  return (
    <>
      <Header health={health} onRefresh={loadDocuments} isRefreshing={isRefreshing} />
      <FlowBanner />

      <main className="main-container">
        <UploadCard
          onProcessFile={handleProcessFile}
          onDocumentProcessed={() => loadDocuments()}
        />

        <DocumentsTable
          documents={documents}
          onRetry={handleRetry}
          onSelectDocument={(doc) => setSelectedDoc(doc)}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
        />
      </main>

      <AuditModal doc={selectedDoc} onClose={() => setSelectedDoc(null)} />

      <footer className="footer">
        <p>ClinicWorks Healthcare Document Processing Platform &bull; Built on Azure &amp; Google Gemini Multimodal AI</p>
      </footer>
    </>
  );
};

export default App;
