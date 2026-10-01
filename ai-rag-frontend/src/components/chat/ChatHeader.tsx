import React from 'react';
import { useApp } from '../../context/AppContext';
import { Bot, Sparkles, FileText, Layers, PlusCircle } from 'lucide-react';

export const ChatHeader: React.FC = () => {
  const { conversations, currentConversationId, startNewChat, documents, selectedDocumentId } = useApp();

  const activeConv = conversations.find((c) => c.id === currentConversationId);
  const selectedDoc = documents.find((d) => d.id === selectedDocumentId);

  return (
    <div className="px-6 py-3.5 border-b border-slate-800/80 glass-panel flex items-center justify-between backdrop-blur-md">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400">
          <Bot className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            {activeConv?.title || 'New AI RAG Chat'}
          </h2>
          <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
            <Sparkles className="w-3 h-3 text-brand-400" />
            Context Scope:{' '}
            {selectedDoc ? (
              <span className="text-brand-300 font-semibold">{selectedDoc.filename}</span>
            ) : (
              <span className="text-slate-300 font-medium">Global Search ({documents.length} PDFs)</span>
            )}
          </p>
        </div>
      </div>

      <button
        onClick={startNewChat}
        className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 text-xs font-semibold flex items-center gap-1.5 transition-colors"
      >
        <PlusCircle className="w-4 h-4 text-brand-400" />
        <span className="hidden sm:inline">New Chat</span>
      </button>
    </div>
  );
};
