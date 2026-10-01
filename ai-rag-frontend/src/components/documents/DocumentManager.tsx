import React from 'react';
import { PdfUploader } from './PdfUploader';
import { DocumentList } from './DocumentList';
import { Database, ShieldCheck, Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface DocumentManagerProps {
  onSwitchToChat: () => void;
}

export const DocumentManager: React.FC<DocumentManagerProps> = ({ onSwitchToChat }) => {
  const { setSelectedDocumentId } = useApp();

  const handleAskQuestionOnDoc = (docId: string) => {
    setSelectedDocumentId(docId);
    onSwitchToChat();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in py-4 px-2">
      {/* Vault Header Banner */}
      <div className="relative glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800/80 overflow-hidden shadow-glass">
        <div className="bg-glow-orb-1" />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-semibold mb-3">
              <Database className="w-3.5 h-3.5" /> Vector Knowledge Base
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              PDF Document Vault & Vectorizer
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Upload your documents to extract text, automatically chunk content, and generate high-dimensional embeddings stored in Qdrant vector database.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
              <ShieldCheck className="w-6 h-6 text-emerald-400 mx-auto mb-1" />
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Encrypted</span>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Zone */}
      <PdfUploader />

      {/* Document List */}
      <DocumentList onAskQuestion={handleAskQuestionOnDoc} />
    </div>
  );
};
