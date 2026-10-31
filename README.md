# CogniRAG — Intelligent PDF Retrieval-Augmented Generation Platform

![CogniRAG Banner](https://img.shields.io/badge/AI--RAG-Platform-indigo?style=for-the-badge&logo=openai)
![React](https://img.shields.io/badge/Frontend-React_18_%7C_Vite-61DAFB?style=for-the-badge&logo=react)
![Node.js](https://img.shields.io/badge/Backend-Node.js_%7C_Express-339933?style=for-the-badge&logo=nodedotjs)
![Redis](https://img.shields.io/badge/Queue-BullMQ_%7C_Redis-DC382D?style=for-the-badge&logo=redis)
![Supabase](https://img.shields.io/badge/Storage-Supabase_Storage-3ECF8E?style=for-the-badge&logo=supabase)
![Qdrant](https://img.shields.io/badge/Vector_DB-Qdrant_Cloud-D13A4F?style=for-the-badge)
![Prisma](https://img.shields.io/badge/Database-PostgreSQL_%7C_Prisma-2D3748?style=for-the-badge&logo=prisma)

> **CogniRAG** is an enterprise-grade, full-stack Retrieval-Augmented Generation (RAG) platform that enables users to upload PDF documents, asynchronously parse and vectorize text using **BullMQ + Redis** into **Qdrant Cloud**, and query contextual knowledge via real-time SSE streaming with **Google Gemini**.

---

## 🔗 Live Deployment URLs

- 🌐 **Live Frontend Application (Vercel)**: [https://ai-rag-project-five.vercel.app/](https://ai-rag-project-five.vercel.app/)
- ⚡ **Live Backend API (Render)**: [https://ai-rag-project-backend.onrender.com/](https://ai-rag-project-backend.onrender.com/)

---

## ✨ Key Features

- 🔐 **User Authentication & Scoped Tenancy**: Secure JWT Bearer authentication with `bcrypt` password hashing. All documents, vector embeddings, and conversations are strictly isolated per user account.
- ⚡ **Asynchronous Background PDF Processing**:
  - Decoupled ingest pipeline powered by **BullMQ & Redis**.
  - Immediate `HTTP 202 Accepted` response upon upload — prevents HTTP timeouts on large documents.
  - Automatic document status tracking: `PROCESSING` ➔ `ACTIVE` / `FAILED` / `DELETING`.
  - Automated startup reconciliation that re-enqueues documents stuck in `PROCESSING` after server restarts.
- 📁 **Cloud Storage & Lifecycle Cleanup**:
  - Uploaded PDFs are stored in private **Supabase Storage** buckets (`documents`).
  - Strict atomic cleanup: deleting a document removes the PDF file from Supabase Storage, deletes all vector points from Qdrant, and removes the PostgreSQL record.
- 🛡️ **Gemini Free-Tier Rate-Limit Resilience**:
  - Dynamic exponential backoff and quota exhaustion detection (`RESOURCE_EXHAUSTED` / `HTTP 429`).
  - Worker automatically detects Gemini's exact `retryDelay` window (e.g. 37s), pauses safely, and retries the current chunk without crashing the job or losing previous progress.
  - Paced chunk processing to stay within Gemini's 30,000 token-per-minute Free Tier ceiling.
- 🧠 **Idempotent Vector Ingestion & Batching**:
  - Deterministic RFC 4122 UUID v5 point IDs generated via SHA-256 (`${documentId}:${chunkIndex}`) to guarantee zero duplicate vectors across retries.
  - Vector upserts are batched into 100-chunk slices to prevent Qdrant payload limits and network timeouts.
- 🎯 **Advanced Two-Stage Retrieval & AI Reranking**:
  - First-stage semantic similarity search via **Qdrant Cloud** cosine vector index.
  - Second-stage context reranking via **Google Gemini** (`rerankChunks`) with resilient JSON parsing and fallback.
  - Configurable similarity thresholds and retrieval limits.
- 📡 **Real-Time Streaming Responses**:
  - Streams AI answers token-by-token via Server-Sent Events (SSE).
  - Client-side typewriter rendering with Markdown and code syntax highlighting.
- 📦 **Increased Upload Limit**:
  - Supports documents up to **12MB** with instant client-side validation and dedicated backend Multer error handling.
- 🎨 **Modern Dark Glassmorphic UI**:
  - Built with React 18, TypeScript, Tailwind CSS, and Lucide icons.
  - Real-time polling updates every 3 seconds for active processing jobs.
  - Clean toast notifications for upload states, errors, and system alerts.

---

## 🛠️ Tech Stack

### **Frontend**
- **Framework**: React 18 + Vite (TypeScript)
- **Styling**: Tailwind CSS v3 + Lucide Icons + Glassmorphism Theme
- **State Management**: React Context (`AppContext`, `AuthContext`)
- **Streaming & Markdown**: Server-Sent Events (SSE) + `react-markdown` + `remark-gfm` + `rehype-highlight`
- **Hosting**: Vercel

### **Backend**
- **Runtime & API**: Node.js + Express (TypeScript, ESM)
- **Task Queue & Caching**: BullMQ + Redis (`ioredis`)
- **Relational Database**: PostgreSQL via Prisma ORM (Supabase / Neon)
- **File & Object Storage**: Supabase Storage (`@supabase/supabase-js`)
- **Vector Database**: Qdrant Cloud (`@qdrant/js-client-rest`)
- **AI & Embeddings**: Google Gemini (`@google/genai`) — `gemini-1.5-pro` & `gemini-embedding-001`
- **PDF Extraction**: `pdf-parse`
- **Hosting**: Render

---

## 🏗️ System Architecture

```
                                  ┌───────────────────────────┐
                                  │      React Frontend       │
                                  │  (Vercel Live Deployment) │
                                  └─────────────┬─────────────┘
                                                │
                                    HTTP REST / SSE Stream
                                                │
                                                ▼
                                  ┌───────────────────────────┐
                                  │      Express Backend      │
                                  │  (Render Live Deployment) │
                                  └───┬─────────┬─────────┬───┘
                                      │         │         │
                 ┌────────────────────┘         │         └────────────────────┐
                 ▼                              ▼                              ▼
  ┌──────────────────────────────┐ ┌────────────────────────┐ ┌──────────────────────────────┐
  │      PostgreSQL (Prisma)     │ │    Supabase Storage    │ │       Redis & BullMQ         │
  │  (Users, Metadata, History)  │ │ (Private 'documents')  │ │  (Asynchronous Job Queue)    │
  └──────────────▲───────────────┘ └───────────▲────────────┘ └──────────────┬───────────────┘
                 │                             │                             │
                 │              ┌──────────────┴─────────────────────────────┘
                 │              │
                 │              ▼
                 │ ┌────────────────────────────────────────────────────────┐
                 │ │             BullMQ Worker Process                      │
                 │ │  1. Download PDF from Supabase Storage                 │
                 │ │  2. Extract Text & Chunk (1500 chars, 200 overlap)     │
                 │ │  3. Generate Embeddings (with 429 backoff handling)    │
                 │ │  4. Upsert Batched Chunks (Deterministic UUID v5)      │
                 │ │  5. Transition Status: PROCESSING ➔ ACTIVE             │
                 │ └──────────────┬─────────────────────────┬───────────────┘
                 │                │                         │
                 │                ▼                         ▼
                 │ ┌────────────────────────┐ ┌─────────────────────────────┐
                 │ │   Google Gemini API    │ │     Qdrant Vector Cloud     │
                 │ │ (Embeddings & Chat LLM)│ │   (Indexed Vector Chunks)   │
                 │ └────────────────────────┘ └─────────────────────────────┘
                 │                                          │
                 └──────────────────────────────────────────┘
```

---

## 📡 Backend API Endpoints

### **Authentication Routes (`/api/auth`)**
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `POST` | `/api/auth/register` | Register a new user account | No |
| `POST` | `/api/auth/login` | Authenticate credentials and return JWT token | No |

### **Document Management Routes (`/api/documents`)**
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/documents` | List all documents belonging to the user | Yes |
| `POST` | `/api/documents/upload` | Upload PDF (up to 12MB). Returns `HTTP 202` with `PROCESSING` status | Yes |
| `GET` | `/api/documents/:documentId/status` | Get real-time processing status of a single document | Yes |
| `DELETE` | `/api/documents/:id` | Atomically deletes document record, Supabase PDF file, and Qdrant vectors | Yes |
| `POST` | `/api/documents/search` | Execute semantic vector search across documents | Yes |

#### **Document Status Lifecycle**
- **`PROCESSING`**: Document is queued or actively being parsed, chunked, and embedded by the worker.
- **`ACTIVE`**: Processing succeeded. Vectors are indexed in Qdrant and ready for RAG querying.
- **`FAILED`**: Processing failed after all retry attempts. Chunks are automatically cleaned up.
- **`DELETING`**: Document is scheduled for atomic deletion across database, storage, and vector index.

### **Conversation & Chat Routes (`/api`)**
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/conversations` | Retrieve all chat sessions for the user | Yes |
| `GET` | `/api/conversations/:id` | Retrieve conversation history with all messages | Yes |
| `POST` | `/api/chat` | Query RAG with optional document filter; streams via SSE | Yes |

---

## 🔑 Environment Variables Configuration

### **Backend (`ai-rag-backend/.env`)**
```env
# Server
PORT=4000

# PostgreSQL Database (Prisma)
DATABASE_URL="postgresql://user:password@host:5432/dbname"

# JWT Authentication
JWT_SECRET="your-secret-jwt-key"

# Google Gemini API
GEMINI_API_KEY="your-google-gemini-api-key"

# Qdrant Vector Cloud
QDRANT_URL="https://your-qdrant-cluster.qdrant.tech"
QDRANT_API_KEY="your-qdrant-api-key"

# Redis (BullMQ Background Jobs)
REDIS_URL="redis://127.0.0.1:6379"

# Supabase Storage
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"
SUPABASE_STORAGE_BUCKET="documents"

# Optional: Set to true if running worker in a separate standalone process
# DISABLE_INLINE_WORKER="false"
```

### **Frontend (`ai-rag-frontend/.env`)**
```env
VITE_API_URL="http://localhost:4000/api"
```

---

## 🚀 Local Installation & Setup

### **Prerequisites**
- **Node.js** (v18 or higher)
- **Redis server** running locally or via Docker
- **PostgreSQL database** (local or cloud like Supabase / Neon)
- **Qdrant Cloud** cluster instance
- **Google Gemini API Key**
- **Supabase project** with a private storage bucket named `documents`

---

### **1. Clone the Repository**
```bash
git clone https://github.com/Saksham2k3s/ai-rag-project.git
cd ai-rag-project
```

### **2. Start Redis**
If using Docker:
```bash
docker run -d --name cognirag-redis -p 6379:6379 redis:alpine
```
Or start your local Redis service (`redis-server`).

### **3. Setup & Run Backend**
```bash
cd ai-rag-backend

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your PostgreSQL, Redis, Gemini, Qdrant, and Supabase credentials

# Run database migrations
npx prisma migrate deploy

# Start development server (includes inline background worker by default)
npm run dev
```

> **Worker Execution Options:**
> - In development (`npm run dev`), the BullMQ worker runs inline automatically.
> - To run a dedicated worker process separately:
>   ```bash
>   npm run worker:dev
>   ```
> - In production environments:
>   ```bash
>   npm run build
>   npm run worker:prod   # Dedicated worker process
>   npm start             # Express API server
>   ```

The backend server will run at `http://localhost:4000`.

### **4. Setup & Run Frontend**
```bash
cd ../ai-rag-frontend

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Ensure VITE_API_URL points to your backend: http://localhost:4000/api

# Start Vite development server
npm run dev
```

The frontend application will run at `http://localhost:3000`.

---

## 🧪 Testing the Background Processing Flow

1. **Sign Up / Log In**: Create an account or sign in through the UI.
2. **Upload a PDF (up to 12MB)**:
   - Notice the instant upload confirmation toast: *"PDF uploaded successfully! Processing has started."*
   - In the sidebar, the document immediately shows the **Processing** status with a pulsing spinner.
3. **Worker Processing**:
   - The BullMQ worker downloads the file from Supabase Storage, extracts text, chunks it, and generates embeddings with progress logs.
   - If Gemini Free Tier token limits are hit, the worker pauses gracefully for the exact backoff period and resumes without failing.
4. **Active State**:
   - The frontend automatically polls the document status every 3 seconds. Once ready, the document badge updates to **Ready** with the total chunk count.
5. **Interactive Chat**:
   - Ask questions against the document or entire vault and view real-time streaming answers with citations and reranked context.

---

## 📝 License

This project is open-source and available under the [ISC License](LICENSE).
