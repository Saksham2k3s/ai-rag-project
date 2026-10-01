import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { PDFDocument, Conversation, Message } from '../types';
import {
  getDocumentsApi,
  uploadDocumentApi,
  deleteDocumentApi,
  getConversationsApi,
  getConversationByIdApi,
  streamChatApi,
} from '../services/api';
import { useAuth } from './AuthContext';

export interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AppContextType {
  documents: PDFDocument[];
  selectedDocumentId: string | undefined;
  setSelectedDocumentId: (id: string | undefined) => void;
  isLoadingDocuments: boolean;
  isUploading: boolean;
  uploadProgress: number;

  conversations: Conversation[];
  currentConversationId: string | undefined;
  messages: Message[];
  isStreaming: boolean;
  isLoadingConversation: boolean;

  toasts: ToastItem[];
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;

  fetchDocuments: () => Promise<void>;
  uploadDocument: (file: File) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  
  fetchConversations: () => Promise<void>;
  selectConversation: (id: string | undefined) => Promise<void>;
  startNewChat: () => void;
  sendMessage: (text: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();

  // Document states
  const [documents, setDocuments] = useState<PDFDocument[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | undefined>(undefined);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Conversation & Chat states
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | undefined>(undefined);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);

  // Toast notifications
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Fetch Documents
  const fetchDocuments = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoadingDocuments(true);
    try {
      const docs = await getDocumentsApi();
      setDocuments(docs);
    } catch (err: any) {
      addToast(err.message || 'Failed to load documents', 'error');
    } finally {
      setIsLoadingDocuments(false);
    }
  }, [isAuthenticated, addToast]);

  // Fetch Conversations
  const fetchConversations = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const convs = await getConversationsApi();
      setConversations(convs);
    } catch (err: any) {
      console.error('Failed to load conversations', err);
    }
  }, [isAuthenticated]);

  // Load initial data on Auth change
  useEffect(() => {
    if (isAuthenticated) {
      fetchDocuments();
      fetchConversations();
    } else {
      setDocuments([]);
      setConversations([]);
      setMessages([]);
      setCurrentConversationId(undefined);
    }
  }, [isAuthenticated, fetchDocuments, fetchConversations]);

  // Upload Document
  const uploadDocument = async (file: File) => {
    if (!file || file.type !== 'application/pdf') {
      addToast('Please select a valid PDF document', 'error');
      return;
    }

    setIsUploading(true);
    setUploadProgress(20);

    try {
      const interval = setInterval(() => {
        setUploadProgress((prev) => (prev < 85 ? prev + 15 : prev));
      }, 300);

      const res = await uploadDocumentApi(file);

      clearInterval(interval);
      setUploadProgress(100);

      addToast(`"${file.name}" uploaded and processed into ${res.totalChunks} vectors!`, 'success');
      await fetchDocuments();
      
      // Auto-select uploaded document for focused RAG questions
      setSelectedDocumentId(res.documentId);
    } catch (err: any) {
      addToast(err.message || 'Failed to upload PDF', 'error');
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 500);
    }
  };

  // Delete Document
  const deleteDocument = async (id: string) => {
    try {
      await deleteDocumentApi(id);
      addToast('Document deleted successfully', 'success');
      if (selectedDocumentId === id) {
        setSelectedDocumentId(undefined);
      }
      await fetchDocuments();
    } catch (err: any) {
      addToast(err.message || 'Failed to delete document', 'error');
    }
  };

  // Select existing Conversation
  const selectConversation = async (id: string | undefined) => {
    if (!id) {
      startNewChat();
      return;
    }
    setCurrentConversationId(id);
    setIsLoadingConversation(true);
    try {
      const conv = await getConversationByIdApi(id);
      setMessages(conv.messages || []);
    } catch (err: any) {
      addToast(err.message || 'Failed to load conversation messages', 'error');
    } finally {
      setIsLoadingConversation(false);
    }
  };

  // Start New Chat
  const startNewChat = () => {
    setCurrentConversationId(undefined);
    setMessages([]);
  };

  // Send Message & handle SSE response streaming
  const sendMessage = async (text: string) => {
    if (!text.trim() || isStreaming) return;

    const userMsg: Message = {
      role: 'user',
      content: text.trim(),
      createdAt: new Date().toISOString(),
    };

    // Append user message immediately (optimistic UI update)
    setMessages((prev) => [...prev, userMsg]);
    setIsStreaming(true);

    // Create placeholder for assistant response
    const assistantMsgPlaceholder: Message = {
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, assistantMsgPlaceholder]);

    await streamChatApi(
      text,
      selectedDocumentId,
      currentConversationId,
      (chunkText) => {
        setMessages((prev) => {
          const updated = [...prev];
          const lastIndex = updated.length - 1;
          if (lastIndex >= 0 && updated[lastIndex].role === 'assistant') {
            updated[lastIndex] = {
              ...updated[lastIndex],
              content: updated[lastIndex].content + chunkText,
            };
          }
          return updated;
        });
      },
      async ({ conversationId }) => {
        setIsStreaming(false);
        if (!currentConversationId) {
          setCurrentConversationId(conversationId);
        }
        await fetchConversations();
      },
      (errorMsg) => {
        setIsStreaming(false);
        addToast(`Chat Error: ${errorMsg}`, 'error');
        // Remove empty placeholder message if no response arrived
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.role === 'assistant' && !last.content) {
            return prev.slice(0, -1);
          }
          return prev;
        });
      }
    );
  };

  return (
    <AppContext.Provider
      value={{
        documents,
        selectedDocumentId,
        setSelectedDocumentId,
        isLoadingDocuments,
        isUploading,
        uploadProgress,
        conversations,
        currentConversationId,
        messages,
        isStreaming,
        isLoadingConversation,
        toasts,
        addToast,
        removeToast,
        fetchDocuments,
        uploadDocument,
        deleteDocument,
        fetchConversations,
        selectConversation,
        startNewChat,
        sendMessage,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
