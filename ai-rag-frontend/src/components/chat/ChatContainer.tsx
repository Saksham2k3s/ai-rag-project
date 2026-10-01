import React, { useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { ChatHeader } from './ChatHeader';
import { MessageItem } from './MessageItem';
import { ChatInput } from './ChatInput';
import { PromptStarters } from './PromptStarters';
import { Loader2 } from 'lucide-react';

export const ChatContainer: React.FC = () => {
  const {
    messages,
    sendMessage,
    isStreaming,
    isLoadingConversation,
    documents,
    selectedDocumentId,
  } = useApp();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedDoc = documents.find((d) => d.id === selectedDocumentId);

  // Auto scroll to bottom when messages update
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

  return (
    <div className="flex-1 flex flex-col h-full max-h-[calc(100vh-4rem)] overflow-hidden">
      {/* Header */}
      <ChatHeader />

      {/* Main Messages scroll area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {isLoadingConversation ? (
          <div className="h-full flex items-center justify-center flex-col text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
            <p className="text-xs font-medium">Loading chat history...</p>
          </div>
        ) : messages.length === 0 ? (
          <PromptStarters
            onSelectPrompt={(text) => sendMessage(text)}
            selectedDocName={selectedDoc?.filename}
          />
        ) : (
          <div className="max-w-4xl mx-auto space-y-4">
            {messages.map((msg, index) => (
              <MessageItem
                key={index}
                message={msg}
                isLast={index === messages.length - 1}
                isStreaming={isStreaming}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input section */}
      <ChatInput onSend={(text) => sendMessage(text)} disabled={isStreaming} />
    </div>
  );
};
