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

export interface PDFDocument {
  id: string;
  filename: string;
  size: number;
  totalChunks: number;
  status: 'ACTIVE' | 'DELETING';
  createdAt: string;
  updatedAt: string;
}

export interface UploadResponse {
  message: string;
  totalCharacters: number;
  totalChunks: number;
  documentId: string;
  chunks: string[];
  embeddingDimension: number;
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
