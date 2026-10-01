import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Sparkles, Cpu } from 'lucide-react';
import { formatBytes } from '../../utils/formatters';

export const PdfUploader: React.FC = () => {
  const { uploadDocument, isUploading, uploadProgress } = useApp();
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadDocument(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadDocument(e.target.files[0]);
      e.target.value = ''; // Reset input
    }
  };

  return (
    <div className="w-full">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="application/pdf"
        className="hidden"
      />

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`relative overflow-hidden rounded-3xl p-8 border-2 border-dashed transition-all duration-300 cursor-pointer text-center ${
          isDragOver
            ? 'border-brand-400 bg-brand-500/10 scale-[1.01] shadow-glow-indigo'
            : isUploading
            ? 'border-brand-500/50 bg-slate-900/60 cursor-wait'
            : 'border-slate-700/80 bg-slate-900/40 hover:border-brand-500/50 hover:bg-slate-900/80'
        }`}
      >
        {/* Background glow overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-brand-600/5 via-transparent to-accent-violet/5 pointer-events-none" />

        {isUploading ? (
          <div className="flex flex-col items-center justify-center py-4 space-y-4 animate-fade-in">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-slate-800" />
              <div
                className="absolute inset-0 rounded-full border-4 border-brand-500 border-t-transparent animate-spin"
              />
              <Cpu className="w-7 h-7 text-brand-400 animate-pulse" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white flex items-center justify-center gap-2">
                Processing PDF Vectors <Sparkles className="w-4 h-4 text-brand-400 animate-bounce" />
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Extracting text → Chunking → Generating Embeddings → Qdrant Indexing
              </p>
            </div>

            {/* Progress Bar */}
            <div className="w-full max-w-xs bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-700">
              <div
                className="bg-gradient-to-r from-brand-500 to-accent-cyan h-full rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-brand-300">{uploadProgress}% Complete</span>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-2 space-y-3">
            <div className="p-4 rounded-2xl bg-gradient-to-tr from-slate-800 to-slate-900 border border-slate-700/80 shadow-lg group-hover:scale-105 transition-transform">
              <UploadCloud className="w-8 h-8 text-brand-400" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white">
                Drag & Drop PDF Document Here
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                or click to browse your local filesystem (Max 25MB)
              </p>
            </div>

            <div className="flex items-center gap-4 pt-2 text-[11px] text-slate-400 font-medium">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/50">
                <FileText className="w-3.5 h-3.5 text-rose-400" /> Standard PDF Files
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/50">
                <Sparkles className="w-3.5 h-3.5 text-accent-cyan" /> Auto-Chunked & Vectorized
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
