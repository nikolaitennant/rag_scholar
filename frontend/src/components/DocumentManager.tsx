import React, { useState } from 'react';
import { Upload, File, Trash2, Info, RotateCcw, BarChart3, FileText, Archive, Plus, X } from 'lucide-react';
import { Document, UserDomain } from '../types';

interface DocumentManagerProps {
  documents: Document[];
  activeCollection: string;
  userDomains: UserDomain[];
  onUpload: (file: File) => Promise<void>;
  onDelete: (documentId: string) => Promise<void>;
  onReindex: () => Promise<void>;
  onAssignToClass: (documentId: string, documentSource: string, classId: string, operation: 'add' | 'remove') => Promise<void>;
  isLoading: boolean;
}

export const DocumentManager: React.FC<DocumentManagerProps> = ({
  documents,
  activeCollection,
  userDomains,
  onUpload,
  onDelete,
  onReindex,
  onAssignToClass,
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

  const getFileIcon = (filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return <FileText className="w-4 h-4 text-red-400" />;
      case 'txt':
      case 'md':
        return <File className="w-4 h-4 text-blue-400" />;
      case 'docx':
      case 'doc':
        return <Archive className="w-4 h-4 text-blue-600" />;
      default:
        return <File className="w-4 h-4 text-gray-400" />;
    }
  };

  const totalSize = documents.reduce((sum, doc) => sum + (doc.size || 0), 0);
  const totalChunks = documents.reduce((sum, doc) => sum + doc.chunks, 0);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="p-4 border-b border-white/20 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
            <Archive className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-white">Document Library</h2>
            <p className="text-sm text-white/70">
              Collection: {activeCollection}
            </p>
          </div>
        </div>
      </div>

      {/* Upload Area */}
      <div className="p-4 border-b border-white/20 flex-shrink-0">
        <div
          className={`border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 backdrop-blur-sm ${
            dragActive
              ? 'border-blue-400 bg-blue-500/20 shadow-lg'
              : 'border-white/30 hover:border-white/50 hover:bg-white/5'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Upload className={`w-10 h-10 mx-auto mb-3 transition-colors ${
            dragActive ? 'text-blue-400' : 'text-white/60'
          }`} />
          <p className="text-sm text-white/80 mb-3">
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
            className={`inline-block bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors cursor-pointer ${
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            Choose File
          </label>
          <p className="text-xs text-white/60 mt-3">
            PDF, TXT, MD, DOCX supported
          </p>
        </div>
      </div>

      {/* Document Stats */}
      <div className="p-4 border-b border-white/20 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-white">{documents.length} documents</span>
          <button
            onClick={() => setShowStats(!showStats)}
            className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <BarChart3 className="w-4 h-4" />
          </button>
        </div>

        {showStats && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 space-y-2 text-sm border border-white/20">
            <div className="flex justify-between text-white/90">
              <span>Total Size:</span>
              <span>{formatFileSize(totalSize)}</span>
            </div>
            <div className="flex justify-between text-white/90">
              <span>Total Chunks:</span>
              <span>{totalChunks}</span>
            </div>
            <div className="flex justify-between text-white/90">
              <span>Avg per Doc:</span>
              <span>{documents.length > 0 ? Math.round(totalChunks / documents.length) : 0}</span>
            </div>
          </div>
        )}
      </div>

      {/* Document List */}
      <div className="flex-1 overflow-y-auto">
        {documents.length === 0 ? (
          <div className="p-8 text-center text-white/60">
            <File className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-base mb-2">No documents</p>
            <p className="text-sm opacity-75">Upload files to get started</p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="bg-white/10 backdrop-blur-sm rounded-xl p-4 hover:bg-white/15 transition-all duration-200 border border-white/10 group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1 min-w-0">
                    {getFileIcon(doc.filename)}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-white truncate">
                        {doc.filename}
                      </div>
                      <div className="text-xs text-white/60 mt-1 flex items-center space-x-2">
                        <span>{doc.chunks} chunks</span>
                        {doc.size && (
                          <>
                            <span>•</span>
                            <span>{formatFileSize(doc.size)}</span>
                          </>
                        )}
                        <span>•</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          (doc.status || 'processed') === 'processed'
                            ? 'bg-green-500/20 text-green-300'
                            : 'bg-yellow-500/20 text-yellow-300'
                        }`}>
                          {doc.status || 'processed'}
                        </span>
                      </div>

                      {/* Class Assignment Section */}
                      <div className="mt-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs text-white/60">Classes:</span>
                          <select
                            onChange={async (e) => {
                              const classId = e.target.value;
                              if (classId && !doc.assigned_classes.includes(classId)) {
                                await onAssignToClass(doc.id, doc.filename, classId, 'add');
                              }
                              e.target.value = ''; // Reset dropdown
                            }}
                            className="text-xs bg-white/10 border border-white/20 rounded px-2 py-1 text-white"
                            disabled={isLoading}
                          >
                            <option value="">{isLoading ? '🔄 Adding...' : '+ Add to class'}</option>
                            {userDomains.map(domain => (
                              <option key={domain.id} value={domain.id} className="bg-gray-800">
                                {domain.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Show assigned classes */}
                        {doc.assigned_classes.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {doc.assigned_classes.map(classId => {
                              const domain = userDomains.find(d => d.id === classId);
                              return (
                                <span
                                  key={classId}
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs"
                                >
                                  {domain?.name || classId}
                                  <button
                                    onClick={async () => {
                                      await onAssignToClass(doc.id, doc.filename, classId, 'remove');
                                    }}
                                    className="hover:text-red-300 transition-colors"
                                    disabled={isLoading}
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => onDelete(doc.id)}
                    className="p-2 text-white/40 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      {documents.length > 0 && (
        <div className="p-4 border-t border-white/20 flex-shrink-0">
          <button
            onClick={onReindex}
            disabled={isLoading}
            className={`w-full bg-white/10 hover:bg-white/20 text-white font-medium py-3 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 backdrop-blur-sm border border-white/20 ${
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <RotateCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Rebuild Index</span>
          </button>
        </div>
      )}
    </div>
  );
};