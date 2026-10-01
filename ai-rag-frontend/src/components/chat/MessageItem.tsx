import React, { useState } from 'react';
import { Message } from '../../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, User as UserIcon, Copy, Check, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface MessageItemProps {
  message: Message;
  isLast: boolean;
  isStreaming: boolean;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message, isLast, isStreaming }) => {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex gap-3 sm:gap-4 p-4 sm:p-5 rounded-2xl transition-all ${
      isUser
        ? 'bg-slate-900/50 border border-slate-800/50 ml-6 sm:ml-12'
        : 'glass-panel border border-slate-800/80 mr-4 sm:mr-8 shadow-glass'
    }`}>
      {/* Avatar */}
      <div className="shrink-0">
        {isUser ? (
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 flex items-center justify-center text-xs font-bold text-white shadow-sm">
            {user?.email?.[0]?.toUpperCase() || <UserIcon className="w-4 h-4 text-slate-300" />}
          </div>
        ) : (
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-accent-violet border border-indigo-400/30 flex items-center justify-center shadow-glow-indigo">
            <Bot className="w-4.5 h-4.5 text-white" />
          </div>
        )}
      </div>

      {/* Message Content */}
      <div className="flex-1 overflow-hidden">
        {/* Header Name & Copy button */}
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-bold tracking-wide flex items-center gap-1.5 text-slate-300">
            {isUser ? 'You' : 'CogniRAG AI'}
            {!isUser && <Sparkles className="w-3 h-3 text-brand-400" />}
          </span>

          {!isUser && message.content && (
            <button
              onClick={handleCopy}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors text-xs flex items-center gap-1"
              title="Copy answer text"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[10px] text-emerald-400 font-semibold">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span className="text-[10px] text-slate-400">Copy</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Text Body */}
        <div className={`prose prose-invert max-w-none text-xs sm:text-sm leading-relaxed text-slate-200 ${
          !isUser && isLast && isStreaming ? 'typing-cursor' : ''
        }`}>
          {message.content ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          ) : (
            <div className="flex items-center gap-2 text-slate-400 italic text-xs py-1">
              <div className="w-2 h-2 rounded-full bg-brand-400 animate-ping" />
              Retrieving relevant PDF vector chunks & synthesizing response...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
