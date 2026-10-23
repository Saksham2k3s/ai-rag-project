export interface User {
  id: string;
  email: string;
  createdAt?: string;
}

export interface AuthResponse {
  message: string;
  token?: string;
  user: User;
}

export type DocumentStatus = 'PROCESSING' | 'ACTIVE' | 'FAILED' | 'DELETING';

export interface PDFDocument {
  id: string;
  filename: string;
  size: number;
  totalChunks: number;
  status: DocumentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface UploadResponse {
  message: string;
  documentId: string;
  status: DocumentStatus;
  jobId?: string;
}

export interface DocumentStatusResponse {
  documentId: string;
  filename: string;
  status: DocumentStatus;
  totalChunks: number;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
}

export interface Conversation {
  id: string;
  title?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
}

export interface SearchSourcePayload {
  chunkText?: string;
  text?: string;
  score?: number;
  documentId?: string;
}

export interface SearchResponse {
  query: string;
  answer: string;
  sources: SearchSourcePayload[];
}
