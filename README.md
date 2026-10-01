# CogniRAG — Intelligent PDF Retrieval-Augmented Generation Platform

![CogniRAG Banner](https://img.shields.io/badge/AI--RAG-Platform-indigo?style=for-the-badge&logo=openai)
![React](https://img.shields.io/badge/Frontend-React_18_%7C_Vite-61DAFB?style=for-the-badge&logo=react)
![Node.js](https://img.shields.io/badge/Backend-Node.js_%7C_Express-339933?style=for-the-badge&logo=nodedotjs)
![Qdrant](https://img.shields.io/badge/Vector_DB-Qdrant-D13A4F?style=for-the-badge)
![Prisma](https://img.shields.io/badge/Database-PostgreSQL_%7C_Prisma-2D3748?style=for-the-badge&logo=prisma)

> **CogniRAG** is an end-to-end, full-stack Retrieval-Augmented Generation (RAG) platform that enables users to upload PDF documents, vectorize text into a Qdrant Cloud vector database, and ask contextual AI questions with real-time SSE streaming powered by Google Gemini.

---

## 🔗 Live Deployment URLs

- 🌐 **Live Frontend Application (Vercel)**: [https://ai-rag-project-five.vercel.app/](https://ai-rag-project-five.vercel.app/)
- ⚡ **Live Backend API (Render)**: [https://ai-rag-project-backend.onrender.com/](https://ai-rag-project-backend.onrender.com/)

---

## ✨ Key Features

- 🔐 **User Authentication**: Secure JWT Bearer token authentication with password hashing via `bcrypt`.
- 📄 **Automated PDF Processing & Vectorization**:
  - Extracts text from uploaded PDF files (`pdf-parse`).
  - Chunks document text into optimal token segments.
  - Generates high-dimensional vector embeddings via Google Gemini.
  - Indexes vectors into **Qdrant Vector Cloud** for similarity search.
- 🎯 **Targeted RAG Scope Filtering**: Ask questions targeted specifically at an individual PDF or across the user's entire uploaded PDF vault.
- ⚡ **Real-Time Streaming AI Responses**: Streams AI answers word-by-word via Server-Sent Events (SSE) with a typewriter cursor effect.
- 🎨 **Modern Dark Glassmorphic UI**: Built with React 18, TypeScript, Tailwind CSS, Framer Motion, and Lucide icons.
- 💬 **Conversation History**: Auto-saves user chats and allows resuming previous sessions.

---

## 🛠️ Tech Stack

### **Frontend**
- **Framework**: React 18 + Vite (TypeScript)
- **Styling**: Tailwind CSS v3 + Lucide Icons + Custom Glassmorphism Theme
- **Markdown & Code Rendering**: `react-markdown` + `remark-gfm`
- **Hosting**: Vercel

### **Backend**
- **Runtime**: Node.js + Express (TypeScript)
- **ORM & Relational DB**: Prisma ORM + PostgreSQL (Supabase / Neon)
- **Vector Database**: Qdrant Vector Cloud (`@qdrant/js-client-rest`)
- **AI Model**: Google Gemini 1.5 Pro (`@google/genai`)
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
                                  └──────┬────────────┬───────┘
                                         │            │
                  ┌──────────────────────┘            └──────────────────────┐
                  ▼                                                          ▼
   ┌──────────────────────────────┐                          ┌──────────────────────────────┐
   │    PostgreSQL Database       │                          │     Qdrant Vector Cloud      │
   │  (Users & Conversations)     │                          │   (Document Text Vectors)    │
   └──────────────────────────────┘                          └──────────────────────────────┘
                                                 │
                                                 ▼
                                     ┌───────────────────────┐
                                     │   Google Gemini API   │
                                     └───────────────────────┘
```

---

## 📡 Backend API Endpoints

### **Authentication Routes (`/api/auth`)**
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register a new user account |
| `POST` | `/api/auth/login` | Authenticate credentials and return JWT token |

### **Document Management Routes (`/api/documents`)**
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/documents` | Retrieve all PDF documents owned by the user |
| `POST` | `/api/documents/upload` | Upload PDF file, extract text, and index vectors |
| `DELETE` | `/api/documents/:id` | Delete PDF metadata and Qdrant vector chunks |
| `POST` | `/api/documents/search` | Execute semantic RAG search across documents |

### **Conversation & Chat Routes (`/api`)**
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/conversations` | Retrieve user chat session history |
| `GET` | `/api/conversations/:id` | Retrieve full message list for a specific chat |
| `POST` | `/api/chat` | Stream RAG answer (SSE `text/event-stream`) |

---

## 🔑 Environment Variables Configuration

### **Backend (`ai-rag-backend/.env`)**
```env
PORT=4000
DATABASE_URL="postgresql://user:password@host:5432/dbname"
GEMINI_API_KEY="your-google-gemini-api-key"
JWT_SECRET="your-secret-jwt-key"
QDRANT_URL="https://your-qdrant-cluster.qdrant.tech"
QDRANT_API_KEY="your-qdrant-api-key"
```

### **Frontend (`ai-rag-frontend/.env`)**
```env
VITE_API_URL="https://ai-rag-project-backend.onrender.com/api"
```

---

## 🚀 Local Installation & Setup

### **Prerequisites**
- Node.js (v18 or higher)
- PostgreSQL database
- Qdrant Cloud cluster account
- Google Gemini API Key

### **1. Clone the Repository**
```bash
git clone https://github.com/Saksham2k3s/ai-rag-project.git
cd ai-rag-project
```

### **2. Setup & Run Backend**
```bash
cd ai-rag-backend

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Fill in DATABASE_URL, GEMINI_API_KEY, JWT_SECRET, QDRANT_URL, QDRANT_API_KEY

# Run database migrations
npx prisma migrate deploy

# Start development server
npm run dev
```
Backend server will run at `http://localhost:4000`.

### **3. Setup & Run Frontend**
```bash
cd ../ai-rag-frontend

# Install dependencies
npm install

# Setup environment variables (optional for local proxy)
cp .env.example .env

# Start development server
npm run dev
```
Frontend development app will run at `http://localhost:3000`.

---

## 📝 License

This project is open-source and available under the [ISC License](LICENSE).
