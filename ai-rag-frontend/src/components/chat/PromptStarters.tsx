import React from 'react';
import { Sparkles, FileSearch, Lightbulb, ListChecks, HelpCircle } from 'lucide-react';

interface PromptStartersProps {
  onSelectPrompt: (promptText: string) => void;
  selectedDocName?: string;
}

export const PromptStarters: React.FC<PromptStartersProps> = ({ onSelectPrompt, selectedDocName }) => {
  const starters = [
    {
      icon: <Sparkles className="w-5 h-5 text-brand-400" />,
      title: 'Summarize Document',
      prompt: `Please summarize the key takeaways and main arguments from ${selectedDocName || 'the uploaded document'}.`,
    },
    {
      icon: <Lightbulb className="w-5 h-5 text-amber-400" />,
      title: 'Extract Core Concepts',
      prompt: `What are the primary concepts, definitions, and theories highlighted in ${selectedDocName || 'the document'}?`,
    },
    {
      icon: <ListChecks className="w-5 h-5 text-emerald-400" />,
      title: 'Key Findings & Conclusions',
      prompt: `List the major findings, statistics, or conclusions presented in ${selectedDocName || 'this file'}.`,
    },
    {
      icon: <HelpCircle className="w-5 h-5 text-accent-cyan" />,
      title: 'Ask Specific Questions',
      prompt: `What recommendations or next steps are suggested according to ${selectedDocName || 'the text'}?`,
    },
  ];

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 text-center animate-fade-in">
      <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-300 mb-4 shadow-glow-indigo">
        <FileSearch className="w-8 h-8" />
      </div>
      <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
        Ask Questions About {selectedDocName ? `"${selectedDocName}"` : 'Your PDF Vault'}
      </h2>
      <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-md mx-auto">
        Powered by Gemini 1.5 Pro with vector context retrieval. Choose a starter prompt below or type your own question.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-6 text-left">
        {starters.map((item, idx) => (
          <button
            key={idx}
            onClick={() => onSelectPrompt(item.prompt)}
            className="p-4 rounded-2xl glass-panel border border-slate-800/80 hover:border-brand-500/40 hover:bg-slate-900/80 transition-all duration-200 group text-left"
          >
            <div className="flex items-center gap-3 mb-1.5">
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 group-hover:scale-105 transition-transform">
                {item.icon}
              </div>
              <h4 className="text-xs font-bold text-white group-hover:text-brand-300 transition-colors">
                {item.title}
              </h4>
            </div>
            <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
              "{item.prompt}"
            </p>
          </button>
        ))}
      </div>
    </div>
  );
};
