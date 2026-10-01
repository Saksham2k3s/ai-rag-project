import React from 'react';
import { useApp } from '../../context/AppContext';
import { MessageSquarePlus, MessageSquare, FileText, ChevronRight, Sparkles, CheckCircle, Database } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onCloseMobile }) => {
  const {
    conversations,
    currentConversationId,
    selectConversation,
    startNewChat,
    documents,
    selectedDocumentId,
    setSelectedDocumentId,
  } = useApp();

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-72 glass-panel border-r border-slate-800/80 flex flex-col justify-between transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-4 flex-1 flex flex-col overflow-hidden">
          {/* New Chat Button */}
          <button
            onClick={() => {
              startNewChat();
              onCloseMobile();
            }}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-brand-600 to-accent-violet hover:from-brand-500 hover:to-accent-violet text-white font-semibold shadow-glow-indigo transition-all duration-200 flex items-center justify-center gap-2.5 mb-6 group"
          >
            <MessageSquarePlus className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span>Start New Chat</span>
          </button>

          {/* Conversations Section Header */}
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 mb-3">
            <span>Recent Conversations</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-slate-300">
              {conversations.length}
            </span>
          </div>

          {/* Conversations History List */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {conversations.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs rounded-xl bg-slate-900/40 border border-slate-800/60">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-600 opacity-60" />
                No conversations yet. Ask your first PDF question!
              </div>
            ) : (
              conversations.map((conv) => {
                const isActive = conv.id === currentConversationId;
                const title = conv.title || 'Untitled Conversation';
                const dateStr = new Date(conv.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                });

                return (
                  <button
                    key={conv.id}
                    onClick={() => {
                      selectConversation(conv.id);
                      onCloseMobile();
                    }}
                    className={`w-full text-left p-3 rounded-xl transition-all duration-200 flex items-center justify-between group ${
                      isActive
                        ? 'bg-brand-600/20 border border-brand-500/40 text-brand-200 shadow-sm'
                        : 'hover:bg-slate-800/60 text-slate-300 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <MessageSquare className={`w-4 h-4 shrink-0 ${isActive ? 'text-brand-400' : 'text-slate-400'}`} />
                      <div className="truncate">
                        <p className="text-xs font-medium truncate">{title}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{dateStr}</p>
                      </div>
                    </div>
                    {isActive && <ChevronRight className="w-3.5 h-3.5 text-brand-400 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>

          {/* Quick PDF Document Scope Target Selector */}
          <div className="mt-4 pt-4 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 mb-2">
              <span className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-brand-400" /> Document Filter
              </span>
            </div>

            <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
              <button
                onClick={() => setSelectedDocumentId(undefined)}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                  selectedDocumentId === undefined
                    ? 'bg-slate-800 text-brand-300 font-semibold border border-brand-500/30'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                }`}
              >
                <span className="truncate">All Documents ({documents.length})</span>
                {selectedDocumentId === undefined && <CheckCircle className="w-3.5 h-3.5 text-brand-400" />}
              </button>

              {documents.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => setSelectedDocumentId(doc.id)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                    selectedDocumentId === doc.id
                      ? 'bg-slate-800 text-brand-300 font-semibold border border-brand-500/30'
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                    <span className="truncate">{doc.filename}</span>
                  </div>
                  {selectedDocumentId === doc.id && <CheckCircle className="w-3.5 h-3.5 text-brand-400 shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
