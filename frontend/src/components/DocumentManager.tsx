import React, { useState } from 'react';
import { Upload, File, Trash2, Info, RotateCcw, BarChart3 } from 'lucide-react';
import { Document } from '../types';

interface DocumentManagerProps {
  documents: Document[];
  activeCollection: string;
  onUpload: (file: File) => Promise<void>;
  onDelete: (documentId: string) => Promise<void>;
  onReindex: () => Promise<void>;
  isLoading: boolean;
}

export const DocumentManager: React.FC<DocumentManagerProps> = ({
  documents,
  activeCollection,
  onUpload,
  onDelete,
  onReindex,
  isLoading,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [showStats, setShowStats] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUpload(e.target.files[0]);
    }
  };

  const formatFileSize = (bytes: number) => {
    return `${Math.round(bytes / 1024)}KB`;
  };

  const totalSize = documents.reduce((sum, doc) => sum + doc.size, 0);
  const totalChunks = documents.reduce((sum, doc) => sum + doc.chunks, 0);

  return (
    <div className="bg-white border-r border-gray-200 w-80 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="font-semibold text-gray-900">Document Library</h2>
        <p className="text-sm text-gray-600 mt-1">
          Collection: {activeCollection}
        </p>
      </div>

      {/* Upload Area */}
      <div className="p-4 border-b">
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragActive
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-300 hover:border-primary-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600 mb-2">
            Drop files here or click to upload
          </p>
          <input
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
            accept=".pdf,.txt,.md,.docx"
            disabled={isLoading}
          />
          <label
            htmlFor="file-upload"
            className="btn-primary text-xs cursor-pointer disabled:cursor-not-allowed"
          >
            Choose File
          </label>
          <p className="text-xs text-gray-500 mt-2">
            PDF, TXT, MD, DOCX supported
          </p>
        </div>
        {activeCollection && (
          <p className="text-xs text-gray-600 mt-2">
            Will upload to: <strong>{activeCollection}</strong>
          </p>
        )}
      </div>

      {/* Document List */}
      <div className="flex-1 overflow-y-auto">
        {documents.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <File className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No documents</p>
            <p className="text-xs">Upload files to get started</p>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            <div className="flex items-center justify-between px-2 text-xs text-gray-600">
              <span>{documents.length} documents</span>
              <button
                onClick={() => setShowStats(!showStats)}
                className="hover:text-gray-900"
              >
                <BarChart3 className="w-4 h-4" />
              </button>
            </div>

            {showStats && (
              <div className="bg-gray-50 rounded p-3 text-xs space-y-1">
                <div>Total Size: {formatFileSize(totalSize)}</div>
                <div>Total Chunks: {totalChunks}</div>
                <div>Avg per Doc: {Math.round(totalChunks / documents.length)}</div>
              </div>
            )}

            {documents.map((doc) => (
              <div
                key={doc.id}
                className="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-900 truncate">
                      {doc.filename}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {doc.chunks} chunks • {formatFileSize(doc.size)} • {doc.status}
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 ml-2">
                    <button
                      onClick={() => onDelete(doc.id)}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      {documents.length > 0 && (
        <div className="p-4 border-t">
          <div className="flex space-x-2">
            <button
              onClick={onReindex}
              disabled={isLoading}
              className="btn-secondary flex-1 flex items-center justify-center space-x-2 text-sm disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reindex</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};