import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { PDFDocument, Conversation, Message } from '../types';
import {
  getDocumentsApi,
  getDocumentStatusApi,
  uploadDocumentApi,
  deleteDocumentApi,
  getConversationsApi,
  getConversationByIdApi,
  streamChatApi,
} from '../services/api';
import { useAuth } from './AuthContext';
import { formatUploadErrorMessage } from '../utils/formatters';

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
    setToasts((prev) => {
      // Prevent duplicate notification if the same message and type is already visible
      if (prev.some((t) => t.message === message && t.type === type)) {
        return prev;
      }
      const id = Math.random().toString(36).substring(2, 9);
      setTimeout(() => {
        setToasts((current) => current.filter((t) => t.id !== id));
      }, 4000);
      return [...prev, { id, message, type }];
    });
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

  // Compute key of currently processing documents to drive polling
  const processingDocIdsKey = documents
    .filter((doc) => doc.status === 'PROCESSING')
    .map((doc) => doc.id)
    .sort()
    .join(',');

  // Poll status endpoint every 2.5s for documents in PROCESSING state
  useEffect(() => {
    if (!isAuthenticated || !processingDocIdsKey) return;

    const docIds = processingDocIdsKey.split(',').filter(Boolean);
    if (docIds.length === 0) return;

    let isMounted = true;
    let timerId: NodeJS.Timeout | null = null;

    const pollProcessingDocs = async () => {
      try {
        const results = await Promise.all(
          docIds.map(async (id) => {
            try {
              return await getDocumentStatusApi(id);
            } catch (err) {
              // Network hiccup: keep state, don't crash
              return null;
            }
          })
        );

        if (!isMounted) return;

        setDocuments((prevDocs) => {
          let hasChanges = false;
          const nextDocs = prevDocs.map((doc) => {
            const res = results.find((r) => r && r.documentId === doc.id);
            if (!res) return doc;

            if (res.status !== doc.status || res.totalChunks !== doc.totalChunks) {
              hasChanges = true;
              if (res.status === 'ACTIVE' && doc.status !== 'ACTIVE') {
                addToast(`"${doc.filename}" is processed and ready for chat!`, 'success');
              } else if (res.status === 'FAILED' && doc.status !== 'FAILED') {
                addToast(`Processing failed for "${doc.filename}".`, 'error');
              }
              return {
                ...doc,
                status: res.status,
                totalChunks: res.totalChunks,
                updatedAt: res.updatedAt,
              };
            }
            return doc;
          });

          return hasChanges ? nextDocs : prevDocs;
        });
      } catch (pollErr) {
        // Transient poll error
      }

      if (isMounted) {
        timerId = setTimeout(pollProcessingDocs, 2500);
      }
    };

    timerId = setTimeout(pollProcessingDocs, 2500);

    return () => {
      isMounted = false;
      if (timerId) clearTimeout(timerId);
    };
  }, [isAuthenticated, processingDocIdsKey, addToast]);

  // Upload Document (asynchronous flow: HTTP 202 -> status polling)
  const uploadDocument = async (file: File) => {
    // Prevent concurrent duplicate submissions
    if (isUploading) {
      return;
    }

    if (!file) {
      addToast('Please select a PDF file to upload.', 'error');
      return;
    }

    // Validate file type (extension and MIME type)
    const hasPdfExtension = file.name.toLowerCase().endsWith('.pdf');
    const isPdfMime = file.type === 'application/pdf' || file.type === '';
    if (!hasPdfExtension || (!isPdfMime && file.type)) {
      addToast('Unsupported file type. Please upload a valid PDF document (.pdf).', 'error');
      return;
    }

    // Validate file size (10MB limit to align with backend multer limit)
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      addToast('File size exceeds the 10MB limit. Please choose a smaller PDF.', 'error');
      return;
    }

    // Validate non-empty file
    if (file.size === 0) {
      addToast('The selected PDF file is empty. Please choose a valid PDF.', 'error');
      return;
    }

    // Check authentication status
    if (!isAuthenticated) {
      addToast('Your session has expired. Please sign in again to upload documents.', 'error');
      return;
    }

    setIsUploading(true);

    try {
      const res = await uploadDocumentApi(file);

      // Add document to UI immediately with PROCESSING status
      const newDoc: PDFDocument = {
        id: res.documentId,
        filename: file.name,
        size: file.size,
        totalChunks: 0,
        status: 'PROCESSING',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setDocuments((prev) => [newDoc, ...prev.filter((d) => d.id !== res.documentId)]);
      
      // Clear success notification matching requirement 1
      addToast('PDF uploaded successfully! Processing has started.', 'success');

      // Fetch fresh document list from backend in background
      fetchDocuments().catch(() => {});
    } catch (err: any) {
      const friendlyError = formatUploadErrorMessage(err);
      addToast(friendlyError, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // Safe document selection: only ACTIVE documents can be selected for RAG
  const handleSetSelectedDocumentId = useCallback(
    (id: string | undefined) => {
      if (!id) {
        setSelectedDocumentId(undefined);
        return;
      }

      const doc = documents.find((d) => d.id === id);
      if (doc) {
        if (doc.status === 'PROCESSING') {
          addToast(`"${doc.filename}" is still processing. It will be ready for chat once complete.`, 'info');
          return;
        }
        if (doc.status === 'FAILED') {
          addToast(`"${doc.filename}" failed processing and cannot be selected for chat.`, 'error');
          return;
        }
        if (doc.status !== 'ACTIVE') {
          addToast(`"${doc.filename}" is not available for chat.`, 'error');
          return;
        }
      }

      setSelectedDocumentId(id);
    },
    [documents, addToast],
  );

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

    // Verify selected document is ready before sending
    const selectedDoc = documents.find((d) => d.id === selectedDocumentId);
    if (selectedDoc) {
      if (selectedDoc.status === 'PROCESSING') {
        addToast(`"${selectedDoc.filename}" is still processing. Please wait until it is ready.`, 'error');
        return;
      }
      if (selectedDoc.status === 'FAILED') {
        addToast(`"${selectedDoc.filename}" failed processing and cannot be used for chat.`, 'error');
        return;
      }
      if (selectedDoc.status !== 'ACTIVE') {
        addToast(`"${selectedDoc.filename}" is not available for chat.`, 'error');
        return;
      }
    }

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
        setSelectedDocumentId: handleSetSelectedDocumentId,
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
