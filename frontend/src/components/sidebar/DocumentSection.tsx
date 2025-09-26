import React, { useState, useRef } from 'react';
import { Upload, File, Trash2, RotateCcw, ChevronRight, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { Document, UserClass } from '../../types';

interface DocumentSectionProps {
  documents: Document[];
  classes: UserClass[];
  isLoading: boolean;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  onReindex: () => Promise<void>;
  onAssignToClass: (documentId: string, documentSource: string, classId: string, operation: 'add' | 'remove') => Promise<void>;
  onDeleteDocument: (documentId: string) => Promise<void>;
}

export const DocumentSection: React.FC<DocumentSectionProps> = ({
  documents,
  classes,
  isLoading,
  onFileUpload,
  onReindex,
  onAssignToClass,
  onDeleteDocument,
}) => {
  const { theme } = useTheme();

  // Filter state
  const [documentClassFilter, setDocumentClassFilter] = useState('');
  const [classFilterOpen, setClassFilterOpen] = useState(false);

  // Dropdown state
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  // Add to class state
  const [addToClassOpen, setAddToClassOpen] = useState<string | null>(null);
  const [addToClassPosition, setAddToClassPosition] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  // Document deletion state
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  // Refs for positioning
  const buttonRef = useRef<HTMLButtonElement>(null);
  const addToClassRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="p-3 space-y-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className={`text-sm font-semibold ${
          theme === 'dark' ? 'text-white' : 'text-black'
        }`}>Documents</h3>
        <div className="flex items-center space-x-2">
          <label htmlFor="file-upload" className={`p-1 rounded-lg transition-colors cursor-pointer ${
            theme === 'dark' ? 'text-white/60 hover:text-white hover:bg-white/10' : 'text-black/60 hover:text-black hover:bg-black/10'
          }`} title="Upload Document">
            <Upload className="w-3 h-3" />
            <input
              id="file-upload"
              type="file"
              accept=".pdf,.txt,.md,.docx"
              onChange={onFileUpload}
              className="hidden"
            />
          </label>
          <button
            onClick={onReindex}
            className={`p-1 rounded-lg transition-colors ${
              theme === 'dark' ? 'text-white/60 hover:text-white hover:bg-white/10' : 'text-black/60 hover:text-black hover:bg-black/10'
            }`}
            title="Reindex Collection"
            disabled={isLoading}
          >
            <RotateCcw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Class Filter */}
      <div className="mb-3 relative">
        <label className={`block text-sm font-medium mb-2 ${
          theme === 'dark' ? 'text-white/80' : 'text-black/80'
        }`}>
          Filter by Class
        </label>
        <div className="relative">
          <button
            ref={buttonRef}
            onClick={() => {
              if (!classFilterOpen && buttonRef.current) {
                const rect = buttonRef.current.getBoundingClientRect();
                setDropdownPosition({
                  top: rect.bottom + window.scrollY,
                  left: rect.left + window.scrollX,
                  width: rect.width
                });
              }
              setClassFilterOpen(!classFilterOpen);
            }}
            className={`w-full px-3 py-1.5 text-sm text-left flex items-center justify-between transition-all rounded-full ${
              theme === 'dark'
                ? 'bg-white/10 text-white/90 hover:bg-white/15'
                : 'bg-black/10 text-gray-900 hover:bg-white/25 border border-gray-300/50'
            }`}
          >
            <span className="truncate">{documentClassFilter ? classes.find(d => d.id === documentClassFilter)?.name : 'All Documents'}</span>
            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${
              classFilterOpen ? 'rotate-90' : 'rotate-0'
            } ${
              theme === 'dark' ? 'text-white/50' : 'text-gray-400'
            }`} />
          </button>

          {classFilterOpen && dropdownPosition && createPortal(
            <>
              <div
                className="fixed inset-0 z-[9998]"
                onClick={() => setClassFilterOpen(false)}
              />
              <div className={`dropdown-container fixed rounded-2xl shadow-2xl z-[9999] overflow-hidden backdrop-blur-2xl ${
              theme === 'dark'
                ? 'bg-black/30 border-white/20'
                : 'bg-white/10 border-black/20'
            }`} style={{
              top: dropdownPosition.top + 2,
              left: dropdownPosition.left,
              width: dropdownPosition.width,
              backdropFilter: 'blur(20px) saturate(120%) brightness(0.9)',
              WebkitBackdropFilter: 'blur(20px) saturate(120%) brightness(0.9)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
            }}>
              <div className="relative z-10">
                <button
                  onClick={() => {
                    setDocumentClassFilter('');
                    setClassFilterOpen(false);
                  }}
                  className={`w-full px-2.5 py-1 text-sm text-left transition-colors ${
                    theme === 'dark'
                      ? 'text-white/90 hover:bg-black/20'
                      : 'text-gray-900/90 hover:bg-white/20'
                  }`}
                >
                  All Documents
                </button>
                {classes.map((userClass) => (
                  <button
                    key={userClass.id}
                    onClick={() => {
                      setDocumentClassFilter(userClass.id);
                      setClassFilterOpen(false);
                    }}
                    className={`w-full px-2.5 py-1 text-sm text-left transition-colors ${
                      theme === 'dark'
                        ? 'text-white/90 hover:bg-black/20'
                        : 'text-gray-900/90 hover:bg-white/20'
                    }`}
                  >
                    {userClass.name}
                  </button>
                ))}
              </div>
            </div>
            </>,
            document.body
          )}
        </div>
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-8">
          <File className={`w-12 h-12 mx-auto mb-3 ${
            theme === 'dark' ? 'text-white/30' : 'text-black/30'
          }`} />
          <p className={`text-sm mb-3 ${
            theme === 'dark' ? 'text-white/60' : 'text-black/60'
          }`}>No documents uploaded</p>
          <label htmlFor="file-upload-empty" className={`text-xs py-1 px-3 rounded-lg transition-colors cursor-pointer ${
            theme === 'dark'
              ? 'bg-white/10 hover:bg-white/20 text-white'
              : 'bg-black/10 hover:bg-black/20 text-black'
          }`}>
            Upload Your First Document
            <input
              id="file-upload-empty"
              type="file"
              accept=".pdf,.txt,.md,.docx"
              onChange={onFileUpload}
              className="hidden"
            />
          </label>
        </div>
      ) : (
        <div className="space-y-2 max-h-[70vh] overflow-y-auto scrollbar-none pb-20">
          {documents
            .filter(doc => {
              if (!documentClassFilter) return true; // Show all if no filter
              // Find the domain/class that contains this document
              const containingClass = classes.find(userClass =>
                userClass.documents?.includes(doc.id)
              );
              return containingClass?.id === documentClassFilter;
            })
            .map(doc => (
            <div key={doc.id} className={`rounded-lg p-2 transition-colors group ${
              theme === 'dark' ? 'bg-white/5 hover:bg-white/10' : 'bg-black/5 hover:bg-black/10'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <File className={`w-3 h-3 flex-shrink-0 ${
                      theme === 'dark' ? 'text-white/60' : 'text-black/60'
                    }`} />
                    <span className={`text-xs truncate ${
                      theme === 'dark' ? 'text-white' : 'text-black'
                    }`}>{doc.filename}</span>
                  </div>
                  <div className={`text-xs mt-1 ${
                    theme === 'dark' ? 'text-white/50' : 'text-black/50'
                  }`}>
                    {doc.size ? formatFileSize(doc.size) : ''}
                  </div>

                  {/* Class Assignment Section */}
                  <div className="mt-2">
                    <div className="mb-1 relative">
                      <button
                        ref={(el) => {
                          addToClassRefs.current[doc.id] = el;
                        }}
                        onClick={() => {
                          if (addToClassOpen !== doc.id && addToClassRefs.current[doc.id]) {
                            const rect = addToClassRefs.current[doc.id]!.getBoundingClientRect();
                            setAddToClassPosition({
                              top: rect.bottom + window.scrollY,
                              left: rect.left + window.scrollX,
                              width: Math.max(rect.width, 120)
                            });
                          }
                          setAddToClassOpen(addToClassOpen === doc.id ? null : doc.id);
                        }}
                        className={`text-xs px-2 py-1 rounded-full transition-colors ${
                          theme === 'dark'
                            ? 'text-white/70 hover:text-white hover:bg-white/10'
                            : 'text-gray-600 hover:text-gray-800 hover:bg-white/20'
                        }`}
                        disabled={isLoading}
                      >
                        {isLoading ? 'Adding...' : '+ Add to class'}
                      </button>

                      {addToClassOpen === doc.id && addToClassPosition && createPortal(
                        <>
                          <div
                            className="fixed inset-0 z-[9998]"
                            onClick={() => setAddToClassOpen(null)}
                          />
                          <div className={`dropdown-container fixed rounded-2xl shadow-2xl z-[9999] overflow-hidden backdrop-blur-2xl ${
                          theme === 'dark'
                            ? 'bg-black/10 border-white/20'
                            : 'bg-white/10 border-black/20'
                        }`} style={{
                          top: addToClassPosition.top + 2,
                          left: addToClassPosition.left,
                          minWidth: addToClassPosition.width,
                          backdropFilter: 'blur(20px) saturate(120%) brightness(0.9)',
                          WebkitBackdropFilter: 'blur(20px) saturate(120%) brightness(0.9)',
                          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                        }}>
                          <div className="">
                            {classes.map(userClass => (
                              <button
                                key={userClass.id}
                                onClick={async () => {
                                  if (!doc.assigned_classes?.includes(userClass.id)) {
                                    await onAssignToClass(doc.id, doc.filename, userClass.id, 'add');
                                  }
                                  setAddToClassOpen(null);
                                }}
                                className={`w-full px-2.5 py-1 text-xs text-left transition-colors whitespace-nowrap block ${
                                  doc.assigned_classes?.includes(userClass.id)
                                    ? theme === 'dark'
                                      ? 'text-white/40 cursor-not-allowed'
                                      : 'text-gray-500 cursor-not-allowed'
                                    : theme === 'dark'
                                      ? 'text-white/90 hover:bg-black/20'
                                      : 'text-gray-900/90 hover:bg-white/20'
                                }`}
                                disabled={doc.assigned_classes?.includes(userClass.id)}
                              >
                                {userClass.name}
                              </button>
                            ))}
                          </div>
                        </div>
                        </>,
                        document.body
                      )}
                    </div>

                    {/* Show assigned classes */}
                    {doc.assigned_classes && doc.assigned_classes.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {doc.assigned_classes.map(classId => {
                          const userClass = classes.find(c => c.id === classId);
                          return (
                            <span
                              key={classId}
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs select-none ${
                                theme === 'dark'
                                  ? 'bg-violet-500/20 text-white'
                                  : 'bg-violet-500/20 text-black'
                              }`}
                            >
                              {userClass?.name || classId}
                              <button
                                onClick={async () => {
                                  await onAssignToClass(doc.id, doc.filename, classId, 'remove');
                                }}
                                className={`hover:text-red-300 transition-colors ${
                                  theme === 'dark' ? 'text-white' : 'text-black'
                                }`}
                                disabled={isLoading}
                              >
                                <X className="w-2 h-2" />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={async (e) => {
                    e.preventDefault();
                    setDeletingDocId(doc.id);
                    try {
                      await onDeleteDocument(doc.id);
                    } catch (error) {
                      console.error('Failed to delete document:', error);
                      alert('Failed to delete document. Please try again.');
                    } finally {
                      setDeletingDocId(null);
                    }
                  }}
                  disabled={deletingDocId === doc.id}
                  className={`transition-colors opacity-0 group-hover:opacity-100 ${
                    deletingDocId === doc.id
                      ? 'text-red-400 cursor-not-allowed animate-pulse'
                      : theme === 'dark'
                      ? 'text-white/40 hover:text-red-400'
                      : 'text-black/40 hover:text-red-400'
                  }`}
                  title={deletingDocId === doc.id ? 'Deleting...' : 'Delete Document'}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};