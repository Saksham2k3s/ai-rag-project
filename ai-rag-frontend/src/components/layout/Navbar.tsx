import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { Bot, LogOut, FileText, Sparkles, Layers, User as UserIcon, Menu } from 'lucide-react';

interface NavbarProps {
  activeTab: 'chat' | 'documents';
  setActiveTab: (tab: 'chat' | 'documents') => void;
  toggleSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, toggleSidebar }) => {
  const { user, logout } = useAuth();
  const { documents, selectedDocumentId } = useApp();

  const selectedDoc = documents.find((d) => d.id === selectedDocumentId);

  return (
    <header className="sticky top-0 z-30 h-16 glass-panel border-b border-slate-800/80 px-4 lg:px-8 flex items-center justify-between backdrop-blur-xl">
      {/* Left side logo & hamburger */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-xl hover:bg-slate-800/80 text-slate-400 hover:text-white transition-colors md:hidden"
          title="Toggle Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-brand-600 to-accent-violet shadow-glow-indigo">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-extrabold tracking-tight text-white flex items-center gap-1">
              Cogni<span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-accent-cyan">RAG</span>
            </span>
          </div>
        </div>

        {/* Selected target doc indicator pill */}
        <div className="hidden sm:flex items-center gap-2 ml-4 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-xs text-slate-300">
          <Sparkles className="w-3.5 h-3.5 text-brand-400" />
          <span className="text-slate-500">Target Scope:</span>
          {selectedDoc ? (
            <span className="font-semibold text-brand-300 truncate max-w-[150px]">
              {selectedDoc.filename}
            </span>
          ) : (
            <span className="font-medium text-slate-400">All PDF Vault ({documents.length})</span>
          )}
        </div>
      </div>

      {/* Center Nav tabs */}
      <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-800">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'chat'
              ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI Chat</span>
        </button>
        <button
          onClick={() => setActiveTab('documents')}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'documents'
              ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Documents</span>
          {documents.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-slate-800 text-[10px] text-brand-300">
              {documents.length}
            </span>
          )}
        </button>
      </div>

      {/* Right User profile & Logout */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-brand-500 to-accent-violet flex items-center justify-center text-[10px] font-bold text-white">
            {user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <span className="text-xs font-medium text-slate-300 max-w-[140px] truncate">
            {user?.email}
          </span>
        </div>

        <button
          onClick={logout}
          className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors border border-transparent hover:border-rose-500/20"
          title="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
