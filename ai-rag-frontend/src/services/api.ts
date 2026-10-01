import { AuthResponse, PDFDocument, UploadResponse, Conversation, SearchResponse } from '../types';

const API_BASE = (import.meta.env.VITE_API_URL as string)?.replace(/\/$/, '') || '/api';

/**
 * Helper to retrieve stored auth token
 */
export function getAuthToken(): string | null {
  return localStorage.getItem('token');
}

/**
 * Build standard headers with optional authorization token
 */
function getHeaders(isJson = true): HeadersInit {
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (isJson) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Authentication APIs
 */
export async function registerApi(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Registration failed');
  }
  return data;
}

export async function loginApi(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Login failed');
  }
  return data;
}

/**
 * Document Management APIs
 */
export async function getDocumentsApi(): Promise<PDFDocument[]> {
  const res = await fetch(`${API_BASE}/documents`, {
    headers: getHeaders(true),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to fetch documents');
  }
  return data.documents || [];
}

export async function uploadDocumentApi(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const token = getAuthToken();
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}/documents/upload`, {
    method: 'POST',
    headers,
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to upload document');
  }
  return data;
}

export async function deleteDocumentApi(documentId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/documents/${documentId}`, {
    method: 'DELETE',
    headers: getHeaders(true),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to delete document');
  }
}

export async function searchDocumentsApi(query: string, documentId?: string): Promise<SearchResponse> {
  const res = await fetch(`${API_BASE}/documents/search`, {
    method: 'POST',
    headers: getHeaders(true),
    body: JSON.stringify({ query, documentId }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Search failed');
  }
  return data;
}

/**
 * Conversation APIs
 */
export async function getConversationsApi(): Promise<Conversation[]> {
  const res = await fetch(`${API_BASE}/conversations`, {
    headers: getHeaders(true),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to fetch conversations');
  }
  return data.conversations || [];
}

export async function getConversationByIdApi(id: string): Promise<Conversation> {
  const res = await fetch(`${API_BASE}/conversations/${id}`, {
    headers: getHeaders(true),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to fetch conversation detail');
  }
  return data.conversation;
}

/**
 * SSE Streamed Chat API Handler
 */
export async function streamChatApi(
  message: string,
  documentId: string | undefined,
  conversationId: string | undefined,
  onChunk: (text: string) => void,
  onDone: (data: { conversationId: string }) => void,
  onError: (errorMsg: string) => void
): Promise<void> {
  const token = getAuthToken();
  if (!token) {
    onError('Authentication required');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        documentId: documentId || undefined,
        conversationId: conversationId || undefined,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({ message: 'Chat request failed' }));
      onError(errData.message || `Error ${res.status}`);
      return;
    }

    if (!res.body) {
      onError('No stream body returned by server');
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || ''; // keep trailing incomplete chunk in buffer

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          const jsonStr = trimmed.replace(/^data:\s*/, '');
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.error) {
              onError(parsed.error);
              return;
            }
            if (parsed.text) {
              onChunk(parsed.text);
            }
            if (parsed.done && parsed.conversationId) {
              onDone({ conversationId: parsed.conversationId });
            }
          } catch (e) {
            console.warn('Could not parse SSE JSON line:', line);
          }
        }
      }
    }

    // Flush any remaining buffer text
    if (buffer.trim().startsWith('data: ')) {
      const jsonStr = buffer.trim().replace(/^data:\s*/, '');
      try {
        const parsed = JSON.parse(jsonStr);
        if (parsed.text) onChunk(parsed.text);
        if (parsed.done && parsed.conversationId) onDone({ conversationId: parsed.conversationId });
      } catch (e) {
        // ignore
      }
    }
  } catch (err: any) {
    onError(err.message || 'Stream connection failed');
  }
}
