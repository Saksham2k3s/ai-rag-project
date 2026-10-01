import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PDFDocument } from '../../types';
import { formatBytes, formatDate } from '../../utils/formatters';
import { FileText, Trash2, MessageSquare, Layers, Clock, CheckCircle2, AlertTriangle, X } from 'lucide-react';

interface DocumentListProps {
  onAskQuestion: (docId: string) => void;
}

export const DocumentList: React.FC<DocumentListProps> = ({ onAskQuestion }) => {
  const { documents, selectedDocumentId, setSelectedDocumentId, deleteDocument, isLoadingDocuments } = useApp();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState<PDFDocument | null>(null);

  const handleDelete = async () => {
    if (!confirmDeleteDoc) return;
    setDeletingId(confirmDeleteDoc.id);
    await deleteDocument(confirmDeleteDoc.id);
    setDeletingId(null);
    setConfirmDeleteDoc(null);
  };

  if (isLoadingDocuments) {
    return (
      <div className="py-12 text-center">
        <div className="w-8 h-8 mx-auto border-3 border-brand-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs text-slate-400 font-medium">Loading vector documents...</p>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="py-12 px-4 text-center glass-panel rounded-3xl border border-slate-800/80">
        <FileText className="w-12 h-12 mx-auto text-slate-600 mb-3" />
        <h3 className="text-base font-bold text-white">No PDF Documents Uploaded</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
          Upload your first PDF above to enable AI RAG context retrieval and ask deep questions about your documents!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <Layers className="w-4 h-4 text-brand-400" /> Uploaded Document Vault ({documents.length})
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {documents.map((doc) => {
          const isSelected = selectedDocumentId === doc.id;

          return (
            <div
              key={doc.id}
              className={`glass-panel p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between group ${
                isSelected
                  ? 'border-brand-500/60 bg-slate-900/90 shadow-glow-indigo'
                  : 'border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/60'
              }`}
            >
              <div>
                {/* Header info */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white line-clamp-1 group-hover:text-brand-300 transition-colors">
                        {doc.filename}
                      </h4>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                        <span>{formatBytes(doc.size)}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" /> {formatDate(doc.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setConfirmDeleteDoc(doc)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete document"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Vector Chunks Badge */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-semibold">
                    <Layers className="w-3.5 h-3.5 text-brand-400" /> {doc.totalChunks} Chunks Vectorized
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] font-medium">
                    <CheckCircle2 className="w-3 h-3" /> Ready
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-3 border-t border-slate-800/80">
                <button
                  onClick={() => {
                    setSelectedDocumentId(isSelected ? undefined : doc.id);
                  }}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-brand-600 text-white shadow-md'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/50'
                  }`}
                >
                  {isSelected ? '✓ Selected for RAG' : 'Select Target Scope'}
                </button>

                <button
                  onClick={() => onAskQuestion(doc.id)}
                  className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-brand-300 hover:text-white border border-slate-700/60 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5" /> Ask AI
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDeleteDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel p-6 rounded-3xl max-w-sm w-full border border-slate-700 shadow-glass space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white">Delete PDF Document</h3>
              </div>
              <button
                onClick={() => setConfirmDeleteDoc(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to delete <span className="font-bold text-white">"{confirmDeleteDoc.filename}"</span>?
              This will remove all associated vector embeddings from Qdrant.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmDeleteDoc(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={!!deletingId}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 transition-all flex items-center gap-2"
              >
                {deletingId ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" /> Delete Permanently
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
