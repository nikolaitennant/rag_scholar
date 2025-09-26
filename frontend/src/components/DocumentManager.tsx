import React, { useState, useEffect, useRef } from 'react';
import { Upload, File, Trash2, Info, RotateCcw, BarChart3, FileText, Archive, Plus, X, ChevronRight } from 'lucide-react';
import { Document, UserClass } from '../types';

interface DocumentManagerProps {
  documents: Document[];
  activeCollection: string;
  userClasses: UserClass[];
  onUpload: (file: File) => Promise<void>;
  onDelete: (documentId: string) => Promise<void>;
  onReindex: () => Promise<void>;
  onAssignToClass: (documentId: string, documentSource: string, classId: string, operation: 'add' | 'remove') => Promise<void>;
  isLoading: boolean;
}

export const DocumentManager: React.FC<DocumentManagerProps> = ({
  documents,
  activeCollection,
  userClasses,
  onUpload,
  onDelete,
  onReindex,
  onAssignToClass,
  isLoading,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({});
  const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const openIds = Object.keys(openDropdowns).filter(id => openDropdowns[id]);
      for (const id of openIds) {
        const ref = dropdownRefs.current[id];
        if (ref && !ref.contains(event.target as Node)) {
          setOpenDropdowns(prev => ({ ...prev, [id]: false }));
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdowns]);

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
          <div className="p-3 space-y-1.5">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="bg-white/10 backdrop-blur-sm rounded-lg p-2 hover:bg-white/15 transition-all duration-200 border border-white/10 group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-2 flex-1 min-w-0">
                    {getFileIcon(doc.filename)}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-white truncate">
                        {doc.filename}
                      </div>

                      {/* Class Assignment Section */}
                      <div className="mt-1.5">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-white/60">Classes:</span>
                          <div
                            className="relative"
                            ref={(el) => {
                              dropdownRefs.current[doc.id] = el;
                            }}
                          >
                            <button
                              onClick={() => {
                                setOpenDropdowns(prev => ({
                                  ...prev,
                                  [doc.id]: !prev[doc.id]
                                }));
                              }}
                              className="text-xs bg-white/10 border border-white/20 hover:bg-white/15 rounded-lg px-2 py-1 text-white transition-all duration-200 cursor-pointer focus:outline-none backdrop-blur-sm flex items-center justify-between gap-1"
                              disabled={isLoading}
                            >
                              <span>{isLoading ? 'Adding...' : '+ Add'}</span>
                              <ChevronRight className={`w-3 h-3 transform transition-transform duration-200 ${
                                openDropdowns[doc.id] ? 'rotate-90' : 'rotate-0'
                              } text-white/60`} />
                            </button>

                            {openDropdowns[doc.id] && (
                              <div className="absolute top-full left-0 mt-2 w-48 border rounded-2xl shadow-2xl backdrop-blur-2xl z-50 overflow-hidden bg-white/[0.08] border-white/30 before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/20 before:via-white/10 before:to-transparent before:rounded-2xl before:pointer-events-none" style={{
                                backdropFilter: 'blur(20px) saturate(180%)',
                                WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                                background: 'rgba(255, 255, 255, 0.08)',
                                border: '1px solid rgba(255, 255, 255, 0.25)',
                                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                              }}>
                                <div className="py-1 max-h-48 overflow-y-auto relative z-10">
                                  {userClasses.map(userClass => (
                                    <button
                                      key={userClass.id}
                                      onClick={async () => {
                                        if (!doc.assigned_classes.includes(userClass.id)) {
                                          await onAssignToClass(doc.id, doc.filename, userClass.id, 'add');
                                        }
                                        setOpenDropdowns(prev => ({
                                          ...prev,
                                          [doc.id]: false
                                        }));
                                      }}
                                      className={`w-full px-4 py-2.5 text-sm text-left transition-all duration-200 flex items-center space-x-3 ${
                                        doc.assigned_classes.includes(userClass.id)
                                          ? 'bg-blue-500/30 backdrop-blur-sm text-white border-l-2 border-blue-400/50'
                                          : 'text-white/90 hover:bg-white/10 hover:backdrop-blur-sm'
                                      }`}
                                      disabled={doc.assigned_classes.includes(userClass.id)}
                                    >
                                      <div className={`w-2 h-2 rounded-full ${
                                        doc.assigned_classes.includes(userClass.id) ? 'bg-white' : 'bg-transparent'
                                      }`} />
                                      <span className="font-medium">{userClass.name}</span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Show assigned classes */}
                        {doc.assigned_classes.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {doc.assigned_classes.map(classId => {
                              const userClass = userClasses.find(d => d.id === classId);
                              return (
                                <span
                                  key={classId}
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs select-none"
                                >
                                  {userClass?.name || classId}
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
                    className="text-white/40 hover:text-red-400 transition-all duration-200 opacity-0 group-hover:opacity-100"
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