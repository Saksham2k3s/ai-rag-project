import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Send, FileText, Sparkles, X, CornerDownLeft } from 'lucide-react';

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled }) => {
  const { documents, selectedDocumentId, setSelectedDocumentId } = useApp();
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const selectedDoc = documents.find((d) => d.id === selectedDocumentId);

  // Auto resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || disabled) return;
    onSend(input);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="relative max-w-4xl mx-auto w-full px-4 pb-4">
      {/* Target Document scope chip above input */}
      {selectedDoc && (
        <div className="inline-flex items-center gap-2 mb-2 px-3 py-1 rounded-xl bg-brand-500/10 border border-brand-500/30 text-xs font-semibold text-brand-300 animate-fade-in">
          <FileText className="w-3.5 h-3.5 text-brand-400 shrink-0" />
          <span className="truncate max-w-xs">Target PDF: {selectedDoc.filename}</span>
          <button
            onClick={() => setSelectedDocumentId(undefined)}
            className="p-0.5 rounded-full hover:bg-brand-500/20 text-brand-400 hover:text-white transition-colors"
            title="Clear target filter (Search all documents)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Input container */}
      <form
        onSubmit={handleSubmit}
        className="relative glass-panel rounded-2xl p-2 border border-slate-700/80 focus-within:border-brand-500/60 focus-within:shadow-glow-indigo transition-all duration-200"
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            selectedDoc
              ? `Ask a question about "${selectedDoc.filename}"...`
              : 'Ask any question across all your uploaded PDFs...'
          }
          disabled={disabled}
          rows={1}
          className="w-full bg-transparent px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 resize-none outline-none font-medium max-h-40"
        />

        <div className="flex items-center justify-between pt-1 px-2">
          <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1 hidden sm:flex">
            <CornerDownLeft className="w-3 h-3 text-slate-600" /> Press <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">Enter</kbd> to send, <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">Shift+Enter</kbd> for line break
          </span>

          <button
            type="submit"
            disabled={!input.trim() || disabled}
            className="ml-auto py-2 px-4 rounded-xl bg-gradient-to-r from-brand-600 to-accent-violet hover:from-brand-500 hover:to-accent-violet text-white font-semibold text-xs shadow-glow-indigo transition-all duration-200 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
          >
            {disabled ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Send</span>
                <Send className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
